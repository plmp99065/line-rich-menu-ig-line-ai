interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  ADMIN_ACCESS_CODE?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  LINE_CHANNEL_SECRET?: string;
  LINE_CHANNEL_ACCESS_TOKEN?: string;
  CONFIG_ENCRYPTION_KEY?: string;
}

type CredentialName = "OPENAI_API_KEY" | "LINE_CHANNEL_SECRET" | "LINE_CHANNEL_ACCESS_TOKEN";
const credentialNames: CredentialName[] = ["OPENAI_API_KEY", "LINE_CHANNEL_SECRET", "LINE_CHANNEL_ACCESS_TOKEN"];

type StoredConversation = Record<string, unknown> & {
  id?: string;
  lineUserId?: string;
  messages?: unknown[];
  unread?: number;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://plmp99065.github.io",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Code, X-Device-Id",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
};

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: corsHeaders });

function isAuthorized(request: Request, env: Env) {
  return Boolean(env.ADMIN_ACCESS_CODE) && request.headers.get("x-admin-code") === env.ADMIN_ACCESS_CODE;
}

function envCredential(env: Env, name: CredentialName) {
  if (name === "OPENAI_API_KEY") return env.OPENAI_API_KEY;
  if (name === "LINE_CHANNEL_SECRET") return env.LINE_CHANNEL_SECRET;
  return env.LINE_CHANNEL_ACCESS_TOKEN;
}

function decodeBase64(value: string) {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0));
}

function encodeBase64(value: Uint8Array) {
  return btoa(String.fromCharCode(...value));
}

async function encryptionKey(env: Env) {
  if (!env.CONFIG_ENCRYPTION_KEY) throw new Error("伺服器尚未設定加密金鑰");
  const raw = decodeBase64(env.CONFIG_ENCRYPTION_KEY);
  if (raw.byteLength !== 32) throw new Error("伺服器加密金鑰格式錯誤");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptCredential(env: Env, value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(env), new TextEncoder().encode(value));
  return { encryptedValue: encodeBase64(new Uint8Array(encrypted)), iv: encodeBase64(iv) };
}

async function getCredential(env: Env, name: CredentialName) {
  const row = await env.DB.prepare("SELECT encrypted_value AS encryptedValue, iv FROM integration_secrets WHERE name = ?").bind(name).first<{ encryptedValue: string; iv: string }>();
  if (!row) return envCredential(env, name);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decodeBase64(row.iv) }, await encryptionKey(env), decodeBase64(row.encryptedValue));
  return new TextDecoder().decode(decrypted);
}

async function credentialStatus(env: Env, name: CredentialName) {
  if (envCredential(env, name)) return true;
  const row = await env.DB.prepare("SELECT 1 AS present FROM integration_secrets WHERE name = ?").bind(name).first();
  return Boolean(row);
}

async function lineApi(env: Env, path: string, init: RequestInit = {}) {
  const accessToken = await getCredential(env, "LINE_CHANNEL_ACCESS_TOKEN");
  if (!accessToken) return new Response("LINE token missing", { status: 503 });
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(`https://api.line.me${path}`, { ...init, headers });
}

async function lineDataApi(env: Env, path: string, init: RequestInit = {}) {
  const accessToken = await getCredential(env, "LINE_CHANNEL_ACCESS_TOKEN");
  if (!accessToken) return new Response("LINE token missing", { status: 503 });
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(`https://api-data.line.me${path}`, { ...init, headers });
}

async function getIntegrationStatus(request: Request, env: Env) {
  if (!isAuthorized(request, env)) return json({ error: "未授權" }, 401);
  const values = await Promise.all(credentialNames.map(name => credentialStatus(env, name)));
  return json({ ok: true, configured: Object.fromEntries(credentialNames.map((name, index) => [name, values[index]])), webhookUrl: `${new URL(request.url).origin}/api/line/webhook` });
}

async function saveIntegrationCredentials(request: Request, env: Env) {
  if (!isAuthorized(request, env)) return json({ error: "未授權" }, 401);
  const input = await request.json<Partial<Record<CredentialName, string>>>().catch(() => ({} as Partial<Record<CredentialName, string>>));
  const updates = credentialNames.flatMap(name => typeof input[name] === "string" && input[name]!.trim() ? [[name, input[name]!.trim()] as const] : []);
  if (!updates.length) return json({ error: "請至少填寫一項憑證" }, 400);
  for (const [name, value] of updates) {
    if (value.length < 12) return json({ error: `${name} 格式過短` }, 400);
    const encrypted = await encryptCredential(env, value);
    await env.DB.prepare("INSERT INTO integration_secrets (name, encrypted_value, iv, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(name) DO UPDATE SET encrypted_value = excluded.encrypted_value, iv = excluded.iv, updated_at = CURRENT_TIMESTAMP")
      .bind(name, encrypted.encryptedValue, encrypted.iv).run();
  }
  return getIntegrationStatus(request, env);
}

