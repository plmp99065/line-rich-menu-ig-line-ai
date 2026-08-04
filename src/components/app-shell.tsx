"use client";

import { useState } from "react";
import { BarChart3, BookOpen, Bot, Grid2X2, House, Inbox, Menu, Settings, Sparkles } from "lucide-react";
import type { NavKey } from "@/lib/types";
import { Dashboard } from "./dashboard";
import { InboxView } from "./inbox-view";
import { RichMenuEditor } from "./rich-menu-editor";
import { KnowledgeBase } from "./knowledge-base";
import { Analytics } from "./analytics";
import { AiSettings, SystemSettings } from "./settings-views";

const nav = [
  { id: "dashboard" as const, label: "總覽", icon: House },
  { id: "inbox" as const, label: "客服收件匣", icon: Inbox, count: 3 },
  { id: "richMenu" as const, label: "圖文選單", icon: Grid2X2 },
  { id: "knowledge" as const, label: "知識庫", icon: BookOpen },
  { id: "ai" as const, label: "AI 設定", icon: Bot },
  { id: "analytics" as const, label: "數據分析", icon: BarChart3 },
  { id: "settings" as const, label: "系統設定", icon: Settings },
];

export function AppShell() {
  const [active, setActive] = useState<NavKey>("inbox");
  const [mobileOpen, setMobileOpen] = useState(false);
  const render = () => {
    if (active === "dashboard") return <Dashboard onNavigate={setActive} />;
    if (active === "inbox") return <InboxView />;
    if (active === "richMenu") return <RichMenuEditor />;
    if (active === "knowledge") return <KnowledgeBase />;
    if (active === "analytics") return <Analytics />;
    if (active === "ai") return <AiSettings />;
    return <SystemSettings />;
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="brand"><div className="brand-mark">窩</div><div><strong>窩的家客服</strong><span>倉鼠住宿・寵物用品</span></div></div>
        <nav aria-label="主要導覽">
          {nav.map(item => <button key={item.id} className={active === item.id ? "nav-item active" : "nav-item"} onClick={() => { setActive(item.id); setMobileOpen(false); }}><item.icon size={20} strokeWidth={1.8}/><span>{item.label}</span>{item.count ? <b>{item.count}</b> : null}</button>)}
        </nav>
        <div className="sidebar-spacer" />
        <div className="online"><i /> 系統正常運作</div>
        <button className="profile"><div className="avatar small">林</div><span><strong>林小窩</strong><em>店主</em></span><Menu size={16}/></button>
      </aside>
      <div className="main-stage">
        <header className="mobile-header"><button onClick={() => setMobileOpen(!mobileOpen)} aria-label="開啟選單"><Menu /></button><strong>窩的家客服</strong><span><Sparkles size={16}/> AI 草稿中</span></header>
        {render()}
      </div>
      {mobileOpen && <button className="scrim" aria-label="關閉選單" onClick={() => setMobileOpen(false)} />}
    </div>
  );
}
