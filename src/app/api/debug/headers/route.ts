import { NextResponse } from "next/server";
import { createCorsPreflightResponse } from "@/lib/route";

export async function GET(request: Request) {
  return NextResponse.json({
    headers: Object.fromEntries(request.headers.entries())
  });
}

export function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}
