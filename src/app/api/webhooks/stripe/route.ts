import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { creditTopUp } from "@/lib/wallet";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) {
    return new Response("Webhook not configured", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const result = await creditTopUp(event.data.object.id);
      console.log(`[wallet] ${event.type} ${event.data.object.id}: ${result.status}`);
      break;
    }
    case "checkout.session.async_payment_failed":
      console.warn(`[wallet] async payment failed for ${event.data.object.id}`);
      break;
  }

  return Response.json({ received: true });
}
