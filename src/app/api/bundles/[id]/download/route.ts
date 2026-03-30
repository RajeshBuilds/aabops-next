import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { createReadStream } from "fs";
import { Readable } from "stream";
import { getBundle, getBundleAabPath } from "@/lib/bundles";
import { parseRangeHeader } from "@/lib/http-range";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const bundle = await getBundle(id);
  if (!bundle) {
    return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
  }

  const aabPath = getBundleAabPath(id);

  try {
    await fs.access(aabPath);
  } catch {
    return NextResponse.json({ error: "AAB file not found on disk" }, { status: 404 });
  }

  const stat = await fs.stat(aabPath);
  const range = parseRangeHeader(request.headers.get("range"), stat.size);
  const nodeStream = range
    ? createReadStream(aabPath, { start: range.start, end: range.end })
    : createReadStream(aabPath);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

  const filename =
    bundle.originalFilename || `${bundle.name.replace(/[^a-zA-Z0-9.-]/g, "_")}.aab`;

  const headers: Record<string, string> = {
    "Content-Type": "application/octet-stream",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Accept-Ranges": "bytes",
  };

  if (range) {
    const chunkLength = range.end - range.start + 1;
    headers["Content-Length"] = chunkLength.toString();
    headers["Content-Range"] = `bytes ${range.start}-${range.end}/${stat.size}`;
    return new Response(webStream, { status: 206, headers });
  }

  headers["Content-Length"] = stat.size.toString();
  return new Response(webStream, { headers });
}
