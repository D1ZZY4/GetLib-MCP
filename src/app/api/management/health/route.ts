import { NextResponse } from "next/server";
import { getHealthSnapshot } from "@/application/health/health.service";
import "@/server/mcp/registry/registry-loader";

export async function GET() {
  return NextResponse.json(getHealthSnapshot());
}
