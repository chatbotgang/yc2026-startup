"use client";

import { useEffect, useRef, useState } from "react";

type TopUp = { id: string; amount: number; created: number; name: string; message: string };
type Snapshot = { balance: number; recent: TopUp[] };

const POLL_MS = 3_000;
const ANIMATE_MS = 1_200;
const FLASH_MS = 6_000;
const twd = (n: number) => `NT$${Math.round(n).toLocaleString("en-US")}`;

export function LiveBalance({ initial, qr }: { initial: Snapshot | null; qr: React.ReactNode }) {
  const [target, setTarget] = useState(initial?.balance ?? 0);
  const [shown, setShown] = useState(initial?.balance ?? 0);
  const [recent, setRecent] = useState(initial?.recent ?? []);
  const [flash, setFlash] = useState<TopUp | null>(null);
  const [stale, setStale] = useState(initial === null);
  const latestId = useRef(initial?.recent[0]?.id ?? null);
  const shownRef = useRef(initial?.balance ?? 0);
  // Without a server snapshot, the first successful poll is the baseline, not a new gift.
  const seeded = useRef(initial !== null);

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
        setRecent(data.recent);
        const newest = data.recent[0];
        if (!seeded.current) {
          seeded.current = true;
          latestId.current = newest?.id ?? null;
          shownRef.current = data.balance;
          setShown(data.balance);
          setTarget(data.balance);
          return;
        }
        setTarget(data.balance);
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
    <div className="relative grid w-full max-w-[1300px] flex-1 grid-cols-1 items-center gap-[5vw] px-6 pt-20 pb-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      {/* Balance + newest sponsor */}
      <div className="flex min-w-0 flex-col items-center gap-[2.6vh] text-center lg:items-start lg:text-left">
        <p className="font-mono text-[clamp(12px,1vw,16px)] tracking-[.14em] text-[#6e7277] uppercase">
          AI donated tonight
        </p>
        <p className="animate-[amount-glow_3.6s_ease-in-out_infinite] bg-[linear-gradient(100deg,#4586f0_10%,#8fb8ff_90%)] bg-clip-text text-[clamp(56px,7.5vw,150px)] leading-[.9] font-light tracking-[-0.05em] text-transparent tabular-nums motion-reduce:animate-none">
          {twd(shown)}
        </p>
        <p className="max-w-[30em] text-[clamp(17px,1.55vw,28px)] leading-snug text-balance text-[#a1a4a8]">
          Every gift keeps an NGO&rsquo;s AI agent answering the people who need it most.
        </p>
        <div className="flex min-h-32 w-full max-w-xl items-start justify-center lg:justify-start">
          {flash && (
            <div
              key={flash.id}
              className="animate-[pop_0.4s_ease-out] rounded-[24px] border border-[#4586f0] bg-[#0c1830] bg-[radial-gradient(120%_90%_at_100%_0%,rgb(143_184_255/0.30),transparent_60%)] px-6 py-4 text-left"
            >
              <p className="font-mono text-[clamp(11px,.9vw,15px)] tracking-[.1em] text-[#8fb8ff] uppercase">
                Just donated
              </p>
              <p className="mt-1 text-[clamp(20px,2vw,34px)] font-normal">
                <span className="break-words">{flash.name}</span>
                <span className="ml-3 font-light text-[#8fb8ff] tabular-nums">+{twd(flash.amount)}</span>
              </p>
              {flash.message && (
                <p className="mt-1 break-words text-[clamp(16px,1.4vw,24px)] text-[#a1a4a8]">&ldquo;{flash.message}&rdquo;</p>
              )}
            </div>
          )}
        </div>
        <p className={`font-mono text-[clamp(11px,.85vw,14px)] ${stale ? "text-[#f0b8cf]" : "text-[#6e7277]"}`}>
          {stale ? "Connection lost. Reconnecting…" : "Live · updates every 3 seconds"}
        </p>
      </div>

      {/* QR + sponsor feed */}
      <div className="flex min-w-0 flex-col items-center gap-8">
        {qr}
        {recent.length > 0 && (
          <ul className="flex w-full max-w-md flex-col gap-2">
            {recent.map((t, i) => (
              <li key={t.id} className="rounded-2xl border border-[#24272b] bg-[#111214] px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`size-2 shrink-0 rounded-full border-[1.5px] ${i === 0 ? "border-[#4586f0] bg-[#4586f0]" : "border-[#6e7277]"}`}
                    />
                    <span className="truncate font-normal">{t.name}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[#8fb8ff] tabular-nums">+{twd(t.amount)}</span>
                </div>
                {t.message && <p className="mt-0.5 pl-[18px] break-words text-sm text-[#a1a4a8]">{t.message}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
