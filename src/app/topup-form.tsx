"use client";

import { useActionState, useState } from "react";
import { startTopUp, type TopUpState } from "./actions";

const PRESETS = [100, 500, 1000, 3000];

export function TopUpForm({ min, max }: { min: number; max: number }) {
  const [state, action, pending] = useActionState<TopUpState, FormData>(startTopUp, {});
  const [amount, setAmount] = useState("500");

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setAmount(String(p))}
            className={`rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
              amount === String(p)
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black"
                : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
            }`}
          >
            {p.toLocaleString()}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">儲值金額（NT$）</span>
        <input
          name="amount"
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={1}
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-transparent px-3 py-2.5 text-lg tabular-nums outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-white"
        />
      </label>

      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-full bg-zinc-900 font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {pending ? "前往付款頁面…" : "用信用卡儲值"}
      </button>
      <p className="text-center text-xs text-zinc-500">付款由 Stripe 安全處理，本站不會接觸你的卡號</p>
    </form>
  );
}
