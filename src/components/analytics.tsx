"use client";

import { useEffect, useState } from "react";
import { Bot, MessageCircle, MousePointerClick, UserRound } from "lucide-react";
import { apiUrl } from "@/lib/api";
import type { Metrics } from "@/lib/types";

const emptyMetrics: Metrics = { conversations: 0, unread: 0, pending: 0, aiResolved: 0, human: 0, resolved: 0, menuClicks: 0, knowledgeDocuments: 0, topics: [], daily: [] };

export function Analytics({ accessCode }: { accessCode: string }) {
  const [metrics, setMetrics] = useState(emptyMetrics);
  const [range, setRange] = useState("7");
  useEffect(() => { let active = true; void fetch(apiUrl("/api/metrics"), { headers: { "X-Admin-Code": accessCode } }).then(async response => response.json() as Promise<{ metrics?: Metrics }>).then(data => { if (active && data.metrics) setMetrics(data.metrics); }); return () => { active = false; }; }, [accessCode, range]);
  const total = Math.max(1, metrics.conversations);
  const cards = [
    { l: "總對話數", v: metrics.conversations, d: `${metrics.unread} 則未讀`, i: MessageCircle },
    { l: "AI 處理率", v: `${Math.round(metrics.aiResolved / total * 100)}%`, d: `${metrics.aiResolved} 則`, i: Bot },
    { l: "人工接手率", v: `${Math.round(metrics.human / total * 100)}%`, d: `${metrics.human} 則`, i: UserRound },
    { l: "選單點擊", v: metrics.menuClicks, d: "已啟用點擊追蹤", i: MousePointerClick },
  ];
  const maxBar = Math.max(1, ...metrics.daily.map(item => item.conversations));
  return <main className="content-page"><div className="page-title-row"><div><h1>數據分析</h1><p>使用實際對話與圖文選單點擊資料</p></div><select className="date-select" aria-label="分析期間" value={range} onChange={event => setRange(event.target.value)}><option value="7">最近 7 天</option><option value="30">最近 30 天</option></select></div><div className="metric-row">{cards.map(item => <article key={item.l}><item.i size={20}/><span>{item.l}</span><strong>{item.v}</strong><em>{item.d}</em></article>)}</div><div className="analytics-grid"><section className="chart-panel"><header><h2>每日對話量</h2><span><i/>對話數</span></header><div className="bar-chart">{metrics.daily.map(item => <div key={item.label}><span style={{ height: `${Math.max(8, item.conversations / maxBar * 100)}%` }} title={`${item.conversations} 則`}/><b>{item.conversations}</b><em>{item.label}</em></div>)}</div></section><section className="topic-panel"><header><h2>熱門問題</h2></header>{metrics.topics.length ? metrics.topics.map((item, index) => <div key={item.label}><b>{index + 1}</b><span>{item.label}</span><em>{item.count} 次</em></div>) : <p className="empty-copy">收到更多顧客訊息後會顯示熱門問題。</p>}</section></div></main>;
}
