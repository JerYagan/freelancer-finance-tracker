import { NextRequest, NextResponse } from "next/server";
import { _testStorageObjects } from "@/server/services/storage";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const key = path.join("/");
  const contentType =
    request.headers.get("content-type") || "application/octet-stream";
  const buffer = Buffer.from(await request.arrayBuffer());

  _testStorageObjects.set(key, {
    contentType,
    buffer,
    size: buffer.length,
    createdAt: new Date(),
  });

  return new NextResponse(null, { status: 200 });
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const key = path.join("/");
  const item = _testStorageObjects.get(key);

  if (!item) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return new NextResponse(
    new Uint8Array(item.buffer || Buffer.from("mock content")),
    {
      status: 200,
      headers: {
        "Content-Type": item.contentType,
        "Content-Length": item.size.toString(),
      },
    },
  );
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const key = path.join("/");
  _testStorageObjects.delete(key);
  return new NextResponse(null, { status: 204 });
}
