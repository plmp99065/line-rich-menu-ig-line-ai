import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, service: "wodejia-line-console", aiConfigured: Boolean(process.env.OPENAI_API_KEY), lineConfigured: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_CHANNEL_SECRET) });
}
