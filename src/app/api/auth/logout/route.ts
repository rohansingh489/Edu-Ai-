import { NextResponse } from "next/server";
import { endSession } from "@/lib/auth";

async function handle(req: Request) {
  await endSession();
  return NextResponse.redirect(new URL("/", req.url), 303);
}
export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (e) {
    console.error("LOGIN ERROR:", e);
    return NextResponse.json({ error: "Server error: " + (e as Error).message }, { status: 500 });
  }
}
