import { NextResponse } from "next/server";
import { z } from "zod";
import { lineRequest } from "@/lib/line";

const actionSchema = z.object({ id: z.number(), label: z.string(), type: z.enum(["uri", "message", "richmenuswitch"]), value: z.string() });
const schema = z.object({ page: z.enum(["home", "service"]), actions: z.array(actionSchema).length(6) });
type LineAction = { type: string; label: string; uri?: string; text?: string; richMenuAliasId?: string; data?: string };

export async function POST(request: Request) {
  try {
    const { page, actions } = schema.parse(await request.json());
    const size = { width: 2500, height: 1686 };
    const areas: Array<{ bounds: { x: number; y: number; width: number; height: number }; action: LineAction }> = actions.map((action, index) => ({
      bounds: { x: (index % 3) * 833, y: Math.floor(index / 3) * 743, width: index % 3 === 2 ? 834 : 833, height: 743 },
      action: action.type === "uri" ? { type: "uri", label: action.label, uri: action.value } : { type: "message", label: action.label, text: action.value },
    }));
    areas.push({ bounds: { x: 0, y: 1486, width: 1250, height: 200 }, action: { type: "richmenuswitch", label: "首頁", richMenuAliasId: "home-menu", data: "page=home" } });
    areas.push({ bounds: { x: 1250, y: 1486, width: 1250, height: 200 }, action: { type: "richmenuswitch", label: "服務", richMenuAliasId: "service-menu", data: "page=service" } });
    const result = await lineRequest("/v2/bot/richmenu", { method: "POST", body: JSON.stringify({ size, selected: page === "home", name: `窩的家-${page}`, chatBarText: page === "home" ? "開啟首頁選單" : "開啟服務選單", areas }) });
    return NextResponse.json({ ok: true, page, result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "發佈失敗" }, { status: 400 });
  }
}
