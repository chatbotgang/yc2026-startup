// Creates the Stripe customer that holds the shared stored-value balance.
// Usage: pnpm wallet:init  (reads STRIPE_SECRET_KEY from .env.local)
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) throw new Error("STRIPE_SECRET_KEY is not set in .env.local");
if (process.env.STRIPE_WALLET_CUSTOMER_ID) {
  console.log(`Already set: STRIPE_WALLET_CUSTOMER_ID=${process.env.STRIPE_WALLET_CUSTOMER_ID}`);
  process.exit(0);
}
const customer = await new Stripe(key).customers.create({
  name: "儲值金錢包",
  metadata: { purpose: "wallet" },
});
console.log(`Add this to .env.local:\nSTRIPE_WALLET_CUSTOMER_ID=${customer.id}`);
