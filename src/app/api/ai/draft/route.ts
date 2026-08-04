import { NextResponse } from "next/server";
import { z } from "zod";
import { draftReply } from "@/lib/ai";

const schema = z.object({ message: z.string().min(1).max(4000), context: z.string().max(12000).optional() });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    return NextResponse.json({ draft: await draftReply(input.message, input.context) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "無法產生草稿" }, { status: 400 });
  }
}
