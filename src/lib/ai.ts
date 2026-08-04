import OpenAI from "openai";

const fallback = "您好，感謝提供資訊！房況需要由人員確認，我先幫您轉交客服。住宿期間的用品、飼料與接送需求也可以一併告訴我們，確認後會盡快回覆您。";

export async function draftReply(message: string, context?: string) {
  if (!process.env.OPENAI_API_KEY) return fallback;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5-mini",
    instructions: `你是「窩的家」倉鼠住宿客服助理。使用繁體中文，語氣親切、精準、簡短。只能根據提供的知識回答。空房、健康急症、退款、爭議一律明確標註需人工確認，不可自行承諾。知識摘要：${context || "住宿房況需人工確認；健康問題需轉人工；一般價目、地址、接送與配送可回答。"}`,
    input: message,
    max_output_tokens: 220,
  });
  return response.output_text || fallback;
}
