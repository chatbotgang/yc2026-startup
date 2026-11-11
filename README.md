# yc2026-startup

儲值金頁面：任何人都能用信用卡（Stripe Checkout）為同一個帳戶儲值，頁面即時顯示當前金額。

## 運作方式

- **付款**：`src/app/actions.ts` 建立 Stripe Checkout Session，跳轉到 Stripe 付款頁（新台幣，NT$50–100,000）。
- **入帳**：`src/app/api/webhooks/stripe/route.ts` 收到 `checkout.session.completed` / `async_payment_succeeded` 後呼叫 `creditTopUp()`；付款後跳回首頁也會呼叫一次作為備援。同一筆付款只會入帳一次。
- **金額存放**：儲值金是一個 Stripe Customer 的 credit balance（`src/lib/wallet.ts`），Stripe 本身就是帳本，不需要資料庫。

## 本機開發

```bash
pnpm install
cp .env.example .env.local      # 填入 STRIPE_SECRET_KEY（test mode 的 sk_test_ / rk_test_）
pnpm wallet:init                # 建立儲值金 customer，把印出的 ID 填入 STRIPE_WALLET_CUSTOMER_ID

# 另開一個終端機：把 Stripe 事件轉到本機，並把印出的 whsec_ 填入 STRIPE_WEBHOOK_SECRET
stripe listen --api-key "$STRIPE_SECRET_KEY" --forward-to localhost:3000/api/webhooks/stripe

pnpm dev
```

測試卡：`4242 4242 4242 4242`，任意未來到期日與 CVC。

## 上線前待辦

- 在 Stripe Dashboard 建立正式 webhook endpoint（`/api/webhooks/stripe`），設定 `STRIPE_WEBHOOK_SECRET`。
- 處理退款與爭議款（`charge.refunded`、`charge.dispute.created`），從儲值金扣回。
