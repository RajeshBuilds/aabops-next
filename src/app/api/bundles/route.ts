import { NextRequest, NextResponse } from "next/server";
import { listBundles, saveBundle } from "@/lib/bundles";
import { MAX_FILE_SIZE } from "@/lib/config";

export async function GET() {
  const bundles = await listBundles();
  return NextResponse.json({ bundles });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const displayName = formData.get("name") as string | null; // optional display name override

    if (!file) {
      return NextResponse.json(
        { error: "Missing required field: file" },
        { status: 400 },
      );
    }

    if (!file.name.endsWith(".aab")) {
      return NextResponse.json({ error: "File must be an .aab file" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 },
      );
    }

    const metadata = await saveBundle(file, displayName || undefined);
    return NextResponse.json(metadata, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
