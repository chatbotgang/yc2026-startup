import { connection } from "next/server";
import { getWalletSnapshot } from "@/lib/wallet";

export async function GET() {
  await connection(); // always live, never prerendered
  try {
    return Response.json(await getWalletSnapshot(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[wallet] balance read failed", err);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