async function testIntegration(request: Request, env: Env) {
  if (!isAuthorized(request, env)) return json({ error: "未授權" }, 401);
  const input = await request.json<{ provider?: "openai" | "line" }>().catch(() => ({} as { provider?: "openai" | "line" }));
  if (input.provider === "openai") {
    const apiKey = await getCredential(env, "OPENAI_API_KEY");
    if (!apiKey) return json({ error: "尚未設定 OpenAI API Key" }, 400);
    const response = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!response.ok) return json({ error: "OpenAI 驗證失敗，請確認 API Key 與專案權限" }, 400);
    return json({ ok: true, message: "OpenAI API 驗證成功" });
  }
  if (input.provider === "line") {
    const [secret, token] = await Promise.all([getCredential(env, "LINE_CHANNEL_SECRET"), getCredential(env, "LINE_CHANNEL_ACCESS_TOKEN")]);
    if (!secret || !token) return json({ error: "請先填寫 LINE Channel Secret 與 Access Token" }, 400);
    const response = await lineApi(env, "/v2/bot/info");
    if (!response.ok) return json({ error: "LINE 驗證失敗，請確認 Access Token" }, 400);
    const info = await response.json() as { displayName?: string; basicId?: string };
    return json({ ok: true, message: `LINE 驗證成功：${info.displayName || info.basicId || "官方帳號"}` });
  }
  return json({ error: "未知的驗證服務" }, 400);
}

async function readConversationState(env: Env) {
  const row = await env.DB.prepare("SELECT payload, revision FROM app_state WHERE id = 1").first<{ payload: string; revision: number }>();
  const state = row ? JSON.parse(row.payload) as { conversations?: StoredConversation[] } : { conversations: [] };
  return { conversations: state.conversations || [], revision: row?.revision ?? 0 };
}

async function writeConversationState(env: Env, conversations: StoredConversation[]) {
  await env.DB.prepare("UPDATE app_state SET payload = ?, revision = revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1")
    .bind(JSON.stringify({ conversations })).run();
}

async function verifySession(request: Request, env: Env) {
  if (!isAuthorized(request, env)) return json({ error: "管理碼錯誤" }, 401);
  const input: { deviceId?: string; deviceName?: string } = await request.json<{ deviceId?: string; deviceName?: string }>().catch(() => ({}));
  if (input.deviceId && input.deviceName) {
    await env.DB.prepare("INSERT INTO devices (id, name, last_seen) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET name = excluded.name, last_seen = CURRENT_TIMESTAMP")
      .bind(input.deviceId, input.deviceName.slice(0, 40)).run();
  }
  const devices = await env.DB.prepare("SELECT id, name, last_seen AS lastSeen FROM devices ORDER BY last_seen DESC LIMIT 2").all();
  return json({ ok: true, devices: devices.results });
}

async function getSharedState(request: Request, env: Env) {
  if (!isAuthorized(request, env)) return json({ error: "未授權" }, 401);
  const row = await env.DB.prepare("SELECT payload, revision, updated_at AS updatedAt FROM app_state WHERE id = 1").first<{ payload: string; revision: number; updatedAt: string }>();
  return json({ state: row ? JSON.parse(row.payload) : { conversations: [] }, revision: row?.revision ?? 0, updatedAt: row?.updatedAt });
}

async function putSharedState(request: Request, env: Env) {
  if (!isAuthorized(request, env)) return json({ error: "未授權" }, 401);
  const input = await request.json<{ conversations?: unknown[]; baseRevision?: number }>();
  if (!Array.isArray(input.conversations) || typeof input.baseRevision !== "number") return json({ error: "同步資料格式錯誤" }, 400);
  const result = await env.DB.prepare("UPDATE app_state SET payload = ?, revision = revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1 AND revision = ?")
    .bind(JSON.stringify({ conversations: input.conversations }), input.baseRevision).run();
  if (!result.meta.changes) {
    const latest = await env.DB.prepare("SELECT payload, revision FROM app_state WHERE id = 1").first<{ payload: string; revision: number }>();
    return json({ error: "資料已由另一台裝置更新", state: latest ? JSON.parse(latest.payload) : { conversations: [] }, revision: latest?.revision ?? 0 }, 409);
  }
  return json({ ok: true, revision: input.baseRevision + 1 });
}

