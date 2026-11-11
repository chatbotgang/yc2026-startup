import "server-only";
import Stripe from "stripe";
import { CURRENCY, MINOR_UNITS, TOPUP_PURPOSE, stripe, walletCustomerId } from "./stripe";

/**
 * The stored-value balance lives in Stripe as the wallet customer's credit balance
 * (customer.balance; negative = credit). Stripe is the ledger, so no database is needed.
 */
export async function getWallet() {
  const s = stripe();
  const id = walletCustomerId();
  const [customer, txns] = await Promise.all([
    s.customers.retrieve(id),
    s.customers.listBalanceTransactions(id, { limit: 10 }),
  ]);
  if (customer.deleted) throw new Error(`Wallet customer ${id} was deleted`);

  return {
    balance: -customer.balance / MINOR_UNITS || 0, // avoid "-0"
    currency: customer.currency ?? CURRENCY,
    recent: txns.data.map((t) => ({
      id: t.id,
      amount: -t.amount / MINOR_UNITS,
      created: t.created,
      description: t.description,
    })),
  };
}

export type CreditResult =
  | { status: "credited"; amount: number }
  | { status: "already_credited"; amount: number }
  | { status: "not_paid" }
  | { status: "ignored" };

/**
 * Credit a paid top-up Checkout Session to the wallet. Safe to call many times for the
 * same session (webhook retries + success page): the PaymentIntent records which
 * balance transaction it produced, and the Stripe idempotency key covers concurrent calls.
 */
export async function creditTopUp(sessionId: string): Promise<CreditResult> {
  const s = stripe();
  const session = await s.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });

  if (session.metadata?.purpose !== TOPUP_PURPOSE) return { status: "ignored" };
  if (session.payment_status === "unpaid") return { status: "not_paid" };

  const pi = session.payment_intent as Stripe.PaymentIntent | null;
  const amountMinor = session.amount_total;
  if (!pi || amountMinor == null) throw new Error(`Session ${sessionId} has no payment`);
  const amount = amountMinor / MINOR_UNITS;

  if (pi.metadata.wallet_credit_txn) return { status: "already_credited", amount };

  let txn: Stripe.CustomerBalanceTransaction;
  try {
    txn = await s.customers.createBalanceTransaction(
      walletCustomerId(),
      {
        amount: -amountMinor, // negative = credit
        currency: session.currency ?? CURRENCY,
        description: `儲值 ${session.customer_details?.email ?? ""}`.trim(),
        metadata: { checkout_session: session.id, payment_intent: pi.id },
      },
      { idempotencyKey: `wallet-credit-${session.id}` },
    );
  } catch (err) {
    // Another call for this session is in flight right now; it will finish the credit.
    if (err instanceof Stripe.errors.StripeIdempotencyError) {
      return { status: "already_credited", amount };
    }
    throw err;
  }

  await s.paymentIntents.update(pi.id, {
    metadata: { wallet_credit_txn: txn.id },
  });
  return { status: "credited", amount };
}

export type WalletSnapshot = {
  balance: number;
  latest: { id: string; amount: number; created: number } | null;
};

let snapshot: { at: number; value: Promise<WalletSnapshot> } | null = null;
const SNAPSHOT_TTL_MS = 2_000;

/**
 * Balance for the live display. Many screens poll this every few seconds, so each
 * server instance reuses one Stripe read for up to 2s instead of one per request.
 */
export function getWalletSnapshot(): Promise<WalletSnapshot> {
  const now = Date.now();
  if (!snapshot || now - snapshot.at > SNAPSHOT_TTL_MS) {
    const value = getWallet().then((w) => ({
      balance: w.balance,
      latest: w.recent[0]
        ? { id: w.recent[0].id, amount: w.recent[0].amount, created: w.recent[0].created }
        : null,
    }));
    value.catch(() => {
      snapshot = null; // don't keep serving a failed read
    });
    snapshot = { at: now, value };
  }
  return snapshot.value;
}
