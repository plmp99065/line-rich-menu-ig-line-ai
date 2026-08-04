interface Env {
  ASSETS: Fetcher;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  LINE_CHANNEL_SECRET?: string;
  LINE_CHANNEL_ACCESS_TOKEN?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://plmp99065.github.io",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: corsHeaders });

async function openAiDraft(request: Request, env: Env) {
  const input = await request.json<{ message?: string; context?: string }>();
  if (!input.message?.trim()) return json({ error: "訊息不可為空" }, 400);
  if (!env.OPENAI_API_KEY) {
    return json({ draft: "您好，感謝提供資訊！這個問題需要由人員確認，我先幫您轉交客服，確認後會盡快回覆您。" });
  }
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-5-mini",
      instructions: `你是「窩的家」倉鼠住宿客服助理。使用繁體中文，親切精準。空房、健康急症、退款與爭議一律轉人工，不可自行承諾。知識摘要：${input.context || "即時房況與高風險問題需人工確認。"}`,
      input: input.message,
      max_output_tokens: 220,
    }),
  });
  if (!response.ok) return json({ error: "AI 暫時無法回覆" }, 502);
  const result = await response.json<{ output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> }>();
  const draft = result.output_text || result.output?.flatMap(item => item.content || []).map(item => item.text || "").join("") || "需要人工確認。";
  return json({ draft });
}

async function verifyLine(body: string, signature: string | null, secret?: string) {
  if (!secret || !signature) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const expected = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return expected === signature;
}

async function lineWebhook(request: Request, env: Env) {
  const body = await request.text();
  if (!(await verifyLine(body, request.headers.get("x-line-signature"), env.LINE_CHANNEL_SECRET))) return json({ error: "Invalid signature" }, 401);
  const payload = JSON.parse(body) as { events?: Array<{ type: string; replyToken?: string; message?: { type: string; text?: string } }> };
  for (const event of payload.events || []) {
    if (event.type !== "message" || event.message?.type !== "text" || !event.replyToken || !env.LINE_CHANNEL_ACCESS_TOKEN) continue;
    const text = event.message.text || "";
    const highRisk = /生病|受傷|流血|急診|退款|客訴|爭議|空房|名額/.test(text);
    const reply = highRisk ? "這個問題需要由專人確認，我已為您轉交人工客服。" : "您好，已收到您的訊息，我們會盡快回覆您。";
    await fetch("https://api.line.me/v2/bot/message/reply", { method: "POST", headers: { Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ replyToken: event.replyToken, messages: [{ type: "text", text: reply }] }) });
  }
  return json({ ok: true });
}

async function publishRichMenu(request: Request, env: Env) {
  const input = await request.json<{ page?: string; actions?: unknown[] }>();
  if (!Array.isArray(input.actions) || input.actions.length !== 6) return json({ error: "需要六個按鈕設定" }, 400);
  if (!env.LINE_CHANNEL_ACCESS_TOKEN) return json({ ok: true, page: input.page, result: { demo: true } });
  return json({ ok: true, page: input.page, result: { demo: false, message: "LINE 憑證已連線；請於後台完成圖片上傳後發佈。" } });
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (url.pathname === "/api/health") return json({ ok: true, service: "wodejia-line-console", aiConfigured: Boolean(env.OPENAI_API_KEY), lineConfigured: Boolean(env.LINE_CHANNEL_SECRET && env.LINE_CHANNEL_ACCESS_TOKEN) });
    if (url.pathname === "/api/ai/draft" && request.method === "POST") return openAiDraft(request, env);
    if (url.pathname === "/api/line/webhook" && request.method === "POST") return lineWebhook(request, env);
    if (url.pathname === "/api/line/rich-menu/publish" && request.method === "POST") return publishRichMenu(request, env);
    return env.ASSETS.fetch(request);
  },
};
