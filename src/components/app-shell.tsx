"use client";

import { FormEvent, useEffect, useState } from "react";
import { BarChart3, BookOpen, Bot, Grid2X2, House, Inbox, Menu, Settings, Sparkles } from "lucide-react";
import type { NavKey } from "@/lib/types";
import { apiUrl } from "@/lib/api";
import { Dashboard } from "./dashboard";
import { InboxView } from "./inbox-view";
import { RichMenuEditor } from "./rich-menu-editor";
import { KnowledgeBase } from "./knowledge-base";
import { Analytics } from "./analytics";
import { AiSettings, SystemSettings } from "./settings-views";

const nav = [
  { id: "dashboard" as const, label: "總覽", icon: House },
  { id: "inbox" as const, label: "客服", icon: Inbox, count: 3 },
  { id: "richMenu" as const, label: "選單", icon: Grid2X2 },
  { id: "knowledge" as const, label: "知識庫", icon: BookOpen },
  { id: "ai" as const, label: "AI 設定", icon: Bot },
  { id: "analytics" as const, label: "數據", icon: BarChart3 },
  { id: "settings" as const, label: "設定", icon: Settings },
];

const mobileNav = nav.filter(item => ["dashboard", "inbox", "richMenu", "settings"].includes(item.id));

export function AppShell() {
  const [active, setActive] = useState<NavKey>("inbox");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [deviceName, setDeviceName] = useState("");

  useEffect(() => {
    const savedCode = localStorage.getItem("wodejia-admin-code") || "";
    const savedName = localStorage.getItem("wodejia-device-name") || `iPhone ${Math.floor(Math.random() * 90 + 10)}`;
    setAccessCode(savedCode);
    setDeviceName(savedName);
    if (!savedCode) return setChecking(false);
    void verify(savedCode, savedName, false);
  }, []);

  async function verify(code: string, name: string, remember = true) {
    setChecking(true);
    setLoginError("");
    const deviceId = localStorage.getItem("wodejia-device-id") || crypto.randomUUID();
    try {
      const response = await fetch(apiUrl("/api/session/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Code": code },
        body: JSON.stringify({ deviceId, deviceName: name || "iPhone" }),
      });
      if (!response.ok) throw new Error("管理碼不正確");
      localStorage.setItem("wodejia-device-id", deviceId);
      if (remember) {
        localStorage.setItem("wodejia-admin-code", code);
        localStorage.setItem("wodejia-device-name", name || "iPhone");
      }
      setAuthenticated(true);
    } catch (error) {
      setAuthenticated(false);
      setLoginError(error instanceof Error ? error.message : "無法登入");
    } finally {
      setChecking(false);
    }
  }

  function submitLogin(event: FormEvent) {
    event.preventDefault();
    void verify(accessCode.trim(), deviceName.trim());
  }

  if (!authenticated) {
    return <main className="app-login"><form onSubmit={submitLogin}><div className="login-mark">窩</div><h1>窩的家客服</h1><p>兩台裝置使用同一組管理碼，訊息與接手狀態會自動同步。</p><label>裝置名稱<input value={deviceName} onChange={event => setDeviceName(event.target.value)} placeholder="例如：店長 iPhone" autoComplete="nickname" /></label><label>管理碼<input type="password" value={accessCode} onChange={event => setAccessCode(event.target.value)} placeholder="輸入管理碼" autoComplete="current-password" /></label>{loginError && <div className="login-error">{loginError}</div>}<button disabled={checking || !accessCode.trim()}>{checking ? "連線中…" : "登入客服 App"}</button><small>本系統不會要求 Apple ID、信用卡或裝置管理權限。</small></form></main>;
  }

  const render = () => {
    if (active === "dashboard") return <Dashboard onNavigate={setActive} />;
    if (active === "inbox") return <InboxView accessCode={accessCode} />;
    if (active === "richMenu") return <RichMenuEditor />;
    if (active === "knowledge") return <KnowledgeBase />;
    if (active === "analytics") return <Analytics />;
    if (active === "ai") return <AiSettings />;
    return <SystemSettings />;
  };

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
      <div className="brand"><div className="brand-mark">窩</div><div><strong>窩的家客服</strong><span>倉鼠住宿・寵物用品</span></div></div>
      <nav aria-label="主要導覽">{nav.map(item => <button key={item.id} className={active === item.id ? "nav-item active" : "nav-item"} onClick={() => { setActive(item.id); setMobileOpen(false); }}><item.icon size={20} strokeWidth={1.8}/><span>{item.label}</span>{item.count ? <b>{item.count}</b> : null}</button>)}</nav>
      <div className="sidebar-spacer"/><div className="online"><i/> 兩台裝置同步中</div>
      <button className="profile" onClick={() => { localStorage.removeItem("wodejia-admin-code"); setAuthenticated(false); }}><div className="avatar small">店</div><span><strong>{deviceName}</strong><em>點此登出</em></span><Menu size={16}/></button>
    </aside>
    <div className="main-stage"><header className="mobile-header"><button onClick={() => setMobileOpen(!mobileOpen)} aria-label="開啟完整選單"><Menu/></button><strong>窩的家客服</strong><span><Sparkles size={16}/> 同步中</span></header>{render()}</div>
    <nav className="mobile-tabbar" aria-label="手機導覽">{mobileNav.map(item => <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => setActive(item.id)}><item.icon size={21}/><span>{item.label}</span>{item.count ? <b>{item.count}</b> : null}</button>)}</nav>
    {mobileOpen && <button className="scrim" aria-label="關閉選單" onClick={() => setMobileOpen(false)}/>} 
  </div>;
}
