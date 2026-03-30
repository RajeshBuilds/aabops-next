import { NextRequest, NextResponse } from "next/server";
import { completeUploadSession } from "@/lib/upload-sessions";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const metadata = await completeUploadSession(id);
    return NextResponse.json(metadata, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to finalize upload";
    const status = /incomplete|invalid|missing/i.test(message)
      ? 400
      : /not found|no such file/i.test(message)
        ? 404
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
