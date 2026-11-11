import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import QRCode from "qrcode";
import { getWalletSnapshot } from "@/lib/wallet";
import { LiveBalance } from "./live-balance";

export const metadata: Metadata = { title: "Share the Speed · Live" };

// Where the QR sends people. Separate from SITE_URL, which Checkout redirects depend on.
const DONATE_PAGE_URL = process.env.DONATE_PAGE_URL ?? "https://yc2026-wallet-310672118987.asia-east1.run.app/pay";

async function Board() {
  await connection();
  const initial = await getWalletSnapshot().catch((err) => {
    console.error("[live] balance read failed", err);
    return null;
  });
  const donateUrl = DONATE_PAGE_URL;
  // Dark modules on white: inverted QR codes don't scan reliably on every phone.
  const qrSvg = await QRCode.toString(donateUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
  const isLocal = /^https?:\/\/(localhost|127\.|\[::1\])/.test(donateUrl);

  const qr = (
    <div className="flex flex-col items-center gap-4">
      <p className="font-mono text-[clamp(12px,1vw,16px)] tracking-[.14em] text-[#6e7277] uppercase">Scan to give</p>
      <div
        role="img"
        aria-label={`QR code linking to ${donateUrl}`}
        className="grid aspect-square w-[clamp(220px,22vw,380px)] max-w-full animate-[qr-pulse_2.6s_ease-out_infinite] place-items-center rounded-[28px] bg-white p-[clamp(14px,1.4vw,24px)] motion-reduce:animate-none [&>svg]:h-auto [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />
      <p className="font-mono text-[clamp(12px,.95vw,16px)] break-all text-[#6e7277]">{donateUrl}</p>
      {isLocal && (
        <p role="alert" className="rounded-xl border border-[#f0b8cf]/40 px-4 py-2 text-sm text-[#f0b8cf]">
          This QR points to localhost, so phones can’t open it. Set SITE_URL to the public URL.
        </p>
      )}
    </div>
  );

  return <LiveBalance initial={initial} qr={qr} />;
}

export default function DisplayPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-black font-light text-[#f5f5f3] antialiased">
      {/* Signal Field dot texture, faded toward the corner like the deck's cards */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgb(245_245_243/0.08)_1.2px,transparent_1.8px)] bg-[length:10px_10px] [mask-image:radial-gradient(80%_70%_at_100%_0%,#000,transparent)]"
      />
      <p className="absolute top-5 left-6 flex items-center gap-2.5 font-mono text-xs tracking-[.12em] text-[#6e7277] uppercase">
        <span className="size-2.5 rounded-full bg-[#4586f0] shadow-[0_0_14px_#4586f0]" />
        Share the Speed · Agent Lab
      </p>
      <Suspense
        fallback={<div className="flex flex-1 items-center justify-center font-mono text-[#6e7277]">Loading…</div>}
      >
        <Board />
      </Suspense>
    </main>
  );
}
