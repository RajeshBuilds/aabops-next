import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";
import { buildApks, cleanupBuildDir } from "./bundletool";
import { TEMP_DIR } from "./config";
import type { DeviceSpec } from "./types";

const APKS_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const APKS_CACHE_ROOT = path.join(TEMP_DIR, "apks-cache");

const inFlightBuilds = new Map<string, Promise<string>>();

interface CachedApksMeta {
  createdAt: string;
  updatedAt: string;
  bundleId: string;
  specHash: string;
}

function canonicalizeSpec(spec: DeviceSpec): DeviceSpec {
  return {
    supportedAbis: [...spec.supportedAbis].sort(),
    supportedLocales: [...spec.supportedLocales].sort(),
    screenDensity: spec.screenDensity,
    sdkVersion: spec.sdkVersion,
  };
}

function getSpecHash(spec: DeviceSpec): string {
  const canonical = canonicalizeSpec(spec);
  const raw = JSON.stringify(canonical);
  return createHash("sha256").update(raw).digest("hex").slice(0, 24);
}

function getBundleCacheDir(bundleId: string) {
  return path.join(APKS_CACHE_ROOT, bundleId);
}

function getApksPath(bundleId: string, specHash: string) {
  return path.join(getBundleCacheDir(bundleId), `${specHash}.apks`);
}

function getMetaPath(bundleId: string, specHash: string) {
  return path.join(getBundleCacheDir(bundleId), `${specHash}.json`);
}

async function readMeta(bundleId: string, specHash: string): Promise<CachedApksMeta | null> {
  try {
    const raw = await fs.readFile(getMetaPath(bundleId, specHash), "utf-8");
    return JSON.parse(raw) as CachedApksMeta;
  } catch {
    return null;
  }
}

async function writeMeta(meta: CachedApksMeta) {
  await fs.writeFile(
    getMetaPath(meta.bundleId, meta.specHash),
    JSON.stringify(meta, null, 2),
    "utf-8",
  );
}

async function statIfExists(filePath: string) {
  try {
    return await fs.stat(filePath);
  } catch {
    return null;
  }
}

async function cleanupExpiredCache(bundleId: string) {
  const dir = getBundleCacheDir(bundleId);
  const entries = await fs.readdir(dir).catch(() => []);
  const now = Date.now();

  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    const specHash = entry.replace(/\.json$/, "");
    const meta = await readMeta(bundleId, specHash);
    if (!meta) continue;
    const updatedAt = new Date(meta.updatedAt).getTime();
    if (!Number.isFinite(updatedAt)) continue;
    if (now - updatedAt <= APKS_CACHE_TTL_MS) continue;

    await fs.rm(getApksPath(bundleId, specHash), { force: true });
    await fs.rm(getMetaPath(bundleId, specHash), { force: true });
  }
}

export async function getOrBuildCachedApks(
  bundleId: string,
  aabPath: string,
  deviceSpec: DeviceSpec,
): Promise<{ apksPath: string; cacheHit: boolean; specHash: string }> {
  await fs.mkdir(getBundleCacheDir(bundleId), { recursive: true });
  await cleanupExpiredCache(bundleId);

  const specHash = getSpecHash(deviceSpec);
  const cacheKey = `${bundleId}:${specHash}`;
  const apksPath = getApksPath(bundleId, specHash);
  const nowIso = new Date().toISOString();

  const existing = await statIfExists(apksPath);
  if (existing && existing.size > 0) {
    const previousMeta = await readMeta(bundleId, specHash);
    const meta: CachedApksMeta = {
      createdAt: previousMeta?.createdAt || nowIso,
      updatedAt: nowIso,
      bundleId,
      specHash,
    };
    await writeMeta(meta);
    return { apksPath, cacheHit: true, specHash };
  }

  const inFlight = inFlightBuilds.get(cacheKey);
  if (inFlight) {
    const pathFromBuild = await inFlight;
    return { apksPath: pathFromBuild, cacheHit: true, specHash };
  }

  const buildPromise = (async () => {
    const tempOutputPath = await buildApks(aabPath, deviceSpec);
    try {
      await fs.copyFile(tempOutputPath, apksPath);
      const meta: CachedApksMeta = {
        createdAt: nowIso,
        updatedAt: nowIso,
        bundleId,
        specHash,
      };
      await writeMeta(meta);
      return apksPath;
    } finally {
      await cleanupBuildDir(tempOutputPath);
    }
  })();

  inFlightBuilds.set(cacheKey, buildPromise);
  try {
    const builtPath = await buildPromise;
    return { apksPath: builtPath, cacheHit: false, specHash };
  } finally {
    inFlightBuilds.delete(cacheKey);
  }
}
