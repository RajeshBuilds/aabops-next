import { NextRequest, NextResponse } from "next/server";
import { getBundle, deleteBundle } from "@/lib/bundles";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const bundle = await getBundle(id);

  if (!bundle) {
    return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
  }

  return NextResponse.json(bundle);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const bundle = await getBundle(id);

  if (!bundle) {
    return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
  }

  await deleteBundle(id);
  return NextResponse.json({ success: true });
}
