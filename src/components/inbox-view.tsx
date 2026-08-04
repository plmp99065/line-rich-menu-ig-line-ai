"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, ChevronDown, ChevronUp, Clock3, Edit3, Info, MessageCircle, MoreHorizontal, Paperclip, Plus, Save, Search, Send, Sparkles, UserRound, X } from "lucide-react";
import { conversations as seed } from "@/lib/demo-data";
import { apiUrl } from "@/lib/api";
import type { Conversation, Message, Order } from "@/lib/types";

const quickReplies = ["您好，已收到您的訊息", "請稍候，我們正在確認", "需要轉由人工客服協助", "謝謝您的耐心等候"];

export function InboxView({ accessCode }: { accessCode: string }) {
  const [items, setItems] = useState(seed);
  const [selectedId, setSelectedId] = useState(seed[0].id);
  const [filter, setFilter] = useState("全部");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("您好～感謝提供資訊！此問題需要由人員確認，我先為您保留詢問紀錄，確認後會盡快回覆您。");
  const [aiStyle, setAiStyle] = useState<"brief" | "warm" | "confirm" | "handoff">("warm");
  const [aiMeta, setAiMeta] = useState<{ requiresHuman: boolean; riskLabel: string; sources: string[] }>({ requiresHuman: true, riskLabel: "此問題需要人工確認", sources: [] });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderDraft, setOrderDraft] = useState({ title: "鼠鼠住宿", date: new Date().toISOString().slice(0, 10), amount: "" });
  const imageRef = useRef<HTMLInputElement>(null);
  const revisionRef = useRef(0);
  const selected = items.find(c => c.id === selectedId) || items[0];
  const visible = useMemo(() => items.filter(c => (filter === "全部" || (filter === "未讀" && c.unread) || (filter === "待處理" && c.status !== "resolved")) && (c.name.includes(query) || c.preview.includes(query))), [items, filter, query]);

  const persist = useCallback(async (next: Conversation[], baseRevision = revisionRef.current) => {
    setSyncing(true);
    try {
      const response = await fetch(apiUrl("/api/sync/conversations"), { method: "PUT", headers: { "Content-Type": "application/json", "X-Admin-Code": accessCode }, body: JSON.stringify({ conversations: next, baseRevision }) });
      const data = await response.json() as { state?: { conversations?: Conversation[] }; revision: number };
      if (response.status === 409 && Array.isArray(data.state?.conversations)) { revisionRef.current = data.revision; setItems(data.state.conversations); }
      else if (response.ok) revisionRef.current = data.revision;
    } catch { setSendStatus("同步暫時中斷，將自動重試"); }
    finally { setSyncing(false); }
  }, [accessCode]);

  useEffect(() => {
    let active = true;
    async function pull() {
      try {
        const response = await fetch(apiUrl("/api/sync/conversations"), { headers: { "X-Admin-Code": accessCode } });
        if (!response.ok) return;
        const data = await response.json() as { state?: { conversations?: Conversation[] }; revision: number };
        if (!active) return;
        if (Array.isArray(data.state?.conversations) && data.state.conversations.length > 0 && data.revision > revisionRef.current) { revisionRef.current = data.revision; setItems(data.state.conversations); }
        else if (data.revision === 0 && data.state?.conversations?.length === 0) await persist(seed, 0);
      } catch { /* Keep local data while offline. */ }
    }
    void pull();
    const timer = window.setInterval(pull, 3000);
    return () => { active = false; window.clearInterval(timer); };
  }, [accessCode, persist]);

  function updateSelected(fn: (conversation: Conversation) => Conversation) {
    setItems(old => { const next = old.map(item => item.id === selected.id ? fn(item) : item); void persist(next); return next; });
  }

  function selectConversation(id: string) {
    setSelectedId(id); setDetailsOpen(false); setAssignOpen(false); setChatMenuOpen(false); setMobileChatOpen(true); setAiExpanded(false);
    setItems(old => { const current = old.find(item => item.id === id); if (!current?.unread) return old; const next = old.map(item => item.id === id ? { ...item, unread: 0 } : item); void persist(next); return next; });
  }

  async function send(text: string, role: Message["role"] = "agent") {
    if (!text.trim()) return;
    setSending(true); setSendStatus("");
    try {
      const response = await fetch(apiUrl("/api/line/messages/send"), { method: "POST", headers: { "Content-Type": "application/json", "X-Admin-Code": accessCode }, body: JSON.stringify({ conversationId: selected.id, text: text.trim() }) });
      const data = await response.json() as { demo?: boolean; error?: string };
      if (!response.ok) return setSendStatus(data.error || "訊息傳送失敗");
      if (data.demo) updateSelected(conversation => ({ ...conversation, preview: text.trim(), unread: 0, messages: [...conversation.messages, { id: crypto.randomUUID(), role, text: text.trim(), time: new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }) }] }));
      setInput(""); setSendStatus(data.demo ? "示範對話已同步" : "已傳送至 LINE");
    } catch { setSendStatus("網路中斷，訊息尚未送出"); }
    finally { setSending(false); }
  }

  async function sendImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg)$/.test(file.type) || file.size > 2 * 1024 * 1024) { setSendStatus("圖片只支援 PNG／JPEG，且需小於 2 MB"); return; }
    setSending(true); setSendStatus("正在傳送圖片…");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const response = await fetch(apiUrl("/api/line/messages/send-image"), { method: "POST", headers: { "Content-Type": "application/json", "X-Admin-Code": accessCode }, body: JSON.stringify({ conversationId: selected.id, data: String(reader.result || ""), name: file.name }) });
        const data = await response.json() as { error?: string; message?: Message };
        if (!response.ok) throw new Error(data.error || "圖片傳送失敗");
        if (data.message) {
          setItems(old => old.map(conversation => conversation.id === selected.id
            ? { ...conversation, preview: data.message!.text, messages: [...conversation.messages, data.message!] }
            : conversation));
        }
        setSendStatus("圖片已傳送");
      } catch (error) { setSendStatus(error instanceof Error ? error.message : "圖片傳送失敗"); }
      finally { setSending(false); if (imageRef.current) imageRef.current.value = ""; }
    };
    reader.readAsDataURL(file);
  }

  async function regenerate(style = aiStyle) {
    setLoading(true);
    try {
      const last = [...selected.messages].reverse().find(message => message.role === "customer")?.text || selected.preview;
      const response = await fetch(apiUrl("/api/ai/draft"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: last, style }) });
      const data = await response.json() as { draft?: string; error?: string; requiresHuman?: boolean; riskLabel?: string; sources?: string[] };
      if (data.draft) { setDraft(data.draft); setAiMeta({ requiresHuman: Boolean(data.requiresHuman), riskLabel: data.riskLabel || "AI 草稿已完成", sources: data.sources || [] }); }
      else setSendStatus(data.error || "AI 草稿產生失敗");
    } finally { setLoading(false); }
  }

  function createOrder() {
    const amount = Number(orderDraft.amount);
    if (!orderDraft.title.trim() || !orderDraft.date || !Number.isFinite(amount) || amount < 0) return setSendStatus("請完整填寫訂單名稱、日期與金額");
    const order: Order = { id: crypto.randomUUID(), title: orderDraft.title.trim(), date: orderDraft.date, amount, status: "待確認" };
    updateSelected(conversation => ({ ...conversation, orders: [order, ...(conversation.orders || [])] }));
    setOrderOpen(false); setSendStatus("預約訂單已建立並同步");
  }

  return <main className={`inbox-page ${mobileChatOpen ? "mobile-chat-open" : "mobile-list-open"}`}>
    <div className="page-title-row"><div><h1>客服收件匣</h1><p>集中處理 LINE 顧客訊息與 AI 回覆草稿</p></div><div className="header-tools"><span className="mode"><i/> {syncing ? "同步中…" : "兩台已同步"}</span></div></div>
    <div className={`inbox-layout ${detailsOpen ? "details-open" : ""}`}>
      <section className="conversation-rail"><label className="search"><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜尋顧客或訊息"/></label><div className="filter-tabs">{["全部", "未讀", "待處理"].map(item => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}<span>{item === "全部" ? items.length : item === "未讀" ? items.filter(conversation => conversation.unread).length : items.filter(conversation => conversation.status !== "resolved").length}</span></button>)}</div><div className="conversation-list">{visible.map(conversation => <button key={conversation.id} className={conversation.id === selected.id ? "conversation selected" : "conversation"} onClick={() => selectConversation(conversation.id)}><div className="avatar">{conversation.avatar}</div><span><strong>{conversation.name}<time>{conversation.time}</time></strong><em>{conversation.preview}</em></span>{conversation.unread ? <b>{conversation.unread}</b> : null}</button>)}{visible.length === 0 ? <div className="conversation-empty">找不到符合條件的對話</div> : null}</div></section>
      <section className="chat-panel"><header className="chat-header"><button className="mobile-back" aria-label="返回對話列表" onClick={() => { setMobileChatOpen(false); setDetailsOpen(false); }}><ArrowLeft size={20}/></button><div className="avatar">{selected.avatar}</div><div><strong>{selected.name}</strong><span>{selected.status === "human" ? "人工處理" : selected.status === "resolved" ? "已結案" : "AI 協助中"}</span></div><div className="header-action-wrap"><button className="text-btn" onClick={() => setAssignOpen(!assignOpen)}><UserRound size={16}/> {selected.assignee || "指派"}</button>{assignOpen ? <div className="action-menu">{["店長", "夥伴", "AI 協助"].map(name => <button key={name} onClick={() => { updateSelected(conversation => ({ ...conversation, assignee: name, status: name === "AI 協助" ? "ai" : "human" })); setAssignOpen(false); }}>{name}</button>)}</div> : null}</div><button className="icon-btn" aria-label="顧客資料" onClick={() => setDetailsOpen(!detailsOpen)}><Info size={18}/></button><div className="header-action-wrap"><button className="icon-btn" aria-label="對話操作" onClick={() => setChatMenuOpen(!chatMenuOpen)}><MoreHorizontal size={18}/></button>{chatMenuOpen ? <div className="action-menu right"><button onClick={() => { updateSelected(conversation => ({ ...conversation, status: conversation.status === "resolved" ? "human" : "resolved", unread: 0 })); setChatMenuOpen(false); }}><CheckCircle2 size={15}/>{selected.status === "resolved" ? "重新開啟" : "標示已結案"}</button><button onClick={() => { setDetailsOpen(true); setChatMenuOpen(false); }}><Info size={15}/>查看顧客資料</button></div> : null}</div></header>
        <div className="messages"><div className="day-line">今天</div>{selected.messages.map(message => <div key={message.id} className={`message-row ${message.role}`}><div className="bubble">{message.imageUrl ? <img className="message-image" src={message.imageUrl} alt={message.attachmentName || "LINE 圖片"}/> : null}{message.text}</div><time>{message.time}</time></div>)}</div>
        <div className={`draft-box ${aiExpanded ? "expanded" : "collapsed"}`}>
          <button className="draft-toggle" onClick={() => setAiExpanded(!aiExpanded)} aria-expanded={aiExpanded}><span><Sparkles size={16}/> AI 建議回覆</span><b className={aiMeta.requiresHuman ? "risk" : "safe"}>{aiExpanded ? "收合" : aiMeta.riskLabel}</b>{aiExpanded ? <ChevronDown size={17}/> : <ChevronUp size={17}/>}</button>
          <div className="draft-content">
            <div className="draft-head"><span>選擇回覆方式</span><label>草稿模式 <input type="checkbox" checked readOnly/></label></div>
            <div className="ai-modes">{([['brief','簡短'],['warm','親切'],['confirm','確認資料'],['handoff','轉人工']] as const).map(([value, label]) => <button key={value} className={aiStyle === value ? "active" : ""} onClick={() => { setAiStyle(value); void regenerate(value); }}>{label}</button>)}</div>
            <textarea value={draft} onChange={event => setDraft(event.target.value)} aria-label="AI 回覆草稿"/>
            <div className={`ai-evidence ${aiMeta.requiresHuman ? "risk" : "safe"}`}><strong>{aiMeta.riskLabel}</strong><span>{aiMeta.sources.length ? `依據：${aiMeta.sources.join("、")}` : "尚無直接知識庫依據，送出前請人工確認。"}</span></div>
            <div className="draft-actions"><button className="primary" onClick={() => void send(draft, "ai")} disabled={sending}><Send size={16}/>送出回覆</button><button onClick={() => void regenerate()} disabled={loading}><Sparkles size={16}/>{loading ? "產生中…" : "重新產生"}</button><button className="danger-soft" onClick={() => updateSelected(conversation => ({ ...conversation, status: "human", assignee: "店長" }))}><UserRound size={16}/>轉人工</button></div>
          </div>
        </div>
        <div className="composer">{sendStatus ? <div className="send-status" role="status">{sendStatus}</div> : null}<div className="compose-row"><div className="composer-tools"><button className="composer-plus" aria-label="更多訊息工具" onClick={() => setQuickOpen(!quickOpen)}><Plus size={20}/></button><input ref={imageRef} hidden type="file" accept="image/png,image/jpeg" onChange={event => void sendImage(event)}/>{quickOpen ? <div className="quick-menu"><button onClick={() => { setQuickOpen(false); imageRef.current?.click(); }}><Paperclip size={17}/>傳送圖片</button>{quickReplies.map(text => <button key={text} onClick={() => { setInput(text); setQuickOpen(false); }}><MessageCircle size={16}/>{text}</button>)}</div> : null}</div><textarea aria-label="輸入訊息" placeholder="輸入訊息…" value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(input); } }}/><button className="send-button" onClick={() => void send(input)} disabled={sending || !input.trim()} aria-label="送出"><Send size={18}/></button></div></div>
      </section>
      <aside className={`customer-panel ${detailsOpen ? "open" : ""}`}><div className="customer-title"><h2>顧客資訊</h2><button aria-label="關閉顧客資訊" onClick={() => setDetailsOpen(false)}><X size={18}/></button></div><div className="customer-id"><div className="avatar big">{selected.avatar}</div><div>{editingName ? <input className="inline-input" aria-label="顧客名稱" value={selected.name} onChange={event => updateSelected(conversation => ({ ...conversation, name: event.target.value }))}/> : <strong>{selected.name}</strong>}<span>{selected.lineId}</span></div><button aria-label="編輯顧客名稱" onClick={() => setEditingName(!editingName)}>{editingName ? <Save size={16}/> : <Edit3 size={16}/>}</button></div><dl><div><dt>目前狀態</dt><dd className={selected.status}>{selected.status === "human" ? "人工處理" : selected.status === "resolved" ? "已結案" : "AI 協助"}</dd></div><div><dt>負責人員</dt><dd>{selected.assignee || "尚未指派"}</dd></div></dl>
        <section className="side-section"><header><h3>標籤</h3><button aria-label="編輯標籤" onClick={() => setEditingTags(!editingTags)}><Edit3 size={15}/></button></header><div className="tags">{selected.tags.map(tag => <button key={tag} title="點擊移除" onClick={() => editingTags && updateSelected(conversation => ({ ...conversation, tags: conversation.tags.filter(item => item !== tag) }))}>{tag}</button>)}</div>{editingTags ? <div className="inline-add"><input aria-label="新增標籤" value={tagInput} onChange={event => setTagInput(event.target.value)} placeholder="新增標籤"/><button onClick={() => { if (!tagInput.trim()) return; updateSelected(conversation => ({ ...conversation, tags: [...new Set([...conversation.tags, tagInput.trim()])] })); setTagInput(""); }}>新增</button></div> : null}</section>
        <section className="side-section"><header><h3>備註</h3><button aria-label="編輯備註" onClick={() => setEditingNote(!editingNote)}>{editingNote ? <Save size={15}/> : <Edit3 size={15}/>}</button></header>{editingNote ? <textarea className="note-editor" aria-label="內部備註" value={selected.note || ""} onChange={event => updateSelected(conversation => ({ ...conversation, note: event.target.value }))}/> : <p>{selected.note || "尚無內部備註"}</p>}</section>
        <section className="side-section ai-status"><header><h3>AI 處理狀態</h3><span><Check size={14}/>已完成</span></header><div className="summary">系統會使用知識庫產生草稿；空房、健康與爭議問題保留人工確認。</div></section>
        <div className="warning-card"><AlertTriangle size={20}/><div><strong>訂單管理</strong><span>{selected.orders?.length ? `已有 ${selected.orders.length} 筆訂單` : "尚未建立預約訂單"}</span><button onClick={() => setOrderOpen(true)}>建立預約訂單</button></div></div>
        <section className="recent-order"><header><h3>近期訂單</h3><button onClick={() => setOrderOpen(true)}>新增</button></header>{selected.orders?.length ? selected.orders.slice(0, 3).map(order => <div key={order.id}><span><Clock3 size={16}/>{order.date}</span><strong>{order.title}</strong><em>NT${order.amount.toLocaleString()}</em></div>) : <p className="empty-copy">尚無訂單紀錄</p>}</section>
      </aside>
    </div>
    {orderOpen ? <div className="modal-backdrop" role="presentation"><section className="app-modal" role="dialog" aria-modal="true" aria-labelledby="order-title"><header><h2 id="order-title">建立預約訂單</h2><button aria-label="關閉" onClick={() => setOrderOpen(false)}><X size={19}/></button></header><label>訂單名稱<input value={orderDraft.title} onChange={event => setOrderDraft(old => ({ ...old, title: event.target.value }))}/></label><label>入住日期<input type="date" value={orderDraft.date} onChange={event => setOrderDraft(old => ({ ...old, date: event.target.value }))}/></label><label>預估金額<input inputMode="numeric" value={orderDraft.amount} onChange={event => setOrderDraft(old => ({ ...old, amount: event.target.value }))} placeholder="例如 1800"/></label><footer><button onClick={() => setOrderOpen(false)}>取消</button><button className="primary" onClick={createOrder}>建立訂單</button></footer></section></div> : null}
  </main>;
}
