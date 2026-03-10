import path from "path";

export const STORAGE_DIR = process.env.STORAGE_DIR || path.join(process.cwd(), "storage");
export const BUNDLETOOL_PATH = process.env.BUNDLETOOL_PATH || "/opt/bundletool/bundletool.jar";
export const TEMP_DIR = process.env.TEMP_DIR || "/tmp/aabops";
export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
