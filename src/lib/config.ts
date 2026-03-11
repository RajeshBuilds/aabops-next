import fs from "fs";
import path from "path";

export const STORAGE_DIR = process.env.STORAGE_DIR || path.join(process.cwd(), "storage");

/** Resolve bundletool path: env var → project-local (for dev) → /opt/bundletool (for Coolify) */
function resolveBundletoolPath(): string {
  const candidates = [
    process.env.BUNDLETOOL_PATH,
    path.join(process.cwd(), "bundletool", "bundletool.jar"),
    "/opt/bundletool/bundletool.jar",
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  // Default to project-local so setup script creates the right file
  return path.join(process.cwd(), "bundletool", "bundletool.jar");
}

export const BUNDLETOOL_PATH = resolveBundletoolPath();
export const TEMP_DIR = process.env.TEMP_DIR || "/tmp/aabops";
export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
