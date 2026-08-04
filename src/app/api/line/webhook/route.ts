import { NextResponse } from "next/server";
import { draftReply } from "@/lib/ai";
import { replyLine, verifyLineSignature } from "@/lib/line";

type LineEvent = { type: string; replyToken?: string; message?: { type: string; text?: string } };

export async function POST(request: Request) {
  const body = await request.text();
  if (!verifyLineSignature(body, request.headers.get("x-line-signature"))) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  const payload = JSON.parse(body) as { events?: LineEvent[] };
  await Promise.all((payload.events || []).map(async event => {
    if (event.type !== "message" || event.message?.type !== "text" || !event.replyToken) return;
    const text = event.message.text || "";
    const highRisk = /生病|受傷|流血|急診|退款|客訴|爭議|空房|名額/.test(text);
    const answer = highRisk ? "這個問題需要由專人確認，我已為您轉交人工客服，請稍候回覆。" : await draftReply(text);
    await replyLine(event.replyToken, [{ type: "text", text: answer }]);
  }));
  return NextResponse.json({ ok: true });
}
