import crypto from "node:crypto";

export function verifyLineSignature(body: string, signature: string | null) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  return expectedBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

export async function replyLine(replyToken: string, messages: Array<{ type: "text"; text: string }>) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return { demo: true };
  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ replyToken, messages }),
  });
  if (!response.ok) throw new Error(`LINE reply failed: ${response.status}`);
  return { demo: false };
}

export async function lineRequest(path: string, init: RequestInit = {}) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return { ok: true, demo: true };
  const response = await fetch(`https://api.line.me${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!response.ok) throw new Error(`LINE API ${path} failed: ${response.status}`);
  const text = await response.text();
  return text ? JSON.parse(text) : { ok: true };
}
