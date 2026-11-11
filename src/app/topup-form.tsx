"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe, type Stripe, type StripeElementsOptions } from "@stripe/stripe-js";
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { CreditCard, Loader2, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createTopUpPayment } from "./actions";

const PRESETS = [100, 500, 1000, 3000];
const ANONYMOUS = "Anonymous";

type Limits = { min: number; max: number; nameMax: number; messageMax: number };

let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = (key: string) => (stripePromise ??= loadStripe(key));

export function TopUpForm({
  publishableKey,
  paymentMethodConfiguration,
  ...limits
}: Limits & { publishableKey: string | null; paymentMethodConfiguration: string | null }) {
  const [amount, setAmount] = useState("500");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const amountNumber = Number(amount);
  const amountValid =
    Number.isInteger(amountNumber) && amountNumber >= limits.min && amountNumber <= limits.max;
  // Stripe needs a positive amount to render wallets; keep the last valid value while typing.
  const [elementsAmount, setElementsAmount] = useState(500);
  if (amountValid && amountNumber !== elementsAmount) setElementsAmount(amountNumber);

  const options = useMemo<StripeElementsOptions>(
    () => ({
      mode: "payment",
      amount: elementsAmount * 100,
      currency: "twd",
      ...(paymentMethodConfiguration && { paymentMethodConfiguration }),
      appearance: {
        theme: "stripe",
        variables: {
          colorPrimary: "#059669",
          borderRadius: "8px",
          fontFamily: '"Geist", system-ui, sans-serif',
          spacingUnit: "4px",
        },
      },
      locale: "en",
    }),
    [elementsAmount, paymentMethodConfiguration],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Make a contribution</CardTitle>
        <CardDescription>Pick an amount and leave your name and a message for the live board.</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {/* Amount */}
        <div className="flex flex-col gap-3">
          <Label htmlFor="amount">Amount</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            size="lg"
            spacing={2}
            value={PRESETS.includes(amountNumber) ? amount : ""}
            onValueChange={(v) => v && setAmount(v)}
            className="grid w-full grid-cols-4"
          >
            {PRESETS.map((p) => (
              <ToggleGroupItem
                key={p}
                value={String(p)}
                className="h-11 font-mono tabular-nums data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
              >
                {p.toLocaleString("en-US")}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
              NT$
            </span>
            <Input
              id="amount"
              type="number"
              inputMode="numeric"
              min={limits.min}
              max={limits.max}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-11 pl-11 font-mono text-base tabular-nums"
              aria-invalid={!amountValid}
            />
          </div>
          <p className={`text-xs ${amountValid ? "text-muted-foreground" : "text-destructive"}`}>
            Custom amount: NT${limits.min.toLocaleString("en-US")}–{limits.max.toLocaleString("en-US")}
          </p>
        </div>

        {/* Donor name */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">
            Donor name<span className="font-normal text-muted-foreground"> (optional)</span>
          </Label>
          <Input
            id="name"
            maxLength={limits.nameMax}
            autoComplete="nickname"
            placeholder={ANONYMOUS}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11"
          />
        </div>

        {/* Message */}
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="message">
              Message<span className="font-normal text-muted-foreground"> (optional)</span>
            </Label>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {Array.from(message).length}/{limits.messageMax}
            </span>
          </div>
          <Textarea
            id="message"
            rows={2}
            maxLength={limits.messageMax}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Good luck!"
            className="resize-none"
          />
        </div>

        {/* Payment */}
        {publishableKey ? (
          <Elements stripe={getStripe(publishableKey)} options={options}>
            <PayButtons amount={amountValid ? amountNumber : null} name={name} message={message} />
          </Elements>
        ) : (
          <Alert>
            <AlertDescription>Payments are not configured (missing STRIPE_PUBLISHABLE_KEY).</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function PayButtons({
  amount,
  name,
  message,
}: {
  amount: number | null;
  name: string;
  message: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [walletsReady, setWalletsReady] = useState<boolean | null>(null);
  const label = amount ? `NT$${amount.toLocaleString("en-US")}` : "";
  const donor = name.trim() || ANONYMOUS;

  async function pay() {
    if (!stripe || !elements || !amount) return;
    setError(null);
    setPending(true);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) throw new Error(submitError.message);

      const created = await createTopUpPayment({ amount, name, message });
      if (!created.ok) throw new Error(created.error);

      const returnUrl = `${window.location.origin}/`;
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        clientSecret: created.clientSecret,
        redirect: "if_required",
        confirmParams: {
          return_url: returnUrl,
          // The card form doesn't ask for these; the donor name doubles as cardholder name.
          payment_method_data: {
            billing_details: {
              name: donor,
              email: null,
              phone: null,
              address: {
                country: "TW",
                postal_code: null,
                state: null,
                city: null,
                line1: null,
                line2: null,
              },
            },
          },
        },
      });
      if (confirmError) throw new Error(confirmError.message);

      router.push(`/?payment_intent=${created.paymentIntentId}`);
      setPending(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Apple Pay / Google Pay */}
      <div className={walletsReady === false ? "hidden" : ""}>
        <ExpressCheckoutElement
          options={{
            buttonHeight: 48,
            buttonType: { applePay: "donate", googlePay: "donate" },
            paymentMethods: { applePay: "always", googlePay: "always", link: "never" },
            paymentMethodOrder: ["apple_pay", "google_pay"],
            layout: { maxColumns: 1, maxRows: 2, overflow: "never" },
          }}
          onReady={({ availablePaymentMethods }) => setWalletsReady(Boolean(availablePaymentMethods))}
          onClick={({ resolve }) => {
            if (!amount) return setError("Please enter a valid amount first.");
            resolve({ lineItems: [{ name: `Contribution (${donor})`, amount: amount * 100 }] });
          }}
          onConfirm={pay}
        />
      </div>

      {walletsReady !== false && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or pay with card
          <span className="h-px flex-1 bg-border" />
        </div>
      )}

      {/* Card: number, expiry and CVC only */}
      <PaymentElement
        options={{
          layout: "tabs",
          wallets: { applePay: "never", googlePay: "never", link: "never" },
          fields: {
            billingDetails: { name: "never", email: "never", phone: "never", address: "never" },
          },
          terms: { card: "never" },
        }}
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        type="button"
        size="lg"
        onClick={pay}
        disabled={!stripe || !amount || pending}
        className="h-12 w-full text-base"
      >
        {pending ? (
          <>
            <Loader2 className="animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <CreditCard />
            {label ? `Pay ${label} with card` : "Pay with card"}
          </>
        )}
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="size-3" />
        Payments are processed securely by Stripe. We never see your card number.
      </p>
    </div>
  );
}
