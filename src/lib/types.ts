export type NavKey = "dashboard" | "inbox" | "richMenu" | "knowledge" | "ai" | "analytics" | "settings";

export type Message = {
  id: string;
  role: "customer" | "agent" | "ai";
  text: string;
  time: string;
  imageUrl?: string;
  attachmentName?: string;
};

export type Order = { id: string; title: string; date: string; amount: number; status: "待確認" | "已確認" | "已完成" };

export type Conversation = {
  id: string;
  name: string;
  lineId: string;
  lineUserId?: string;
  avatar: string;
  preview: string;
  time: string;
  unread: number;
  status: "ai" | "human" | "resolved";
  tags: string[];
  messages: Message[];
  note?: string;
  assignee?: string;
  orders?: Order[];
};

export type KnowledgeDocument = { id: string; title: string; type: string; sizeBytes: number; content?: string; chunks: number; status: string; updated: string };

export type AppSettings = { autoReply: boolean; model: string; tone: string; handoffRules: string[] };

export type Metrics = {
  conversations: number;
  unread: number;
  pending: number;
  aiResolved: number;
  human: number;
  resolved: number;
  menuClicks: number;
  knowledgeDocuments: number;
  topics: Array<{ label: string; count: number }>;
  daily: Array<{ label: string; conversations: number }>;
};

export type RichAction = {
  id: number;
  label: string;
  type: "uri" | "message" | "richmenuswitch";
  value: string;
  responseMode: "text" | "image" | "text_image";
  replyText: string;
  replyImageData?: string;
  replyImageName?: string;
  replyImageUrl?: string;
};
