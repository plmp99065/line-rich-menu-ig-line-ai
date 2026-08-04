import type { Conversation, RichAction } from "./types";

export const conversations: Conversation[] = [
  {
    id: "c1", name: "陳小花", lineId: "@flower_ham", avatar: "花", preview: "想詢問 6/10～6/14 的鼠鼠住宿…", time: "10:32", unread: 2, status: "ai", tags: ["常客", "鼠鼠住宿", "黃金鼠"], note: "偏好安靜房型；上次住宿適應良好。",
    messages: [
      { id: "m1", role: "customer", text: "您好～想詢問 6/10～6/14 五天的鼠鼠住宿還有名額嗎？是兩隻黃金鼠，想放在一起～謝謝！", time: "10:28" },
      { id: "m2", role: "agent", text: "您好！這段期間需要由我們確認即時房況。請問鼠鼠的年齡、是否有用藥，以及需要自備飼料嗎？", time: "10:30" },
      { id: "m3", role: "customer", text: "一隻 1 歲半公鼠、一隻 8 個月母鼠，都很健康沒有用藥，想用你們的飼料就好。", time: "10:31" },
    ]
  },
  { id: "c2", name: "王大明", lineId: "@ming123", avatar: "明", preview: "請問現在還有倉鼠飼料嗎？", time: "10:15", unread: 1, status: "ai", tags: ["商品詢問"], messages: [{ id: "m4", role: "customer", text: "請問現在還有黃金鼠飼料嗎？可以宅配嗎？", time: "10:15" }] },
  { id: "c3", name: "林小柔", lineId: "@rou_ham", avatar: "柔", preview: "謝謝您！我再考慮看看～", time: "昨天", unread: 0, status: "human", tags: ["待追蹤"], messages: [{ id: "m5", role: "customer", text: "謝謝您！我再考慮看看～", time: "昨天" }] },
  { id: "c4", name: "黃阿福", lineId: "@afu2026", avatar: "福", preview: "好的，謝謝回覆！", time: "昨天", unread: 0, status: "resolved", tags: ["已解決"], messages: [{ id: "m6", role: "customer", text: "好的，謝謝回覆！", time: "昨天" }] },
  { id: "c5", name: "許小樂", lineId: "@happyham", avatar: "樂", preview: "倉鼠今天突然不太吃東西…", time: "昨天", unread: 0, status: "human", tags: ["緊急", "健康問題"], messages: [{ id: "m7", role: "customer", text: "倉鼠今天突然不太吃東西，精神也不好，怎麼辦？", time: "昨天" }] },
];

export const defaultActions: RichAction[] = [
  { id: 1, label: "住宿預約", type: "uri", value: "https://example.com/booking" },
  { id: 2, label: "住宿價目", type: "message", value: "住宿價目" },
  { id: 3, label: "接送方式", type: "message", value: "接送方式" },
  { id: 4, label: "商品選購", type: "uri", value: "https://instagram.com/" },
  { id: 5, label: "住宿須知", type: "message", value: "住宿須知" },
  { id: 6, label: "聯絡客服", type: "message", value: "轉接人工客服" },
];

export const knowledgeSeed = [
  { id: 1, title: "2026 住宿價目表", type: "PDF", updated: "今天 09:42", status: "已索引", chunks: 18 },
  { id: 2, title: "倉鼠住宿須知", type: "DOCX", updated: "昨天 16:20", status: "已索引", chunks: 12 },
  { id: 3, title: "接送服務與範圍", type: "FAQ", updated: "7/30 11:06", status: "已索引", chunks: 8 },
  { id: 4, title: "商品配送說明", type: "PDF", updated: "7/28 14:35", status: "已索引", chunks: 9 },
];
