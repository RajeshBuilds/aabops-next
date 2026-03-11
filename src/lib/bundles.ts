import fs from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import { Readable } from "stream";
import { v4 as uuidv4 } from "uuid";
import { STORAGE_DIR } from "./config";
import { extractAabInfo } from "./bundletool";
import type { BundleMetadata } from "./types";

async function ensureStorageDir() {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
}

export async function listBundles(): Promise<BundleMetadata[]> {
  await ensureStorageDir();
  const entries = await fs.readdir(STORAGE_DIR, { withFileTypes: true });
  const bundles: BundleMetadata[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const metadataPath = path.join(STORAGE_DIR, entry.name, "metadata.json");
    try {
      const data = await fs.readFile(metadataPath, "utf-8");
      bundles.push(JSON.parse(data));
    } catch {
      // Skip directories without valid metadata
    }
  }

  bundles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  return bundles;
}

export async function getBundle(id: string): Promise<BundleMetadata | null> {
  const metadataPath = path.join(STORAGE_DIR, id, "metadata.json");
  try {
    const data = await fs.readFile(metadataPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function saveBundle(
  file: File,
  displayName?: string,
): Promise<BundleMetadata> {
  await ensureStorageDir();

  const id = uuidv4();
  const bundleDir = path.join(STORAGE_DIR, id);
  await fs.mkdir(bundleDir, { recursive: true });

  const aabPath = path.join(bundleDir, "app.aab");

  // Stream file to disk
  const writeStream = createWriteStream(aabPath);
  const readable = Readable.fromWeb(file.stream() as import("stream/web").ReadableStream);

  await new Promise<void>((resolve, reject) => {
    readable.pipe(writeStream);
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
    readable.on("error", reject);
  });

  const stats = await fs.stat(aabPath);

  // Extract metadata from AAB using bundletool
  let packageName = "unknown";
  let versionName = "unknown";
  let versionCode = "0";
  let appLabel: string | null = null;

  try {
    const aabInfo = await extractAabInfo(aabPath);
    packageName = aabInfo.packageName;
    versionName = aabInfo.versionName;
    versionCode = aabInfo.versionCode;
    appLabel = aabInfo.appLabel;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("Failed to extract AAB metadata with bundletool, using defaults:", msg);
    if (err instanceof Error && err.stack) {
      console.warn("Stack:", err.stack);
    }
  }

  // For the display name: use user-provided name, or app label from manifest, or package name
  const name = displayName?.trim() || appLabel || packageName;

  const metadata: BundleMetadata = {
    id,
    name,
    packageName,
    originalFilename: file.name,
    versionName,
    versionCode,
    uploadedAt: new Date().toISOString(),
    fileSizeBytes: stats.size,
  };

  await fs.writeFile(path.join(bundleDir, "metadata.json"), JSON.stringify(metadata, null, 2));

  return metadata;
}

export async function deleteBundle(id: string): Promise<void> {
  const bundleDir = path.join(STORAGE_DIR, id);
  await fs.rm(bundleDir, { recursive: true, force: true });
}

export function getBundleAabPath(id: string): string {
  return path.join(STORAGE_DIR, id, "app.aab");
}
