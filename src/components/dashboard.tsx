"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Bot, CheckCircle2, Clock3, Inbox, MousePointerClick, UserRound } from "lucide-react";
import { apiUrl } from "@/lib/api";
import type { Metrics, NavKey } from "@/lib/types";

const emptyMetrics: Metrics = { conversations: 0, unread: 0, pending: 0, aiResolved: 0, human: 0, resolved: 0, menuClicks: 0, knowledgeDocuments: 0, topics: [], daily: [] };

export function Dashboard({ accessCode, onNavigate }: { accessCode: string; onNavigate: (key: NavKey) => void }) {
  const [metrics, setMetrics] = useState(emptyMetrics);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void fetch(apiUrl("/api/metrics"), { headers: { "X-Admin-Code": accessCode } }).then(async response => response.json() as Promise<{ metrics?: Metrics }>).then(data => { if (active && data.metrics) setMetrics(data.metrics); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessCode]);
  const totalHandled = Math.max(1, metrics.aiResolved + metrics.human + metrics.resolved);
  const aiRate = Math.round(metrics.aiResolved / totalHandled * 100);
  const humanRate = Math.round(metrics.human / totalHandled * 100);
  const stats = [
    { l: "目前對話", v: metrics.conversations, d: `${metrics.unread} 則未讀訊息`, i: Inbox },
    { l: "AI 處理率", v: `${aiRate}%`, d: `${metrics.aiResolved} 則 AI 協助`, i: Bot },
    { l: "人工接手率", v: `${humanRate}%`, d: `${metrics.human} 則人工處理`, i: UserRound },
    { l: "選單點擊", v: metrics.menuClicks, d: "近 7 天實際點擊", i: MousePointerClick },
  ];
  const date = new Intl.DateTimeFormat("zh-TW", { dateStyle: "long", timeZone: "Asia/Taipei" }).format(new Date());
  return <main className="content-page">
    <div className="page-title-row"><div><h1>營運總覽</h1><p>掌握目前 LINE 客服與圖文選單成效</p></div><span className="date-chip">{date}</span></div>
    <div className="stat-grid" aria-busy={loading}>{stats.map(item => <article key={item.l} className={loading ? "skeleton-card" : ""}><item.i size={22}/><span>{item.l}</span><strong>{loading ? "—" : item.v}</strong><em>{loading ? "正在更新" : item.d}</em></article>)}</div>
    <div className="dashboard-grid">
      <section className="activity-panel"><header><h2>待處理事項</h2><button onClick={() => onNavigate("inbox")}>查看收件匣 <ArrowRight size={15}/></button></header>
        <button className="task-row task-button" onClick={() => onNavigate("inbox")}><i className="urgent"><Clock3 size={18}/></i><span><strong>{metrics.pending} 則對話等待處理</strong><em>包含 {metrics.unread} 則未讀訊息</em></span><ArrowRight size={16}/></button>
        <button className="task-row task-button" onClick={() => onNavigate("knowledge")}><i className="done"><CheckCircle2 size={18}/></i><span><strong>知識庫目前有 {metrics.knowledgeDocuments} 份文件</strong><em>可隨時新增、搜尋或刪除</em></span><ArrowRight size={16}/></button>
        <button className="task-row task-button" onClick={() => onNavigate("richMenu")}><i className="warning"><MousePointerClick size={18}/></i><span><strong>圖文選單近 7 天點擊 {metrics.menuClicks} 次</strong><em>開啟選單可修改連結與回覆</em></span><ArrowRight size={16}/></button>
      </section>
      <section className="resolution-panel"><header><h2>目前客服狀態</h2><span>共 {metrics.conversations} 則對話</span></header><div className="donut" style={{ "--value": `${aiRate}%` } as React.CSSProperties}><strong>{aiRate}%</strong><span>AI 處理</span></div><div className="legend"><span><i className="green"/>AI 協助 <b>{metrics.aiResolved}</b></span><span><i className="orange"/>人工接手 <b>{metrics.human}</b></span><span><i className="gray"/>已結案 <b>{metrics.resolved}</b></span></div></section>
    </div>
  </main>;
}
