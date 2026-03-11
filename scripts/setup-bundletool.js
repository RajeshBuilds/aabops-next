#!/usr/bin/env node
/**
 * Downloads bundletool for local development.
 * Run: node scripts/setup-bundletool.js
 * Or: pnpm run setup:bundletool
 * Use --force or -f to re-download (e.g. after upgrading version).
 */

const fs = require("fs");
const path = require("path");

const BUNDLETOOL_VERSION = "1.18.3";
const BUNDLETOOL_URL = `https://github.com/google/bundletool/releases/download/${BUNDLETOOL_VERSION}/bundletool-all-${BUNDLETOOL_VERSION}.jar`;
const OUTPUT_DIR = path.join(process.cwd(), "bundletool");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "bundletool.jar");
const VERSION_FILE = path.join(OUTPUT_DIR, "version.txt");

const force = process.argv.includes("--force") || process.argv.includes("-f");

async function main() {
  const existingVersion =
    fs.existsSync(VERSION_FILE) && fs.readFileSync(VERSION_FILE, "utf8").trim();
  const needsDownload = force || !fs.existsSync(OUTPUT_PATH) || existingVersion !== BUNDLETOOL_VERSION;

  if (!needsDownload) {
    console.log(`bundletool ${BUNDLETOOL_VERSION} already exists at ${OUTPUT_PATH}`);
    return;
  }

  if (force && fs.existsSync(OUTPUT_PATH)) {
    console.log("Forcing re-download...");
  }

  console.log(`Downloading bundletool ${BUNDLETOOL_VERSION}...`);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  try {
    const response = await fetch(BUNDLETOOL_URL, { redirect: "follow" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(OUTPUT_PATH, buffer);
    fs.writeFileSync(VERSION_FILE, BUNDLETOOL_VERSION);
    console.log(`Done. bundletool ${BUNDLETOOL_VERSION} saved to ${OUTPUT_PATH}`);
  } catch (err) {
    if (fs.existsSync(OUTPUT_PATH)) fs.unlinkSync(OUTPUT_PATH);
    console.error("Download failed:", err.message);
    process.exit(1);
  }
}

main();
