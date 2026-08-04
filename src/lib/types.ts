export type NavKey = "dashboard" | "inbox" | "richMenu" | "knowledge" | "ai" | "analytics" | "settings";

export type Message = {
  id: string;
  role: "customer" | "agent" | "ai";
  text: string;
  time: string;
};

export type Conversation = {
  id: string;
  name: string;
  lineId: string;
  avatar: string;
  preview: string;
  time: string;
  unread: number;
  status: "ai" | "human" | "resolved";
  tags: string[];
  messages: Message[];
  note?: string;
};

export type RichAction = {
  id: number;
  label: string;
  type: "uri" | "message" | "richmenuswitch";
  value: string;
};
