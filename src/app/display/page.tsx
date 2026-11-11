import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import QRCode from "qrcode";
import { siteOrigin } from "@/lib/origin";
import { getWalletSnapshot } from "@/lib/wallet";
import { LiveBalance } from "./live-balance";

export const metadata: Metadata = { title: "Live Board" };

async function Board() {
  await connection();
  const [initial, origin] = await Promise.all([getWalletSnapshot(), siteOrigin()]);
  const qrSvg = await QRCode.toString(`${origin}/`, {
    type: "svg",
    margin: 0,
    color: { dark: "#ffffff", light: "#00000000" },
  });

  const qr = (
    <div className="flex flex-col items-center gap-3">
      <div
        className="size-40 rounded-2xl bg-card p-4 ring-1 ring-border lg:size-48 [&>svg]:size-full"
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />
      <p className="text-muted-foreground">Scan to contribute</p>
    </div>
  );

  return <LiveBalance initial={initial} qr={qr} />;
}

export default function DisplayPage() {
  return (
    <main className="dark flex min-h-screen flex-col items-center bg-background text-foreground">
      <Suspense
        fallback={<div className="flex flex-1 items-center justify-center text-muted-foreground">Loading…</div>}
      >
        <Board />
      </Suspense>
    </main>
  );
}
