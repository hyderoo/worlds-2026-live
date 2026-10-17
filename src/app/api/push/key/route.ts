import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getVapid } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET() {
  const k = await getVapid(getStore());
  return NextResponse.json({ publicKey: k.publicKey });
}
