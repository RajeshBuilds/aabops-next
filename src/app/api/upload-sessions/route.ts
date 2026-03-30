import { NextRequest, NextResponse } from "next/server";
import { createUploadSession } from "@/lib/upload-sessions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const filename = body?.filename as string | undefined;
    const totalSize = Number(body?.size);
    const displayName = body?.displayName as string | undefined;

    const session = await createUploadSession({
      filename: filename || "",
      totalSize,
      displayName,
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create upload session";
    const status = /maximum|invalid|missing|must be/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
