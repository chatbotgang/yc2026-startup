import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/** Lazily create the Stripe client so builds don't need the secret key. */
export function stripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set (see .env.example)");
    client = new Stripe(key, {
      appInfo: { name: "yc2026-startup-wallet" },
    });
  }
  return client;
}

export function walletCustomerId(): string {
  const id = process.env.STRIPE_WALLET_CUSTOMER_ID;
  if (!id) {
    throw new Error(
      "STRIPE_WALLET_CUSTOMER_ID is not set. Run `pnpm wallet:init` to create the wallet customer.",
    );
  }
  return id;
}

/** Stored-value currency. TWD is a two-decimal currency in the Stripe API (NT$1 = 100). */
export const CURRENCY = "twd";
export const MINOR_UNITS = 100;
export const MIN_TOPUP = 50; // NT$
export const MAX_TOPUP = 100_000; // NT$

/** Tag for Checkout Sessions created by this flow (shows up in the Stripe Dashboard). */
export const INTEGRATION_ID = "wallet-topup-qhvmrtzk";
export const TOPUP_PURPOSE = "wallet_topup";

export const NAME_MAX = 20;
export const MESSAGE_MAX = 60;
export const ANONYMOUS = "匿名贊助者";

/** Trim, drop control characters/newlines, collapse spaces, cap length (by characters). */
export function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const text = value
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return Array.from(text).slice(0, max).join("");
}
