"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronDown, Clock3, Edit3, MessageCircle, MoreHorizontal, Paperclip, Search, Send, Sparkles, UserRound, X } from "lucide-react";
import { conversations as seed } from "@/lib/demo-data";
import { apiUrl } from "@/lib/api";
import type { Conversation, Message } from "@/lib/types";

export function InboxView() {
  const [items, setItems] = useState(seed);
  const [selectedId, setSelectedId] = useState(seed[0].id);
  const [filter, setFilter] = useState("全部");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("您好～感謝提供資訊！6/10～6/14 兩隻黃金鼠的房況需要由人員確認，我先為您保留詢問紀錄。住宿五天的參考費用為 NT$1,800，確認房況後會再回覆您。需要我同時協助確認接送嗎？");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const selected = items.find(c => c.id === selectedId) || items[0];
  const visible = useMemo(() => items.filter(c => (filter === "全部" || (filter === "未讀" && c.unread) || (filter === "待處理" && c.status !== "resolved")) && (c.name.includes(query) || c.preview.includes(query))), [items, filter, query]);

  function updateSelected(fn: (c: Conversation) => Conversation) { setItems(old => old.map(c => c.id === selected.id ? fn(c) : c)); }
  function send(text: string, role: Message["role"] = "agent") {
    if (!text.trim()) return;
    updateSelected(c => ({ ...c, preview: text, messages: [...c.messages, { id: crypto.randomUUID(), role, text, time: new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }) }] }));
    setInput("");
  }
  async function regenerate() {
    setLoading(true);
    try {
      const last = [...selected.messages].reverse().find(m => m.role === "customer")?.text || selected.preview;
      const response = await fetch(apiUrl("/api/ai/draft"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: last, context: "住宿五天參考價 NT$1,800。即時空房一律轉人工確認。可提供接送服務，範圍與費用需確認地址。" }) });
      const data = await response.json();
      if (data.draft) setDraft(data.draft);
    } finally { setLoading(false); }
  }

  return <main className="inbox-page">
    <div className="page-title-row"><div><h1>客服收件匣</h1><p>集中處理 LINE 顧客訊息與 AI 回覆草稿</p></div><div className="header-tools"><span className="mode"><i/> AI 草稿模式</span><button className="icon-btn"><MoreHorizontal size={19}/></button></div></div>
    <div className="inbox-layout">
      <section className="conversation-rail">
        <label className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜尋顧客或訊息"/></label>
        <div className="filter-tabs">{["全部", "未讀", "待處理"].map(f => <button key={f} className={filter === f ? "active" : ""} onClick={()=>setFilter(f)}>{f}<span>{f === "全部" ? items.length : f === "未讀" ? items.filter(i=>i.unread).length : items.filter(i=>i.status!=="resolved").length}</span></button>)}</div>
        <div className="conversation-list">{visible.map(c => <button key={c.id} className={c.id === selected.id ? "conversation selected" : "conversation"} onClick={()=>setSelectedId(c.id)}><div className="avatar">{c.avatar}</div><span><strong>{c.name}<time>{c.time}</time></strong><em>{c.preview}</em></span>{c.unread ? <b>{c.unread}</b> : null}</button>)}</div>
      </section>
      <section className="chat-panel">
        <header className="chat-header"><div className="avatar">{selected.avatar}</div><div><strong>{selected.name}</strong><span>LINE ID：{selected.lineId}</span></div><button className="text-btn"><UserRound size={16}/> 指派</button><button className="icon-btn"><MoreHorizontal size={18}/></button></header>
        <div className="messages"><div className="day-line">今天</div>{selected.messages.map(m => <div key={m.id} className={`message-row ${m.role}`}><div className="bubble">{m.text}</div><time>{m.time}</time></div>)}</div>
        <div className="draft-box"><div className="draft-head"><span><Sparkles size={16}/> AI 草稿建議</span><label>AI 草稿模式 <input type="checkbox" defaultChecked/></label></div><textarea value={draft} onChange={e=>setDraft(e.target.value)} aria-label="AI 回覆草稿"/><div className="draft-actions"><button className="primary" onClick={()=>send(draft, "ai")}><Send size={16}/> 送出回覆</button><button onClick={regenerate} disabled={loading}><Sparkles size={16}/>{loading ? "產生中…" : "重新產生"}</button><button className="danger-soft" onClick={()=>updateSelected(c=>({...c,status:"human"}))}><UserRound size={16}/> 轉人工</button></div></div>
        <div className="composer"><div><button aria-label="附加檔案"><Paperclip size={18}/></button><button aria-label="快速回覆"><MessageCircle size={18}/></button><button className="quick">快速回覆 <ChevronDown size={14}/></button></div><div className="compose-row"><textarea placeholder="輸入訊息…（Enter 送出）" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input)}}}/><button onClick={()=>send(input)} aria-label="送出"><Send size={18}/></button></div></div>
      </section>
      <aside className="customer-panel">
        <div className="customer-title"><h2>顧客資訊</h2><button><X size={18}/></button></div><div className="customer-id"><div className="avatar big">{selected.avatar}</div><div><strong>{selected.name}</strong><span>{selected.lineId}</span></div><button><Edit3 size={16}/></button></div>
        <dl><div><dt>加入好友</dt><dd>2024/02/18</dd></div><div><dt>目前狀態</dt><dd className={selected.status}>{selected.status === "human" ? "人工處理" : selected.status === "resolved" ? "已結案" : "AI 協助"}</dd></div></dl>
        <section className="side-section"><header><h3>標籤</h3><button><Edit3 size={15}/></button></header><div className="tags">{selected.tags.map(tag=><span key={tag}>{tag}</span>)}</div></section>
        <section className="side-section"><header><h3>備註</h3><button><Edit3 size={15}/></button></header><p>{selected.note || "尚無內部備註"}</p></section>
        <section className="side-section ai-status"><header><h3>AI 處理狀態</h3><span><Check size={14}/> 已完成</span></header><p>摘要更新於 10:31</p><div className="summary">顧客詢問兩隻黃金鼠住宿名額，目前健康、無用藥；房況尚待人工確認。</div></section>
        <div className="warning-card"><AlertTriangle size={20}/><div><strong>訂單提醒</strong><span>尚未建立預約訂單</span><button>建立預約訂單</button></div></div>
        <section className="recent-order"><header><h3>近期訂單</h3><a>查看全部</a></header><div><span><Clock3 size={16}/> 2024/04/12</span><strong>鼠鼠住宿 3 天</strong><em>NT$1,050</em></div></section>
      </aside>
    </div>
  </main>;
}
