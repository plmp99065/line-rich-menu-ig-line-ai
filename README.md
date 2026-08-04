# 窩的家 LINE 客服管理後台

可執行的 Next.js 全端 MVP，整合兩頁式 Rich Menu、LINE 客服收件匣、OpenAI 回覆草稿、人工接手、知識庫與數據分析。

## 已完成

- 六格＋底部分頁的兩頁 Rich Menu 編輯與預覽
- URL、傳送文字、分頁切換三種按鈕動作
- LINE Webhook 簽章驗證與文字回覆
- AI 回覆草稿與高風險問題轉人工規則
- 對話列表、人工接手、標籤、備註與訂單提醒
- 知識庫文件上傳介面與索引狀態
- 客服 KPI 與熱門問題分析介面
- Supabase/PostgreSQL schema、索引與多租戶 RLS
- 桌面及手機響應式版面

## 本機執行

```powershell
npm.cmd install
npm.cmd run dev
```

開啟 `http://localhost:3000`。

## 環境變數

複製 `.env.example` 的欄位到不進版控的 `.env.local`：

- `OPENAI_API_KEY`：AI 草稿（目前已安全設定）
- `OPENAI_MODEL`：預設 `gpt-5-mini`
- `LINE_CHANNEL_SECRET`：驗證 Webhook 簽章
- `LINE_CHANNEL_ACCESS_TOKEN`：回覆訊息與發佈 Rich Menu
- `NEXT_PUBLIC_APP_URL`：部署後公開網址

## API

- `GET /api/health`：服務與憑證狀態
- `POST /api/ai/draft`：產生 AI 客服草稿
- `POST /api/line/webhook`：LINE Messaging API Webhook
- `POST /api/line/rich-menu/publish`：建立 Rich Menu 結構

## 上線步驟

1. 在 Supabase SQL Editor 執行 `supabase/schema.sql`。
2. 將 LINE Channel Secret 與 Access Token 寫入部署平台的伺服器環境變數。
3. 部署 Next.js，將 `https://你的網域/api/line/webhook` 設為 LINE Webhook。
4. 在後台上傳兩張 2500 × 1686 圖片，確認八個點擊區域後發佈。
5. 初期保持「AI 草稿模式」，穩定後才開啟允許範圍內的自動回覆。

目前介面以本機示範資料運作；接上 Supabase 專案後，將 client state 改由上述資料表與即時訂閱提供即可。LINE 正式發佈另需完成圖片內容上傳、兩個 Rich Menu Alias 建立與預設選單設定。
