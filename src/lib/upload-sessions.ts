import fs from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { MAX_FILE_SIZE, TEMP_DIR } from "./config";
import { saveBundleFromPath } from "./bundles";
import type { BundleMetadata } from "./types";

const CHUNK_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
const UPLOADS_DIR = path.join(TEMP_DIR, "upload-sessions");
const META_FILE = "session.json";
const CHUNKS_DIR = "chunks";
const ASSEMBLED_FILE = "assembled.aab";

interface UploadSessionMeta {
  id: string;
  originalFilename: string;
  displayName?: string;
  totalSize: number;
  chunkSize: number;
  totalChunks: number;
  createdAt: string;
  updatedAt: string;
}

export interface UploadSessionStatus {
  sessionId: string;
  originalFilename: string;
  displayName?: string;
  totalSize: number;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: number;
  complete: boolean;
}

function ensureAabFilename(filename: string) {
  if (!filename.toLowerCase().endsWith(".aab")) {
    throw new Error("File must be an .aab file");
  }
}

function assertValidChunkIndex(chunkIndex: number, totalChunks: number) {
  if (!Number.isInteger(chunkIndex) || chunkIndex < 0 || chunkIndex >= totalChunks) {
    throw new Error("Invalid chunk index");
  }
}

function getSessionDir(sessionId: string) {
  return path.join(UPLOADS_DIR, sessionId);
}

function getChunksDir(sessionId: string) {
  return path.join(getSessionDir(sessionId), CHUNKS_DIR);
}

function getMetaPath(sessionId: string) {
  return path.join(getSessionDir(sessionId), META_FILE);
}

function getChunkPath(sessionId: string, chunkIndex: number) {
  return path.join(getChunksDir(sessionId), `chunk-${chunkIndex.toString().padStart(6, "0")}.part`);
}

async function writeMeta(meta: UploadSessionMeta) {
  await fs.writeFile(getMetaPath(meta.id), JSON.stringify(meta, null, 2), "utf-8");
}

async function readMeta(sessionId: string): Promise<UploadSessionMeta> {
  const raw = await fs.readFile(getMetaPath(sessionId), "utf-8");
  return JSON.parse(raw) as UploadSessionMeta;
}

async function getUploadedChunkIndexes(sessionId: string): Promise<number[]> {
  const entries = await fs.readdir(getChunksDir(sessionId));
  const out: number[] = [];
  for (const file of entries) {
    const match = file.match(/^chunk-(\d+)\.part$/);
    if (!match) continue;
    out.push(Number.parseInt(match[1], 10));
  }
  return out.sort((a, b) => a - b);
}

export async function createUploadSession(input: {
  filename: string;
  totalSize: number;
  displayName?: string;
}) {
  const { filename, totalSize, displayName } = input;

  if (!filename || typeof filename !== "string") {
    throw new Error("Missing required field: filename");
  }
  ensureAabFilename(filename);

  if (!Number.isFinite(totalSize) || totalSize <= 0) {
    throw new Error("Invalid file size");
  }
  if (totalSize > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  const id = uuidv4();
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE_BYTES);
  const now = new Date().toISOString();
  const meta: UploadSessionMeta = {
    id,
    originalFilename: filename,
    displayName: displayName?.trim() || undefined,
    totalSize,
    chunkSize: CHUNK_SIZE_BYTES,
    totalChunks,
    createdAt: now,
    updatedAt: now,
  };

  await fs.mkdir(getChunksDir(id), { recursive: true });
  await writeMeta(meta);

  return {
    sessionId: id,
    chunkSize: meta.chunkSize,
    totalChunks: meta.totalChunks,
    maxFileSize: MAX_FILE_SIZE,
  };
}

export async function uploadChunk(sessionId: string, chunkIndex: number, payload: Uint8Array) {
  const meta = await readMeta(sessionId);
  assertValidChunkIndex(chunkIndex, meta.totalChunks);

  const expectedMax =
    chunkIndex === meta.totalChunks - 1
      ? meta.totalSize - chunkIndex * meta.chunkSize
      : meta.chunkSize;

  if (payload.byteLength <= 0 || payload.byteLength > expectedMax) {
    throw new Error("Invalid chunk size");
  }

  await fs.writeFile(getChunkPath(sessionId, chunkIndex), payload);
  meta.updatedAt = new Date().toISOString();
  await writeMeta(meta);
}

export async function getUploadSessionStatus(sessionId: string): Promise<UploadSessionStatus> {
  const meta = await readMeta(sessionId);
  const uploadedIndexes = await getUploadedChunkIndexes(sessionId);
  return {
    sessionId: meta.id,
    originalFilename: meta.originalFilename,
    displayName: meta.displayName,
    totalSize: meta.totalSize,
    chunkSize: meta.chunkSize,
    totalChunks: meta.totalChunks,
    uploadedChunks: uploadedIndexes.length,
    complete: uploadedIndexes.length === meta.totalChunks,
  };
}

async function assembleChunksToFile(sessionId: string, outputPath: string) {
  const meta = await readMeta(sessionId);
  const uploadedIndexes = await getUploadedChunkIndexes(sessionId);

  if (uploadedIndexes.length !== meta.totalChunks) {
    throw new Error("Upload incomplete. Missing chunks.");
  }

  const writer = createWriteStream(outputPath);
  await new Promise<void>(async (resolve, reject) => {
    writer.on("error", reject);
    try {
      for (let i = 0; i < meta.totalChunks; i += 1) {
        if (uploadedIndexes[i] !== i) {
          throw new Error(`Upload incomplete. Missing chunk ${i}.`);
        }
        const data = await fs.readFile(getChunkPath(sessionId, i));
        if (data.byteLength === 0) {
          throw new Error(`Chunk ${i} is empty.`);
        }
        const ok = writer.write(data);
        if (!ok) {
          await new Promise<void>((res) => writer.once("drain", res));
        }
      }
      writer.end(() => resolve());
    } catch (error) {
      writer.destroy();
      reject(error);
    }
  });

  const stat = await fs.stat(outputPath);
  if (stat.size !== meta.totalSize) {
    throw new Error("Assembled file size mismatch");
  }
}

export async function completeUploadSession(sessionId: string): Promise<BundleMetadata> {
  const meta = await readMeta(sessionId);
  const assembledPath = path.join(getSessionDir(sessionId), ASSEMBLED_FILE);

  await assembleChunksToFile(sessionId, assembledPath);
  const bundle = await saveBundleFromPath(
    assembledPath,
    meta.originalFilename,
    meta.displayName,
  );

  await fs.rm(getSessionDir(sessionId), { recursive: true, force: true });
  return bundle;
}

export async function deleteUploadSession(sessionId: string) {
  await fs.rm(getSessionDir(sessionId), { recursive: true, force: true });
}
