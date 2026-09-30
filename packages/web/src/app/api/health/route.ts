import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ service: "web", status: "ok", timestamp: new Date().toISOString() });
}