import { execFile } from "child_process";
import fs from "fs/promises";
import path from "path";
import { BUNDLETOOL_PATH, BUNDLETOOL_SIGNING, TEMP_DIR } from "./config";
import type { AabInfo, DeviceSpec } from "./types";

/**
 * Run a bundletool dump manifest --xpath command and return the trimmed output.
 */
async function dumpManifestXpath(aabPath: string, xpath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "java",
      [
        "-jar",
        BUNDLETOOL_PATH,
        "dump",
        "manifest",
        `--bundle=${aabPath}`,
        `--xpath=${xpath}`,
      ],
      { timeout: 30_000 },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              `bundletool dump failed for xpath "${xpath}": ${stderr || error.message}`,
            ),
          );
          return;
        }
        resolve(stdout.trim());
      },
    );
  });
}

/**
 * Run a bundletool dump resources command to resolve a string resource value.
 * e.g. resolves "string/app_name" → "My Application"
 */
async function dumpResourceValue(
  aabPath: string,
  resourceName: string,
): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(
      "java",
      [
        "-jar",
        BUNDLETOOL_PATH,
        "dump",
        "resources",
        `--bundle=${aabPath}`,
        `--resource=${resourceName}`,
        "--values",
      ],
      { timeout: 30_000 },
      (error, stdout) => {
        if (error) {
          resolve(null);
          return;
        }

        // Output format contains lines like:
        //   (default) - [STR] "My Application"
        // We look for the default config's string value in double quotes.
        const lines = stdout.split("\n");
        for (const line of lines) {
          // Match patterns like: [STR] "Some Value"
          const match = line.match(/\[STR\]\s*"(.+?)"/);
          if (match) {
            resolve(match[1]);
            return;
          }
        }
        resolve(null);
      },
    );
  });
}

/**
 * Resolve an android:label value to an actual string.
 * Handles:
 *  - Literal strings: returned as-is
 *  - @string/xxx references: resolved via bundletool dump resources
 *  - 0x... hex resource IDs: not resolvable, returns null
 */
async function resolveAppLabel(
  aabPath: string,
  rawLabel: string | null,
): Promise<string | null> {
  if (!rawLabel) return null;

  // Already a literal string
  if (!rawLabel.startsWith("@") && !rawLabel.startsWith("0x")) {
    return rawLabel;
  }

  // @string/app_name → resolve via bundletool dump resources
  if (rawLabel.startsWith("@string/")) {
    const resourceName = rawLabel.replace("@", ""); // "string/app_name"
    return dumpResourceValue(aabPath, resourceName);
  }

  // Hex resource ID (0x7f0e013a) — can't resolve without more complex parsing
  return null;
}

/**
 * Extract app metadata (package name, version name, version code, app label)
 * directly from an AAB file using bundletool.
 */
export async function extractAabInfo(aabPath: string): Promise<AabInfo> {
  const [packageName, versionName, versionCode, rawLabel] = await Promise.all([
    dumpManifestXpath(aabPath, "/manifest/@package"),
    dumpManifestXpath(aabPath, "/manifest/@android:versionName"),
    dumpManifestXpath(aabPath, "/manifest/@android:versionCode"),
    dumpManifestXpath(aabPath, "/manifest/application/@android:label").catch(
      () => null,
    ),
  ]);

  // Resolve the label — handles @string/ references by looking up the resource value
  const appLabel = await resolveAppLabel(aabPath, rawLabel);

  return { packageName, versionName, versionCode, appLabel };
}

export async function buildApks(aabPath: string, deviceSpec: DeviceSpec): Promise<string> {
  const buildId = `build-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tempDir = path.join(TEMP_DIR, buildId);
  await fs.mkdir(tempDir, { recursive: true });

  const deviceSpecPath = path.join(tempDir, "device-spec.json");
  const outputPath = path.join(tempDir, "output.apks");

  await fs.writeFile(deviceSpecPath, JSON.stringify(deviceSpec, null, 2));

  const args = [
    "-jar",
    BUNDLETOOL_PATH,
    "build-apks",
    `--bundle=${aabPath}`,
    `--output=${outputPath}`,
    `--device-spec=${deviceSpecPath}`,
    "--overwrite",
  ];
  // Signing is required for installation; without it, INSTALL_PARSE_FAILED_NO_CERTIFICATES occurs.
  if (BUNDLETOOL_SIGNING) {
    args.push(
      `--ks=${BUNDLETOOL_SIGNING.ksPath}`,
      `--ks-key-alias=${BUNDLETOOL_SIGNING.ksAlias}`,
      `--ks-pass=pass:${BUNDLETOOL_SIGNING.ksPass}`,
      `--key-pass=pass:${BUNDLETOOL_SIGNING.keyPass}`,
    );
  }

  await new Promise<void>((resolve, reject) => {
    execFile(
      "java",
      args,
      { timeout: 5 * 60 * 1000 }, // 5 minute timeout
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Bundletool failed: ${stderr || error.message}`));
          return;
        }
        resolve();
      },
    );
  });

  // Verify output file exists
  try {
    await fs.access(outputPath);
  } catch {
    throw new Error("Bundletool completed but output file was not created");
  }

  return outputPath;
}

export async function cleanupBuildDir(apksPath: string): Promise<void> {
  const buildDir = path.dirname(apksPath);
  try {
    await fs.rm(buildDir, { recursive: true, force: true });
  } catch {
    // Best effort cleanup
  }
}
