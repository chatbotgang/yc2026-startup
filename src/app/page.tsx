import { connection } from "next/server";
import { Suspense } from "react";
import { MAX_TOPUP, MIN_TOPUP } from "@/lib/stripe";
import { creditTopUp, getWallet } from "@/lib/wallet";
import { TopUpForm } from "./topup-form";

const twd = (n: number) => `NT$${n.toLocaleString("zh-TW", { maximumFractionDigits: 2 })}`;

async function Wallet({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  // The balance is live Stripe data: always render at request time.
  await connection();
  // Credit a just-paid top-up before reading the balance, so it shows immediately.
  const status = await Status({ searchParams });
  const wallet = await getWallet();
  return (
    <>
      {status}
      <section className="rounded-2xl bg-zinc-900 p-6 text-white dark:bg-zinc-800">
        <p className="text-sm text-zinc-400">當前儲值金</p>
        <p className="mt-1 text-4xl font-semibold tabular-nums">{twd(wallet.balance)}</p>
      </section>

      {wallet.recent.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-zinc-500">最近紀錄</h2>
          <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
            {wallet.recent.map((t) => (
              <li key={t.id} className="flex justify-between py-2">
                <span className="text-zinc-500">
                  {new Date(t.created * 1000).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}
                </span>
                <span className={`tabular-nums ${t.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {t.amount >= 0 ? "+" : ""}
                  {twd(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

async function Status({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const { session_id, canceled } = await searchParams;

  if (canceled) {
    return <Notice tone="neutral">已取消付款，沒有扣款。</Notice>;
  }
  if (typeof session_id === "string" && session_id.startsWith("cs_")) {
    // The webhook is the primary fulfillment path; this is an idempotent backup so the
    // balance updates immediately even if the webhook is slow or not configured locally.
    const result = await creditTopUp(session_id).catch(() => null);
    if (result?.status === "credited" || result?.status === "already_credited") {
      return <Notice tone="success">付款成功，已儲值 {twd(result.amount)}！</Notice>;
    }
    if (result?.status === "not_paid") {
      return <Notice tone="neutral">付款處理中，完成後金額會自動入帳。</Notice>;
    }
  }
  return null;
}

function Notice({ tone, children }: { tone: "success" | "neutral"; children: React.ReactNode }) {
  return (
    <p
      className={`rounded-lg px-4 py-3 text-sm ${
        tone === "success"
          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
      }`}
    >
      {children}
    </p>
  );
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-12">
      <header>
        <h1 className="text-2xl font-semibold">儲值金</h1>
        <p className="mt-1 text-sm text-zinc-500">任何人都可以用信用卡為這個帳戶儲值。</p>
      </header>

      <Suspense fallback={<div className="h-28 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />}>
        <Wallet searchParams={searchParams} />
      </Suspense>

      <TopUpForm min={MIN_TOPUP} max={MAX_TOPUP} />
    </main>
  );
}
