"use client";

import { useEffect, useRef, useState } from "react";

type TopUp = { id: string; amount: number; created: number; name: string; message: string };
type Snapshot = { balance: number; recent: TopUp[] };

const POLL_MS = 3_000;
const ANIMATE_MS = 1_200;
const FLASH_MS = 6_000;
const twd = (n: number) => `NT$${Math.round(n).toLocaleString("zh-TW")}`;

export function LiveBalance({ initial, qr }: { initial: Snapshot; qr: React.ReactNode }) {
  const [target, setTarget] = useState(initial.balance);
  const [shown, setShown] = useState(initial.balance);
  const [recent, setRecent] = useState(initial.recent);
  const [flash, setFlash] = useState<TopUp | null>(null);
  const [stale, setStale] = useState(false);
  const latestId = useRef(initial.recent[0]?.id ?? null);
  const shownRef = useRef(initial.balance);

  // Poll the balance and sponsor feed.
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/balance", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data: Snapshot = await res.json();
        if (!alive) return;
        setStale(false);
        setTarget(data.balance);
        setRecent(data.recent);
        const newest = data.recent[0];
        if (newest && newest.id !== latestId.current) {
          latestId.current = newest.id;
          setFlash(newest);
        }
      } catch {
        if (alive) setStale(true);
      }
    };
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Count up (or down) from the shown value to the new target.
  useEffect(() => {
    const from = shownRef.current;
    if (from === target) return;
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ANIMATE_MS);
      const value = from + (target - from) * (1 - Math.pow(1 - t, 3));
      shownRef.current = value;
      setShown(value);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  // Hide the "just topped up" card after a few seconds.
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), FLASH_MS);
    return () => clearTimeout(id);
  }, [flash]);

  return (
    <div className="grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-[1fr_22rem] lg:gap-16">
      {/* Balance + newest sponsor */}
      <div className="flex min-w-0 flex-col items-center gap-5 text-center lg:items-start lg:text-left">
        <p className="text-xl text-muted-foreground lg:text-2xl">當前儲值金</p>
        <p className="text-6xl font-mono font-semibold tabular-nums tracking-tighter sm:text-7xl lg:text-9xl">
          {twd(shown)}
        </p>
        <div className="flex min-h-28 w-full max-w-xl items-start justify-center lg:justify-start">
          {flash && (
            <div
              key={flash.id}
              className="animate-[pop_0.4s_ease-out] rounded-2xl bg-primary/15 ring-1 ring-primary/30 px-6 py-4 text-left"
            >
              <p className="text-2xl font-medium text-foreground">
                <span className="break-words">{flash.name}</span>
                <span className="ml-3 tabular-nums text-primary">+{twd(flash.amount)}</span>
              </p>
              {flash.message && (
                <p className="mt-1 break-words text-xl text-foreground">「{flash.message}」</p>
              )}
            </div>
          )}
        </div>
        <p className={`text-sm ${stale ? "text-amber-400" : "text-muted-foreground/60"}`}>
          {stale ? "連線中斷，重新連線中…" : "每 3 秒自動更新"}
        </p>
      </div>

      {/* QR + sponsor feed */}
      <div className="flex min-w-0 flex-col items-center gap-6">
        {qr}
        {recent.length > 0 && (
          <ul className="flex w-full flex-col gap-2">
            {recent.map((t) => (
              <li key={t.id} className="rounded-xl bg-card ring-1 ring-border px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate font-medium">{t.name}</span>
                  <span className="shrink-0 font-mono tabular-nums text-primary">+{twd(t.amount)}</span>
                </div>
                {t.message && <p className="mt-0.5 break-words text-sm text-muted-foreground">{t.message}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
