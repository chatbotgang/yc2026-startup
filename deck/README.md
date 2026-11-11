# Share the Speed · 簡報網站

c0mpiled-18 YC Startup School Hackathon（台北）的現場簡報。單一 HTML，不需要建置。

## 線上版

https://share-the-speed.vercel.app （Vercel，Kade 個人帳號 kaddwangs-projects，專案 share-the-speed）

更新線上版：把 deck/ 的內容複製到一個乾淨資料夾，在那裡執行 `vercel deploy --prod --yes --name share-the-speed`。

## 打開

```bash
cd deck && python3 -m http.server 4620
```

然後開 http://127.0.0.1:4620 。直接雙擊 index.html 也可以，但有些瀏覽器會擋本機圖片。

## 現場操作

| 按鍵 | 作用 |
|---|---|
| ↓ / → / 空白鍵 | 下一頁 |
| ↑ / ← | 上一頁 |
| L | 切換中文／英文 |
| S | Impact Console 觸發「贊助恢復」 |
| F | 全螢幕（右下角也有按鈕） |

滑鼠停 2.5 秒後，導覽列和語言切換會自動隱藏。

## Stripe 捐款 QR

預設指向本 repo 的儲值頁（Cloud Run：https://yc2026-wallet-310672118987.asia-east1.run.app ，目前是 Stripe test mode）。要換連結，改 index.html 最上方的 `window.DONATE_URL`，或在網址後面加 `?donate=<連結>`。

## 素材與數據

- 照片與授權見 `assets/photos/CREDITS.txt`，簡報內轉為黑白，皆為示意。
- 頁面上列出的 NGO 是情境示例，尚未合作。
- 數據出處標在各頁下方（Google I/O、Microsoft AI Diffusion Report、內政部、警政署 165、農業部）。
