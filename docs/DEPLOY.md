# 部署指南（Cloud Run）

給團隊成員看的：怎麼把這個 repo 部署到同一個 GCP 專案和 Cloud Run 服務。

## 環境一覽

| 項目 | 值 |
|---|---|
| GCP 組織 › 資料夾 | cresclab.com › `ycombinator` |
| GCP 專案 | `c0mpiled-18-yc-hackathon`（顯示名稱：c0mpiled-18 YC Hackathon） |
| Cloud Run 服務 | `yc2026-wallet` |
| 區域 | `asia-east1`（台灣） |
| 網址 | https://yc2026-wallet-310672118987.asia-east1.run.app |
| 執行身分 | `310672118987-compute@developer.gserviceaccount.com`（預設 compute service account） |
| GitHub | https://github.com/chatbotgang/yc2026-startup（`main` 分支） |
| Stripe | **live mode**（真的收款）：Crescendo Agent lab 帳號（US，入帳 USD，新台幣付款會換匯）。本機開發用 `.env.local` 的 `STRIPE_*` 測試環境，兩邊資料互不相通 |

### 服務的設定（已經設好，重新部署會沿用，不用再帶）

| 名稱 | 類型 | 來源 |
|---|---|---|
| `STRIPE_SECRET_KEY` | Secret Manager | `stripe-secret-key-live:latest` |
| `STRIPE_WEBHOOK_SECRET` | Secret Manager | `stripe-webhook-secret-live:latest` |
| `STRIPE_WALLET_CUSTOMER_ID` | 一般環境變數 | 儲值金所在的 Stripe customer ID |
| `STRIPE_PUBLISHABLE_KEY` | 一般環境變數 | 前端付款元件用的 publishable key（公開的，不是機密） |
| `STRIPE_PAYMENT_METHOD_CONFIG` | 一般環境變數 | 付款方式設定（只開信用卡、Apple Pay、Google Pay）；test / live 是不同的 ID |

公開存取（`allUsers` 有 `roles/run.invoker`）也已經設好，路人不用登入就能開。

## 權限

| 成員 | 權限 |
|---|---|
| kane.wei@cresclab.com | 專案 Editor ＋ `run-sources-c0mpiled-18-yc-hackathon-asia-east1` bucket 的 Storage Object Admin |
| kade.wang@cresclab.com | 專案 Editor ＋ `run-sources-c0mpiled-18-yc-hackathon-asia-east1` bucket 的 Storage Object Admin |

- Editor 可以部署、看 log、更新 Secret 的新版本。
- Editor **不能**讀 Secret 的值，也不能改 Cloud Run 的公開存取設定（這是刻意的）。
- `gcloud run deploy --source` 會先把原始碼上傳到上面那個 bucket，Editor 本身沒有上傳權限，所以兩人都另外加了 bucket 權限。之後新成員要部署也要比照加上。

## 第一次設定（只做一次）

```bash
# 1. 登入 gcloud（用公司帳號）
gcloud auth login
gcloud config set project c0mpiled-18-yc-hackathon
gcloud config set run/region asia-east1

# 2. 拿程式碼
git clone https://github.com/chatbotgang/yc2026-startup.git
cd yc2026-startup

# 3. 確認看得到服務
gcloud run services describe yc2026-wallet --format="value(status.url)"
```

推 code 到 GitHub 需要 `chatbotgang/yc2026-startup` 的寫入權限，沒有的話找 Mark 加。

## 部署

在 repo 根目錄執行：

```bash
gcloud run deploy yc2026-wallet \
  --project=c0mpiled-18-yc-hackathon \
  --region=asia-east1 \
  --source=. \
  --quiet
```

- 會用 repo 裡的 `Dockerfile` 在 Cloud Build 上建映像檔，約 3–5 分鐘。
- 環境變數、Secret、公開存取都會沿用上一版，**不要**加 `--allow-unauthenticated`（Editor 沒有權限改 IAM，加了會報錯）。
- 部署會上傳**你本機目前的檔案**（不是 GitHub 上的版本），請先 `git pull`、確認要部署的內容已經 commit。
- `.env*`、`node_modules`、`.next` 不會被上傳（見 `.gcloudignore`）。

