"use server";

import {
  ANONYMOUS,
  CURRENCY,
  MAX_TOPUP,
  MESSAGE_MAX,
  MIN_TOPUP,
  MINOR_UNITS,
  NAME_MAX,
  TOPUP_PURPOSE,
  cleanText,
  stripe,
} from "@/lib/stripe";

export type CreatePaymentResult =
  | { ok: true; clientSecret: string; paymentIntentId: string }
  | { ok: false; error: string };

/**
 * Create the PaymentIntent for a top-up. Called by the on-page payment form right before
 * it confirms the payment (card, Apple Pay or Google Pay). The wallet is credited by the
 * webhook / return page once the payment succeeds, never here.
 */
export async function createTopUpPayment(input: {
  amount: number;
  name: string;
  message: string;
}): Promise<CreatePaymentResult> {
  const amount = Number(input.amount);
  if (!Number.isInteger(amount) || amount < MIN_TOPUP || amount > MAX_TOPUP) {
    return {
      ok: false,
      error: `Enter a whole amount between NT$${MIN_TOPUP.toLocaleString("en-US")} and NT$${MAX_TOPUP.toLocaleString("en-US")}.`,
    };
  }
  const name = cleanText(input.name, NAME_MAX);
  const message = cleanText(input.message, MESSAGE_MAX);

  try {
    const pi = await stripe().paymentIntents.create({
      amount: amount * MINOR_UNITS,
      currency: CURRENCY,
      description: `Contribution: ${name || ANONYMOUS}`,
      metadata: { purpose: TOPUP_PURPOSE, sponsor_name: name, sponsor_message: message },
      // Card + Apple Pay + Google Pay only (no Link). Per-mode config ID, see .env.example.
      ...(process.env.STRIPE_PAYMENT_METHOD_CONFIG && {
        payment_method_configuration: process.env.STRIPE_PAYMENT_METHOD_CONFIG,
      }),
    });
    if (!pi.client_secret) throw new Error("PaymentIntent has no client_secret");
    return { ok: true, clientSecret: pi.client_secret, paymentIntentId: pi.id };
  } catch (err) {
    console.error("[wallet] create payment failed", err);
    return { ok: false, error: "Could not start the payment. Please try again." };
  }
}
