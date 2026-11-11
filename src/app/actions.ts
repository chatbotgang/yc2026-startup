"use server";

import { redirect } from "next/navigation";
import {
  CURRENCY,
  INTEGRATION_ID,
  MAX_TOPUP,
  MIN_TOPUP,
  MESSAGE_MAX,
  MINOR_UNITS,
  NAME_MAX,
  TOPUP_PURPOSE,
  cleanText,
  stripe,
} from "@/lib/stripe";
import { siteOrigin } from "@/lib/origin";

export type TopUpState = { error?: string };

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

  const name = cleanText(formData.get("name"), NAME_MAX);
  const message = cleanText(formData.get("message"), MESSAGE_MAX);

  const origin = await siteOrigin();
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: CURRENCY,
          unit_amount: amount * MINOR_UNITS,
          product_data: {
            name: "儲值金贊助",
            description: [name || "匿名贊助者", message && `「${message}」`].filter(Boolean).join(" "),
          },
        },
      },
    ],
    metadata: { purpose: TOPUP_PURPOSE, sponsor_name: name, sponsor_message: message },
    payment_intent_data: { metadata: { purpose: TOPUP_PURPOSE } },
    integration_identifier: INTEGRATION_ID,
    submit_type: "donate",
    // Card + Apple Pay + Google Pay only (no Link). Per-mode config ID, see .env.example.
    ...(process.env.STRIPE_PAYMENT_METHOD_CONFIG && {
      payment_method_configuration: process.env.STRIPE_PAYMENT_METHOD_CONFIG,
    }),
    branding_settings: {
      button_color: "#059669",
      border_style: "rounded",
      font_family: "noto_sans",
    },
    custom_text: {
      submit: { message: "謝謝你的贊助！付款完成後，你的名字和留言會出現在看板上。" },
    },
    success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?canceled=1`,
  });

  if (!session.url) return { error: "無法建立付款頁面，請稍後再試" };
  redirect(session.url);
}