async function openAiDraft(request: Request, env: Env) {
  const input = await request.json<{ message?: string; context?: string }>();
  if (!input.message?.trim()) return json({ error: "訊息不能空白" }, 400);
  const apiKey = await getCredential(env, "OPENAI_API_KEY");
  if (!apiKey) return json({ draft: "您好，已收到您的訊息，我們會由客服人員確認後盡快回覆您。" });
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: env.OPENAI_MODEL || "gpt-5-mini", instructions: `你是窩的家客服助理。回答要親切、簡短；空房、健康、退款或爭議一律轉人工確認。參考資料：${input.context || "無"}`, input: input.message, max_output_tokens: 220 }),
  });
  if (!response.ok) return json({ error: "AI 暫時無法產生草稿" }, 502);
  const result = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
  const draft = result.output_text || result.output?.flatMap(item => item.content || []).map(item => item.text || "").join("") || "請由人工客服確認。";
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
  const channelSecret = await getCredential(env, "LINE_CHANNEL_SECRET");
  if (!(await verifyLine(body, request.headers.get("x-line-signature"), channelSecret))) return json({ error: "Invalid signature" }, 401);
  const payload = JSON.parse(body) as { events?: Array<{ type: string; timestamp?: number; replyToken?: string; source?: { userId?: string }; message?: { id?: string; type: string; text?: string } }> };
  for (const event of payload.events || []) {
    if (event.type !== "message" || event.message?.type !== "text" || !event.source?.userId) continue;
    const text = event.message.text || "";
    const current = await readConversationState(env);
    const index = current.conversations.findIndex(item => item.lineUserId === event.source?.userId);
    let name = "LINE 顧客";
    if (await credentialStatus(env, "LINE_CHANNEL_ACCESS_TOKEN")) {
      const profile = await lineApi(env, `/v2/bot/profile/${event.source.userId}`);
      if (profile.ok) name = ((await profile.json()) as { displayName?: string }).displayName || name;
    }
    const time = new Date(event.timestamp || Date.now()).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Taipei" });
    const message = { id: event.message.id || crypto.randomUUID(), role: "customer", text, time };
    if (index >= 0) {
      const existing = current.conversations[index];
      current.conversations[index] = { ...existing, name, preview: text, time, unread: Number(existing.unread || 0) + 1, messages: [...(existing.messages || []), message] };
    } else {
      current.conversations.unshift({ id: `line-${event.source.userId}`, name, lineId: event.source.userId.slice(-8), lineUserId: event.source.userId, avatar: name.slice(0, 1), preview: text, time, unread: 1, status: "human", tags: ["LINE 新訊息"], messages: [message] });
    }
    await writeConversationState(env, current.conversations);
    if (event.replyToken && await credentialStatus(env, "LINE_CHANNEL_ACCESS_TOKEN")) {
      const reply = await env.DB.prepare("SELECT page, action_id AS actionId, response_mode AS responseMode, reply_text AS replyText, image_base64 AS imageBase64, image_version AS imageVersion FROM rich_menu_responses WHERE trigger_text = ? ORDER BY updated_at DESC LIMIT 1")
        .bind(text).first<{ page: string; actionId: number; responseMode: "text" | "image" | "text_image"; replyText?: string; imageBase64?: string; imageVersion: number }>();
      if (reply) {
        const imageUrl = `${new URL(request.url).origin}/api/public/reply-image/${reply.page}/${reply.actionId}?v=${reply.imageVersion}`;
        const messages: Array<Record<string, string>> = [];
        if ((reply.responseMode === "image" || reply.responseMode === "text_image") && reply.imageBase64) messages.push({ type: "image", originalContentUrl: imageUrl, previewImageUrl: imageUrl });
        if ((reply.responseMode === "text" || reply.responseMode === "text_image") && reply.replyText?.trim()) messages.push({ type: "text", text: reply.replyText.trim() });
        if (messages.length) await lineApi(env, "/v2/bot/message/reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ replyToken: event.replyToken, messages }) });
      }
    }
  }
  return json({ ok: true });
}

