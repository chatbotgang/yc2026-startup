"use client";

import { useActionState, useState } from "react";
import { CreditCard, Loader2, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { startTopUp, type TopUpState } from "./actions";

const PRESETS = [100, 500, 1000, 3000];

export function TopUpForm({
  min,
  max,
  nameMax,
  messageMax,
}: {
  min: number;
  max: number;
  nameMax: number;
  messageMax: number;
}) {
  const [state, action, pending] = useActionState<TopUpState, FormData>(startTopUp, {});
  const [amount, setAmount] = useState("500");
  const [message, setMessage] = useState("");
  const amountNumber = Number(amount);
  const amountLabel =
    Number.isInteger(amountNumber) && amountNumber >= min && amountNumber <= max
      ? `NT$${amountNumber.toLocaleString("zh-TW")}`
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">贊助儲值</CardTitle>
        <CardDescription>選擇金額，留下名字和想說的話，會顯示在看板上。</CardDescription>
      </CardHeader>

      <form action={action}>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <Label htmlFor="amount">金額</Label>
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
                  {p.toLocaleString("zh-TW")}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                NT$
              </span>
              <Input
                id="amount"
                name="amount"
                type="number"
                inputMode="numeric"
                min={min}
                max={max}
                step={1}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-11 pl-11 font-mono text-base tabular-nums"
                aria-describedby="amount-hint"
              />
            </div>
            <p id="amount-hint" className="text-xs text-muted-foreground">
              自訂金額 NT${min.toLocaleString("zh-TW")}–{max.toLocaleString("zh-TW")}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">
              你的名字
              <span className="font-normal text-muted-foreground">（選填）</span>
            </Label>
            <Input
              id="name"
              name="name"
              maxLength={nameMax}
              autoComplete="nickname"
              placeholder="匿名贊助者"
              className="h-11"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="message">
                想說的話
                <span className="font-normal text-muted-foreground">（選填）</span>
              </Label>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {Array.from(message).length}/{messageMax}
              </span>
            </div>
            <Textarea
              id="message"
              name="message"
              rows={3}
              maxLength={messageMax}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="加油！"
              className="resize-none"
            />
          </div>

          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="mt-6 flex flex-col gap-3">
          <Button type="submit" size="lg" disabled={pending} className="h-12 w-full text-base">
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                前往付款頁面…
              </>
            ) : (
              <>
                <CreditCard />
                {amountLabel ? `用信用卡贊助 ${amountLabel}` : "用信用卡贊助"}
              </>
            )}
          </Button>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3" />
            付款由 Stripe 安全處理，本站不會接觸你的卡號
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