### 部署後檢查

```bash
# 網頁有回應（應該是 200）
curl -s -o /dev/null -w "%{http_code}\n" https://yc2026-wallet-310672118987.asia-east1.run.app/

# 看最近的 log（入帳成功會有 "[wallet] ... credited"）
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="yc2026-wallet"' \
  --project=c0mpiled-18-yc-hackathon --freshness=30m --limit=20 \
  --format="value(timestamp,textPayload,httpRequest.status)"
```

再用測試卡實際刷一筆：`4242 4242 4242 4242`，到期日填任意未來日期，CVC 任意 3 碼。付完應該跳回首頁顯示「付款成功」，當前儲值金增加。

### 出問題時

```bash
# 列出版本，找到上一個正常的 revision
gcloud run revisions list --service=yc2026-wallet --region=asia-east1

# 把流量切回上一版
gcloud run services update-traffic yc2026-wallet --region=asia-east1 --to-revisions=<REVISION名稱>=100

# 建置失敗：看 Cloud Build log
gcloud builds list --region=asia-east1 --limit=3
gcloud builds log <BUILD_ID> --region=asia-east1
```

## 新增或修改環境變數

```bash
# 一般環境變數
gcloud run services update yc2026-wallet --region=asia-east1 --update-env-vars=KEY=value

# 機密值：先放 Secret Manager，再掛到服務上
printf '%s' '<值>' | gcloud secrets create <secret名稱> --data-file=-
gcloud secrets add-iam-policy-binding <secret名稱> \
  --member=serviceAccount:310672118987-compute@developer.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
gcloud run services update yc2026-wallet --region=asia-east1 --update-secrets=KEY=<secret名稱>:latest
```

更換既有 secret 的值：`printf '%s' '<新值>' | gcloud secrets versions add <secret名稱> --data-file=-`，然後重新部署或執行一次 `gcloud run services update` 讓新版本生效。

> 註：替 secret 加 IAM（`add-iam-policy-binding`）需要 Secret Manager Admin，Editor 做不到，這一步請找 Mark。

## 本機開發

照 [README](../README.md#本機開發) 操作。本機需要自己的 Stripe test key：到 Stripe Dashboard（Crescendo Agent lab 帳號）切到 test mode，Developers → API keys 建一把 restricted key，填進 `.env.local`。`STRIPE_WALLET_CUSTOMER_ID` 跟線上用同一個即可（值可用下面指令查），這樣本機和線上看到的是同一個儲值金。

```bash
gcloud run services describe yc2026-wallet --region=asia-east1 \
  --format="value(spec.template.spec.containers[0].env)"
```

**不要把任何 key 寫進程式碼或 commit。** `.env.local` 已在 `.gitignore`。

## Stripe 相關

- 線上的 webhook endpoint（test mode）：`https://yc2026-wallet-310672118987.asia-east1.run.app/api/webhooks/stripe`，監聽 `payment_intent.succeeded`、`payment_intent.payment_failed`。
- Apple Pay 需要註冊網域（Stripe Payment method domains），換網址時要重新註冊。
- **線上是 live mode，會收真錢。** 退款/爭議款不會自動從儲值金扣回（刻意不做），需要時到 Stripe 後台手動調整儲值金 customer 的餘額。
- 測試請在本機用 test key（`.env.local` 的 `STRIPE_*`），不要在線上用測試卡（會被拒）。

## 頁面

| 路徑 | 內容 |
|---|---|
| `/` | 簡報 deck（同 `/display`） |
| `/pay` | 付款頁（Apple Pay / Google Pay / 信用卡） |
| `/live` | 即時看板 |
| `/api/balance` | 公開的餘額 JSON（deck 和看板讀這個） |

QR code 目前指向 Cloud Run 的 `/pay`；`ngo.cresclab.com` 可用後，改 `scripts/sync-deck.mjs`、`public/deck/index.html`、`src/app/live/page.tsx` 三處網址。