async function sendLineMessage(request: Request, env: Env) {
  if (!isAuthorized(request, env)) return json({ error: "未授權" }, 401);
  const input = await request.json<{ conversationId?: string; text?: string }>();
  if (!input.conversationId || !input.text?.trim()) return json({ error: "訊息內容不完整" }, 400);
  const current = await readConversationState(env);
  const index = current.conversations.findIndex(item => item.id === input.conversationId);
  if (index < 0) return json({ error: "找不到對話" }, 404);
  const conversation = current.conversations[index];
  if (!(await credentialStatus(env, "LINE_CHANNEL_ACCESS_TOKEN")) || !conversation.lineUserId) return json({ ok: true, demo: true });
  const response = await lineApi(env, "/v2/bot/message/push", { method: "POST", headers: { "Content-Type": "application/json", "X-Line-Retry-Key": crypto.randomUUID() }, body: JSON.stringify({ to: conversation.lineUserId, messages: [{ type: "text", text: input.text.trim() }] }) });
  if (!response.ok) return json({ error: "LINE 推播失敗", detail: await response.text() }, response.status);
  const time = new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Taipei" });
  const sent = { id: crypto.randomUUID(), role: "agent", text: input.text.trim(), time };
  current.conversations[index] = { ...conversation, preview: input.text.trim(), time, unread: 0, messages: [...(conversation.messages || []), sent] };
  await writeConversationState(env, current.conversations);
  return json({ ok: true, demo: false, message: sent });
}

type ReplyMode = "text" | "image" | "text_image";
type RichActionInput = { id: number; label: string; type: "uri" | "message" | "richmenuswitch"; value: string; responseMode?: ReplyMode; replyText?: string; replyImageData?: string; replyImageName?: string };

async function getRichMenuResponses(request: Request, env: Env) {
  if (!isAuthorized(request, env)) return json({ error: "未授權" }, 401);
  const page = new URL(request.url).searchParams.get("page");
  if (page !== "home" && page !== "service") return json({ error: "頁面不正確" }, 400);
  const rows = await env.DB.prepare("SELECT action_id AS id, response_mode AS responseMode, reply_text AS replyText, image_name AS replyImageName, image_version AS imageVersion, CASE WHEN image_base64 IS NULL THEN 0 ELSE 1 END AS hasImage FROM rich_menu_responses WHERE page = ? ORDER BY action_id")
    .bind(page).all<{ id: number; responseMode: ReplyMode; replyText: string; replyImageName?: string; imageVersion: number; hasImage: number }>();
  const origin = new URL(request.url).origin;
  return json({ ok: true, actions: rows.results.map(row => ({ ...row, replyImageUrl: row.hasImage ? `${origin}/api/public/reply-image/${page}/${row.id}?v=${row.imageVersion}` : undefined })) });
}

async function saveRichMenuResponses(request: Request, env: Env) {
  if (!isAuthorized(request, env)) return json({ error: "未授權" }, 401);
  const input = await request.json<{ page?: "home" | "service"; actions?: RichActionInput[] }>().catch(() => ({} as { page?: "home" | "service"; actions?: RichActionInput[] }));
  if (!input.page || !Array.isArray(input.actions) || input.actions.length !== 6) return json({ error: "需要完整設定六個選項" }, 400);
  for (const action of input.actions) {
    if (!Number.isInteger(action.id) || action.id < 1 || action.id > 6) return json({ error: "按鈕編號不正確" }, 400);
    const isMessageAction = action.type === "message";
    const mode: ReplyMode = isMessageAction && ["image", "text_image"].includes(action.responseMode || "") ? action.responseMode! : "text";
    const existing = await env.DB.prepare("SELECT image_base64 AS imageBase64, image_mime AS imageMime, image_name AS imageName, image_version AS imageVersion FROM rich_menu_responses WHERE page = ? AND action_id = ?")
      .bind(input.page, action.id).first<{ imageBase64?: string; imageMime?: string; imageName?: string; imageVersion?: number }>();
    let imageBase64 = existing?.imageBase64 || null;
    let imageMime = existing?.imageMime || null;
    let imageName = existing?.imageName || null;
    let imageVersion = existing?.imageVersion || 1;
    if (action.replyImageData) {
      const match = action.replyImageData.match(/^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/);
      if (!match) return json({ error: `按鈕 ${action.id} 的圖片格式不正確` }, 400);
      if (match[2].length > 1400000) return json({ error: `按鈕 ${action.id} 的圖片需小於 1 MB` }, 400);
      imageMime = match[1]; imageBase64 = match[2]; imageName = (action.replyImageName || `reply-${action.id}`).slice(0, 120); imageVersion += 1;
    }
    if (isMessageAction && (mode === "image" || mode === "text_image") && !imageBase64) return json({ error: `按鈕 ${action.id} 請先上傳回覆圖片` }, 400);
    const triggerText = (isMessageAction ? action.value : `__disabled__${input.page}_${action.id}`).trim().slice(0, 300);
    if (!triggerText) return json({ error: `按鈕 ${action.id} 缺少觸發文字` }, 400);
    await env.DB.prepare("INSERT INTO rich_menu_responses (page, action_id, trigger_text, response_mode, reply_text, image_base64, image_mime, image_name, image_version, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(page, action_id) DO UPDATE SET trigger_text = excluded.trigger_text, response_mode = excluded.response_mode, reply_text = excluded.reply_text, image_base64 = excluded.image_base64, image_mime = excluded.image_mime, image_name = excluded.image_name, image_version = excluded.image_version, updated_at = CURRENT_TIMESTAMP")
      .bind(input.page, action.id, triggerText, mode, (action.replyText || "").trim().slice(0, 1000), imageBase64, imageMime, imageName, imageVersion).run();
  }
  return json({ ok: true });
}

