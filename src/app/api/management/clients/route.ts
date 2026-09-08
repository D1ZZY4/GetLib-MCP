import { NextResponse } from "next/server";
import { listClients } from "@/application/clients/clients.service";

export async function GET() {
  return NextResponse.json(listClients());
}
