import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { getBundle, getBundleAabPath } from "@/lib/bundles";
import { buildApks, cleanupBuildDir } from "@/lib/bundletool";
import type { DeviceSpec } from "@/lib/types";

function isValidDeviceSpec(spec: unknown): spec is DeviceSpec {
  if (!spec || typeof spec !== "object") return false;
  const s = spec as Record<string, unknown>;
  return (
    Array.isArray(s.supportedAbis) &&
    s.supportedAbis.length > 0 &&
    Array.isArray(s.supportedLocales) &&
    s.supportedLocales.length > 0 &&
    typeof s.screenDensity === "number" &&
    typeof s.sdkVersion === "number"
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let apksPath: string | undefined;

  try {
    const bundle = await getBundle(id);
    if (!bundle) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
    }

    const body = await request.json();
    const deviceSpec = body.deviceSpec;

    if (!isValidDeviceSpec(deviceSpec)) {
      return NextResponse.json(
        {
          error:
            "Invalid device spec. Required: supportedAbis (string[]), supportedLocales (string[]), screenDensity (number), sdkVersion (number)",
        },
        { status: 400 },
      );
    }

    const aabPath = getBundleAabPath(id);

    // Verify AAB file exists
    try {
      await fs.access(aabPath);
    } catch {
      return NextResponse.json({ error: "AAB file not found on disk" }, { status: 404 });
    }

    // Build APKS
    apksPath = await buildApks(aabPath, deviceSpec);

    // Stream the APKS file back
    const stat = await fs.stat(apksPath);
    const fileHandle = await fs.open(apksPath, "r");
    const stream = fileHandle.readableWebStream();

    const response = new Response(stream as ReadableStream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${bundle.name.replace(/[^a-zA-Z0-9.-]/g, "_")}.apks"`,
        "Content-Length": stat.size.toString(),
      },
    });

    // Schedule cleanup after a delay to allow streaming to complete
    const pathToClean = apksPath;
    setTimeout(() => {
      cleanupBuildDir(pathToClean);
    }, 60000); // 1 minute delay

    return response;
  } catch (error) {
    // Clean up on error
    if (apksPath) {
      await cleanupBuildDir(apksPath);
    }
    console.error("Build APKS error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Build failed" },
      { status: 500 },
    );
  }
}