async function serveReplyImage(request: Request, env: Env, page: string, actionId: number) {
  const row = await env.DB.prepare("SELECT image_base64 AS imageBase64, image_mime AS imageMime FROM rich_menu_responses WHERE page = ? AND action_id = ?").bind(page, actionId).first<{ imageBase64?: string; imageMime?: string }>();
  if (!row?.imageBase64 || !row.imageMime) return new Response("Not found", { status: 404 });
  const bytes = decodeBase64(row.imageBase64);
  return new Response(bytes.buffer as ArrayBuffer, { headers: { "Content-Type": row.imageMime, "Cache-Control": "public, max-age=31536000, immutable" } });
}

function toLineAction(action: RichActionInput) {
  if (action.type === "uri") return { type: "uri", label: action.label.slice(0, 20), uri: action.value };
  if (action.type === "richmenuswitch") return { type: "richmenuswitch", label: action.label.slice(0, 20), richMenuAliasId: action.value, data: `switch=${action.value}` };
  return { type: "message", label: action.label.slice(0, 20), text: action.value };
}

async function publishRichMenu(request: Request, env: Env) {
  if (!isAuthorized(request, env)) return json({ error: "未授權" }, 401);
  const input = await request.json<{ page?: "home" | "service"; actions?: RichActionInput[]; height?: number; layout?: "3x2" | "2x3"; tabPercent?: number; tabLabels?: [string, string]; chatBarText?: string; imageData?: string }>();
  if (!input.page || !Array.isArray(input.actions) || input.actions.length !== 6) return json({ error: "需要完整設定六個選項" }, 400);
  if (!(await credentialStatus(env, "LINE_CHANNEL_ACCESS_TOKEN"))) return json({ ok: true, result: { demo: true, reason: "尚未設定 LINE Access Token" } });
  const height = input.imageData ? Math.max(500, Math.min(1724, Number(input.height) || 1686)) : 1686;
  const [columns, rows] = input.layout === "2x3" ? [2, 3] : [3, 2];
  const tabHeight = Math.round(height * Math.max(0.08, Math.min(0.25, (input.tabPercent || 12) / 100)));
  const bodyHeight = height - tabHeight;
  const areas = input.actions.map((action, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = Math.round(2500 * column / columns);
    const y = Math.round(bodyHeight * row / rows);
    const width = Math.round(2500 * (column + 1) / columns) - x;
    const areaHeight = Math.round(bodyHeight * (row + 1) / rows) - y;
    return { bounds: { x, y, width, height: areaHeight }, action: toLineAction(action) };
  });
  const labels = input.tabLabels || ["首頁", "服務"];
  areas.push(
    { bounds: { x: 0, y: bodyHeight, width: 1250, height: tabHeight }, action: { type: "richmenuswitch", label: labels[0].slice(0, 20), richMenuAliasId: "wodejia-home", data: "page=home" } },
    { bounds: { x: 1250, y: bodyHeight, width: 1250, height: tabHeight }, action: { type: "richmenuswitch", label: labels[1].slice(0, 20), richMenuAliasId: "wodejia-service", data: "page=service" } },
  );
  let imageType = "image/jpeg";
  let imageBytes: Uint8Array;
  if (input.imageData) {
    const match = input.imageData.match(/^data:(image\/(?:png|jpeg));base64,(.+)$/);
    if (!match) return json({ error: "圖片格式必須是 PNG 或 JPEG" }, 400);
    imageType = match[1];
    imageBytes = decodeBase64(match[2]);
  } else {
    const defaultImage = await env.ASSETS.fetch(new Request(new URL(input.page === "home" ? "/rich-menu-hotel.jpg" : "/rich-menu-shop.jpg", request.url)));
    if (!defaultImage.ok) return json({ error: "找不到預設 Rich Menu 圖片" }, 500);
    imageType = defaultImage.headers.get("content-type") || "image/jpeg";
    imageBytes = new Uint8Array(await defaultImage.arrayBuffer());
  }
  const menuResponse = await lineApi(env, "/v2/bot/richmenu", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ size: { width: 2500, height }, selected: input.page === "home", name: `wodejia-${input.page}-${Date.now()}`, chatBarText: (input.chatBarText || "開啟選單").slice(0, 14), areas }) });
  if (!menuResponse.ok) return json({ error: "LINE Rich Menu 建立失敗", detail: await menuResponse.text() }, menuResponse.status);
  const { richMenuId } = await menuResponse.json() as { richMenuId: string };
  const upload = await lineDataApi(env, `/v2/bot/richmenu/${richMenuId}/content`, { method: "POST", headers: { "Content-Type": imageType }, body: imageBytes.buffer as ArrayBuffer });
  if (!upload.ok) {
    const detail = await upload.text();
    await lineApi(env, `/v2/bot/richmenu/${richMenuId}`, { method: "DELETE" });
    return json({ error: "Rich Menu 圖片上傳失敗", detail }, upload.status);
  }
  const aliasId = `wodejia-${input.page}`;
  const aliasBody = JSON.stringify({ richMenuAliasId: aliasId, richMenuId });
  const alias = await lineApi(env, "/v2/bot/richmenu/alias", { method: "POST", headers: { "Content-Type": "application/json" }, body: aliasBody });
  if (!alias.ok) await lineApi(env, `/v2/bot/richmenu/alias/${aliasId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ richMenuId }) });
  if (input.page === "home") await lineApi(env, `/v2/bot/user/all/richmenu/${richMenuId}`, { method: "POST" });
  return json({ ok: true, result: { demo: false, richMenuId, aliasId } });
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (url.pathname === "/api/health") {
      const [aiConfigured, lineSecret, lineToken] = await Promise.all([credentialStatus(env, "OPENAI_API_KEY"), credentialStatus(env, "LINE_CHANNEL_SECRET"), credentialStatus(env, "LINE_CHANNEL_ACCESS_TOKEN")]);
      return json({ ok: true, service: "wodejia-line-console", aiConfigured, lineConfigured: lineSecret && lineToken });
    }
    if (url.pathname === "/api/session/verify" && request.method === "POST") return verifySession(request, env);
    if (url.pathname === "/api/sync/conversations" && request.method === "GET") return getSharedState(request, env);
    if (url.pathname === "/api/sync/conversations" && request.method === "PUT") return putSharedState(request, env);
    if (url.pathname === "/api/ai/draft" && request.method === "POST") return openAiDraft(request, env);
    if (url.pathname === "/api/integrations/status" && request.method === "GET") return getIntegrationStatus(request, env);
    if (url.pathname === "/api/integrations/credentials" && request.method === "POST") return saveIntegrationCredentials(request, env);
    if (url.pathname === "/api/integrations/test" && request.method === "POST") return testIntegration(request, env);
    if (url.pathname === "/api/line/webhook" && request.method === "POST") return lineWebhook(request, env);
    if (url.pathname === "/api/line/messages/send" && request.method === "POST") return sendLineMessage(request, env);
    if (url.pathname === "/api/line/rich-menu/responses" && request.method === "GET") return getRichMenuResponses(request, env);
    if (url.pathname === "/api/line/rich-menu/responses" && request.method === "POST") return saveRichMenuResponses(request, env);
    if (url.pathname === "/api/line/rich-menu/publish" && request.method === "POST") return publishRichMenu(request, env);
    const replyImage = url.pathname.match(/^\/api\/public\/reply-image\/(home|service)\/(\d+)$/);
    if (replyImage && request.method === "GET") return serveReplyImage(request, env, replyImage[1], Number(replyImage[2]));
    return env.ASSETS.fetch(request);
  },
};
