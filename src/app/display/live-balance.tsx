"use client";

import { useEffect, useRef, useState } from "react";

type Snapshot = {
  balance: number;
  latest: { id: string; amount: number; created: number } | null;
};

const POLL_MS = 3_000;
const ANIMATE_MS = 1_200;
const twd = (n: number) => `NT$${Math.round(n).toLocaleString("zh-TW")}`;

export function LiveBalance({ initial }: { initial: Snapshot }) {
  const [target, setTarget] = useState(initial.balance);
  const [shown, setShown] = useState(initial.balance);
  const [flash, setFlash] = useState<{ key: string; amount: number } | null>(null);
  const [stale, setStale] = useState(false);
  const latestId = useRef(initial.latest?.id ?? null);
  const shownRef = useRef(initial.balance);

  // Poll the balance.
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
        if (data.latest && data.latest.id !== latestId.current) {
          latestId.current = data.latest.id;
          setFlash({ key: data.latest.id, amount: data.latest.amount });
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
      const eased = 1 - Math.pow(1 - t, 3);
      const value = from + (target - from) * eased;
      shownRef.current = value;
      setShown(value);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  // Hide the "+NT$…" badge after a few seconds.
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 4_000);
    return () => clearTimeout(id);
  }, [flash]);

  return (
    <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
      <p className="text-xl text-zinc-400 lg:text-2xl">當前儲值金</p>
      <p className="text-6xl font-semibold tabular-nums tracking-tight sm:text-7xl lg:text-9xl">
        {twd(shown)}
      </p>
      <div className="h-12">
        {flash && (
          <p
            key={flash.key}
            className="animate-[pop_0.4s_ease-out] rounded-full bg-emerald-500/15 px-5 py-2 text-2xl font-medium text-emerald-400 tabular-nums"
          >
            +{twd(flash.amount)} 剛剛儲值
          </p>
        )}
      </div>
      <p className={`text-sm ${stale ? "text-amber-400" : "text-zinc-600"}`}>
        {stale ? "連線中斷，重新連線中…" : "每 3 秒自動更新"}
      </p>
    </div>
  );
}
