import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import QRCode from "qrcode";
import { siteOrigin } from "@/lib/origin";
import { getWalletSnapshot } from "@/lib/wallet";
import { LiveBalance } from "./live-balance";

export const metadata: Metadata = { title: "儲值金即時看板" };

async function Board() {
  await connection();
  const [initial, origin] = await Promise.all([getWalletSnapshot(), siteOrigin()]);
  const qrSvg = await QRCode.toString(`${origin}/`, {
    type: "svg",
    margin: 0,
    color: { dark: "#ffffff", light: "#00000000" },
  });

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-12 px-6 py-12 lg:flex-row lg:gap-24">
      <LiveBalance initial={initial} />
      <div className="flex flex-col items-center gap-4">
        <div
          className="size-48 rounded-2xl bg-white/5 p-5 lg:size-64 [&>svg]:size-full"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <p className="text-lg text-zinc-400">掃描 QR code 儲值</p>
      </div>
    </div>
  );
}

export default function DisplayPage() {
  return (
    <main className="flex min-h-screen flex-col bg-zinc-950 text-white">
      <Suspense
        fallback={<div className="flex flex-1 items-center justify-center text-zinc-500">載入中…</div>}
      >
        <Board />
      </Suspense>
    </main>
  );
}
