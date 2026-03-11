import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { getBundle, getBundleAabPath } from "@/lib/bundles";

export async function GET(
  _request: NextRequest,
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
  const fileHandle = await fs.open(aabPath, "r");
  const stream = fileHandle.readableWebStream();

  const filename =
    bundle.originalFilename || `${bundle.name.replace(/[^a-zA-Z0-9.-]/g, "_")}.aab`;

  return new Response(stream as ReadableStream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": stat.size.toString(),
    },
  });
}
