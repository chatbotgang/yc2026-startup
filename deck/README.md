# Share the Speed · 簡報網站

c0mpiled-18 YC Startup School Hackathon（台北）的現場簡報。單一 HTML，不需要建置。

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

滑鼠停 2.5 秒後，導覽列和語言切換會自動隱藏。

## Stripe 捐款 QR

把 Stripe Payment Link 貼進 index.html 最上方的 `window.DONATE_URL`，或在網址後面加 `?donate=<連結>`。沒填時那一頁會顯示提示。

## 素材與數據

- 照片與授權見 `assets/photos/CREDITS.txt`，簡報內轉為黑白，皆為示意。
- 頁面上列出的 NGO 是情境示例，尚未合作。
- 數據出處標在各頁下方（Google I/O、Microsoft AI Diffusion Report、內政部、警政署 165、農業部）。
