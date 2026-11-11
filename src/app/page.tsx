import { connection } from "next/server";
import { cache, Suspense } from "react";
import { CircleCheck, Clock, Heart, MonitorPlay, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { MAX_TOPUP, MESSAGE_MAX, MIN_TOPUP, NAME_MAX } from "@/lib/stripe";
import { creditTopUp, getWallet, type CreditResult } from "@/lib/wallet";
import { TopUpForm } from "./topup-form";

const twd = (n: number) => `NT$${n.toLocaleString("zh-TW", { maximumFractionDigits: 2 })}`;

type SearchParams = PageProps<"/">["searchParams"];

/**
 * Credit a just-paid top-up (idempotent backup for the webhook), then read the wallet.
 * Wrapped in React cache() so the balance and the sponsor list share one load per request.
 */
const loadWallet = cache(async (sessionId: string | null) => {
  await connection();
  let credit: CreditResult | null = null;
  if (sessionId?.startsWith("cs_")) credit = await creditTopUp(sessionId).catch(() => null);
  return { credit, wallet: await getWallet() };
});

async function readParams(searchParams: SearchParams) {
  const { session_id, canceled } = await searchParams;
  return {
    sessionId: typeof session_id === "string" ? session_id : null,
    canceled: Boolean(canceled),
  };
}

async function BalanceCard({ searchParams }: { searchParams: SearchParams }) {
  const { sessionId, canceled } = await readParams(searchParams);
  const { credit, wallet } = await loadWallet(sessionId);
  const count = wallet.recent.length;

  return (
    <div className="flex flex-col gap-4">
      {canceled && (
        <Alert>
          <XCircle />
          <AlertTitle>已取消付款</AlertTitle>
          <AlertDescription>沒有扣款，你可以重新選擇金額。</AlertDescription>
        </Alert>
      )}
      {(credit?.status === "credited" || credit?.status === "already_credited") && (
        <Alert className="border-primary/30 bg-primary/5 text-primary">
          <CircleCheck />
          <AlertTitle>付款成功，謝謝你的贊助！</AlertTitle>
          <AlertDescription className="text-primary/80">已儲值 {twd(credit.amount)}</AlertDescription>
        </Alert>
      )}
      {credit?.status === "not_paid" && (
        <Alert>
          <Clock />
          <AlertTitle>付款處理中</AlertTitle>
          <AlertDescription>完成後金額會自動入帳。</AlertDescription>
        </Alert>
      )}

      <Card className="relative overflow-hidden border-0 bg-zinc-950 text-white ring-0 dark:bg-zinc-900">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-primary/30 blur-3xl"
        />
        <CardHeader className="relative">
          <CardDescription className="text-zinc-400">當前儲值金</CardDescription>
          <CardTitle className="font-mono text-5xl font-semibold tracking-tight tabular-nums">
            {twd(wallet.balance)}
          </CardTitle>
        </CardHeader>
        <CardContent className="relative flex items-center gap-2 text-sm text-zinc-400">
          <Heart className="size-4 text-primary" />
          {count > 0 ? `最近 ${count} 位贊助者` : "成為第一位贊助者"}
        </CardContent>
      </Card>
    </div>
  );
}

async function SponsorList({ searchParams }: { searchParams: SearchParams }) {
  const { sessionId } = await readParams(searchParams);
  const { wallet } = await loadWallet(sessionId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">最近贊助</CardTitle>
        <CardDescription>謝謝每一位支持的人</CardDescription>
      </CardHeader>
      <CardContent>
        {wallet.recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">還沒有人贊助，來當第一個吧！</p>
        ) : (
          <ul className="flex flex-col">
            {wallet.recent.map((t, i) => (
              <li key={t.id}>
                {i > 0 && <Separator className="my-3" />}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="truncate font-medium">{t.name}</span>
                    {t.message && <p className="break-words text-sm text-muted-foreground">{t.message}</p>}
                    <time className="font-mono text-xs text-muted-foreground/70">
                      {new Date(t.created * 1000).toLocaleString("zh-TW", {
                        timeZone: "Asia/Taipei",
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  <Badge
                    variant="secondary"
                    className="shrink-0 bg-primary/10 font-mono text-primary tabular-nums"
                  >
                    +{twd(t.amount)}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function BalanceSkeleton() {
  return <Skeleton className="h-[164px] w-full rounded-xl" />;
}

function ListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-36" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:py-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">儲值金</h1>
          <p className="text-muted-foreground">任何人都可以用信用卡贊助，金額會即時顯示在看板上。</p>
        </div>
        <Button variant="outline" asChild>
          <a href="/display" target="_blank" rel="noopener">
            <MonitorPlay />
            開啟看板
          </a>
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-6">
          <Suspense fallback={<BalanceSkeleton />}>
            <BalanceCard searchParams={searchParams} />
          </Suspense>
          <TopUpForm min={MIN_TOPUP} max={MAX_TOPUP} nameMax={NAME_MAX} messageMax={MESSAGE_MAX} />
        </div>
        <Suspense fallback={<ListSkeleton />}>
          <SponsorList searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
