"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  CURRENCY,
  INTEGRATION_ID,
  MAX_TOPUP,
  MIN_TOPUP,
  MINOR_UNITS,
  TOPUP_PURPOSE,
  stripe,
} from "@/lib/stripe";

export type TopUpState = { error?: string };

async function siteOrigin(): Promise<string> {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function startTopUp(
  _prev: TopUpState,
  formData: FormData,
): Promise<TopUpState> {
  const amount = Number(formData.get("amount"));
  if (!Number.isInteger(amount) || amount < MIN_TOPUP || amount > MAX_TOPUP) {
    return {
      error: `請輸入 NT$${MIN_TOPUP.toLocaleString()} 到 NT$${MAX_TOPUP.toLocaleString()} 之間的整數金額`,
    };
  }

  const origin = await siteOrigin();
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: CURRENCY,
          unit_amount: amount * MINOR_UNITS,
          product_data: { name: "儲值金" },
        },
      },
    ],
    metadata: { purpose: TOPUP_PURPOSE },
    payment_intent_data: { metadata: { purpose: TOPUP_PURPOSE } },
    integration_identifier: INTEGRATION_ID,
    success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?canceled=1`,
  });

  if (!session.url) return { error: "無法建立付款頁面，請稍後再試" };
  redirect(session.url);
}
