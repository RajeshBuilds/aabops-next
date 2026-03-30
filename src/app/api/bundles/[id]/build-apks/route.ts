import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { createReadStream } from "fs";
import { Readable } from "stream";
import { getBundle, getBundleAabPath } from "@/lib/bundles";
import { getOrBuildCachedApks } from "@/lib/apks-cache";
import { parseRangeHeader } from "@/lib/http-range";
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
    console.log("[build-apks] Request:", { bundleId: id, bundleName: bundle.name, aabPath });

    // Verify AAB file exists
    try {
      await fs.access(aabPath);
    } catch {
      return NextResponse.json({ error: "AAB file not found on disk" }, { status: 404 });
    }

    // Build APKS (cached by bundle + device spec to make retries/resume robust)
    const { apksPath, cacheHit, specHash } = await getOrBuildCachedApks(
      id,
      aabPath,
      deviceSpec,
    );
    console.log("[build-apks] Cache:", { bundleId: id, specHash, cacheHit });

    // Stream the APKS file back, with byte range support for resumable client downloads.
    const stat = await fs.stat(apksPath);
    const range = parseRangeHeader(request.headers.get("range"), stat.size);
    const nodeStream = range
      ? createReadStream(apksPath, { start: range.start, end: range.end })
      : createReadStream(apksPath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
    const headers: Record<string, string> = {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${bundle.name.replace(/[^a-zA-Z0-9.-]/g, "_")}.apks"`,
      "Accept-Ranges": "bytes",
      ETag: `"${id}-${specHash}-${stat.size}-${Math.floor(stat.mtimeMs)}"`,
    };

    if (range) {
      const chunkLength = range.end - range.start + 1;
      headers["Content-Length"] = chunkLength.toString();
      headers["Content-Range"] = `bytes ${range.start}-${range.end}/${stat.size}`;
      return new Response(webStream, { status: 206, headers });
    }

    headers["Content-Length"] = stat.size.toString();
    return new Response(webStream, { headers });
  } catch (error) {
    console.error("Build APKS error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Build failed" },
      { status: 500 },
    );
  }
}
