import { NextRequest, NextResponse } from "next/server";
import {
  deleteUploadSession,
  getUploadSessionStatus,
  uploadChunk,
} from "@/lib/upload-sessions";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const status = await getUploadSessionStatus(id);
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload session not found";
    const status = /not found|no such file/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const chunkParam = request.nextUrl.searchParams.get("chunkIndex");
    const chunkIndex = Number.parseInt(chunkParam ?? "", 10);
    if (!Number.isInteger(chunkIndex)) {
      return NextResponse.json({ error: "Missing or invalid chunkIndex" }, { status: 400 });
    }

    const body = await request.arrayBuffer();
    await uploadChunk(id, chunkIndex, new Uint8Array(body));

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload chunk";
    const status = /invalid|missing|incomplete/i.test(message)
      ? 400
      : /not found|no such file/i.test(message)
        ? 404
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await deleteUploadSession(id);
  return NextResponse.json({ ok: true });
}
