import { connection } from "next/server";
import { getWalletSnapshot } from "@/lib/wallet";

// Public, read-only data (also shown on /live and the /display deck).
const headers = { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" };

export async function GET() {
  await connection(); // always live, never prerendered
  try {
    return Response.json(await getWalletSnapshot(), { headers });
  } catch (err) {
    console.error("[wallet] balance read failed", err);
    return Response.json({ error: "unavailable" }, { status: 503, headers });
  }
}
