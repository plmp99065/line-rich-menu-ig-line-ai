"use client";

import { useEffect, useState } from "react";
import { Bot, Check, Clipboard, KeyRound, LoaderCircle, Save, ShieldCheck, Sparkles, Webhook } from "lucide-react";
import { apiUrl } from "@/lib/api";
import type { AppSettings } from "@/lib/types";
import { BusinessHoursSettings } from "./business-hours-settings";

type CredentialName = "OPENAI_API_KEY" | "LINE_CHANNEL_SECRET" | "LINE_CHANNEL_ACCESS_TOKEN";
type IntegrationStatus = { configured: Record<CredentialName, boolean>; webhookUrl: string };

const emptyCredentials: Record<CredentialName, string> = { OPENAI_API_KEY: "", LINE_CHANNEL_SECRET: "", LINE_CHANNEL_ACCESS_TOKEN: "" };
const emptyStatus: Record<CredentialName, boolean> = { OPENAI_API_KEY: false, LINE_CHANNEL_SECRET: false, LINE_CHANNEL_ACCESS_TOKEN: false };

function CredentialField({ label, value, configured, placeholder, onChange }: { label: string; value: string; configured: boolean; placeholder: string; onChange: (value: string) => void }) {
  return <label className="credential-field"><span><strong>{label}</strong><em className={configured ? "connected" : "pending"}>{configured ? "已安全設定" : "尚未設定"}</em></span><input type="password" value={value} onChange={event => onChange(event.target.value)} placeholder={configured ? "輸入新值可覆蓋目前設定" : placeholder} autoComplete="new-password" spellCheck={false}/></label>;
}

const defaultRules = ["空房、即時名額或預約確認", "倉鼠生病、受傷或緊急狀況", "退款、客訴或消費爭議", "AI 信心不足或知識庫無答案"];

export function AiSettings({ accessCode }: { accessCode: string }) {
  const [settings, setSettings] = useState<AppSettings>({ autoReply: false, model: "gpt-5-mini", tone: "使用繁體中文，親切、精準、避免過度承諾；回答控制在 120 字內。", handoffRules: defaultRules });
  const [state, setState] = useState<"loading" | "saved" | "dirty" | "saving" | "error">("loading");
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");
  const [liveAuto, setLiveAuto] = useState(false);
  useEffect(() => { let active = true; void fetch(apiUrl("/api/settings/ai"), { headers: { "X-Admin-Code": accessCode } }).then(async response => { if (!response.ok) throw new Error("無法讀取設定"); return response.json() as Promise<{ settings?: AppSettings }>; }).then(data => { if (active && data.settings) { setSettings(data.settings); setLiveAuto(data.settings.autoReply); setLoaded(true); setState("saved"); } }).catch(() => { if (active) setState("error"); }); return () => { active = false; }; }, [accessCode]);
  async function save(next = settings) {
    setState("saving");
    setNotice("");
    try {
      const response = await fetch(apiUrl("/api/settings/ai"), { method: "PUT", headers: { "Content-Type": "application/json", "X-Admin-Code": accessCode }, body: JSON.stringify(next) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "設定儲存失敗");
      setSettings(next); setLiveAuto(next.autoReply); setState("saved");
    } catch (error) { setNotice(error instanceof Error ? error.message : "連線失敗，請重試"); setState("error"); }
  }
  function update(patch: Partial<AppSettings>) { setSettings(old => ({ ...old, ...patch })); setState("dirty"); }
  function toggleRule(rule: string, enabled: boolean) { const handoffRules = enabled ? [...new Set([...settings.handoffRules, rule])] : settings.handoffRules.filter(item => item !== rule); update({ handoffRules }); }
  return <main className="content-page settings-page"><div className="page-title-row"><div><h1>AI 客服設定</h1><p>先確認基本內容，再讓 AI 自動回答</p></div><button className="primary ai-save" onClick={() => void save()} disabled={!loaded || state === "saving"}><Save size={15}/>{state === "saving" ? "儲存中…" : "儲存設定"}</button></div>
    <div className={`settings-notice settings-state ${state}`} role="status">{state === "loading" ? "正在讀取設定…" : state === "saving" ? "正在儲存…" : state === "dirty" ? "有尚未儲存的修改；線上仍使用上次核准內容" : state === "error" ? notice || "無法讀取設定，請重新開啟此頁" : <><Check size={14}/>設定已同步</>}</div>
    <section className="settings-card"><header><Bot/><div><h2>{liveAuto ? "自動發送已開啟" : "自動發送已關閉"}</h2><p>不必逐則確認；只依您核准的內容回答。資料不足或人工接手時停止自動發送。</p></div></header><button className={liveAuto ? "danger" : "primary"} style={{ minHeight: 48, width: "100%" }} disabled={!loaded || state === "saving" || (!liveAuto && (!settings.replyBaseConfirmed || !settings.approvedReplyBase?.trim()))} onClick={() => void save({ ...settings, autoReply: !liveAuto })}>{liveAuto ? "關閉自動發送（立即儲存）" : "儲存並開啟自動發送"}</button><p>關閉後保留人工草稿。固定選單回覆及休息時間提醒使用各自設定，不受此開關影響。既有人工處理中的對話不會自動接管。</p></section>
    <fieldset disabled={!loaded || state === "saving"} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
    <section className="settings-card"><header><ShieldCheck/><div><h2>1. 確認基本回覆內容</h2><p>填入已確認的問答、價目、地址與服務規定；未寫在這裡的資訊不會由 AI 猜測。</p></div></header><label className="field">已核准的客服資料<textarea rows={12} style={{ minHeight: 240, width: "100%", fontSize: 16 }} maxLength={12000} value={settings.approvedReplyBase || ""} placeholder={"範例格式（請填寫實際資料）：\n問題：營業時間？\n回覆：……\n\n問題：如何預約？\n回覆：……"} onChange={event => update({ approvedReplyBase: event.target.value, replyBaseConfirmed: false, autoReply: false })}/></label><label className="check-row" style={{ minHeight: 48 }}><input type="checkbox" checked={Boolean(settings.replyBaseConfirmed)} disabled={!settings.approvedReplyBase?.trim()} onChange={event => update({ replyBaseConfirmed: event.target.checked, autoReply: event.target.checked ? settings.autoReply : false })}/>我已確認以上內容正確，可供 AI 自動回覆</label><p>修改內容後須重新確認並儲存；未儲存前仍使用線上原設定。</p></section>
    <section className="settings-card"><header><Sparkles/><div><h2>2. 回覆語氣</h2><p>AI 可整理語句、帶入顧客稱呼與問題，但不自行承諾預約結果。</p></div></header><label className="field">使用模型<select value={settings.model} onChange={event => update({ model: event.target.value })}><option value="gpt-5-mini">gpt-5-mini（建議）</option><option value="gpt-5.1">gpt-5.1</option></select></label><label className="field">客服語氣<textarea value={settings.tone} onChange={event => update({ tone: event.target.value })}/></label></section>
    <section className="settings-card"><header><ShieldCheck/><div><h2>強制轉人工規則</h2><p>符合以下內容時停止 AI 自動回覆</p></div></header>{defaultRules.map(item => <label className="check-row" key={item}><input type="checkbox" checked={settings.handoffRules.includes(item)} onChange={event => toggleRule(item, event.target.checked)}/>{item}</label>)}</section>
    </fieldset>
  </main>;
}

export function SystemSettings({ accessCode }: { accessCode: string }) {
  const [status, setStatus] = useState<IntegrationStatus>({ configured: emptyStatus, webhookUrl: "https://wodejia-line-console.plmp99065.workers.dev/api/line/webhook" });
  const [credentials, setCredentials] = useState(emptyCredentials);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<"openai" | "line" | "">("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    fetch(apiUrl("/api/integrations/status"), { headers: { "X-Admin-Code": accessCode } }).then(async response => await response.json() as IntegrationStatus).then(data => { if (active && data.configured) setStatus(data); }).catch(() => setNotice("暫時無法讀取連線狀態")).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessCode]);

  async function saveCredentials() {
    setSaving(true); setNotice("");
    try {
      const response = await fetch(apiUrl("/api/integrations/credentials"), { method: "POST", headers: { "Content-Type": "application/json", "X-Admin-Code": accessCode }, body: JSON.stringify(credentials) });
      const data = await response.json() as IntegrationStatus & { error?: string };
      if (!response.ok) throw new Error(data.error || "儲存失敗");
      setStatus(data);
      setCredentials({ ...emptyCredentials });
      setNotice("憑證已加密儲存，現在可以進行連線驗證");
    } catch (error) { setNotice(error instanceof Error ? error.message : "儲存失敗"); }
    finally { setSaving(false); }
  }

  async function test(provider: "openai" | "line") {
    setTesting(provider); setNotice("");
    try {
      const response = await fetch(apiUrl("/api/integrations/test"), { method: "POST", headers: { "Content-Type": "application/json", "X-Admin-Code": accessCode }, body: JSON.stringify({ provider }) });
      const data = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || "驗證失敗");
      setNotice(data.message || "驗證成功");
    } catch (error) { setNotice(error instanceof Error ? error.message : "驗證失敗"); }
    finally { setTesting(""); }
  }

  async function copyWebhook() {
    await navigator.clipboard.writeText(status.webhookUrl);
    setNotice("Webhook 網址已複製");
  }

  const lineReady = status.configured.LINE_CHANNEL_SECRET && status.configured.LINE_CHANNEL_ACCESS_TOKEN;
  const hasInput = Object.values(credentials).some(value => value.trim());

  return <main className="content-page settings-page">
    <BusinessHoursSettings accessCode={accessCode}/>
    <div className="page-title-row"><div><h1>系統設定</h1><p>自行填入 API 憑證，儲存後由伺服器驗證連線</p></div>{loading ? <span className="saved"><LoaderCircle className="spin" size={15}/>讀取中</span> : null}</div>
    <section className="integration-list"><article><div className="integration-icon line">LINE</div><div><h2>LINE Messaging API</h2><p>接收訊息、發送回覆與管理 Rich Menu</p></div><span className={lineReady ? "connected" : "pending"}>{lineReady ? "已設定" : "待設定"}</span><button onClick={() => void test("line")} disabled={testing === "line"}>{testing === "line" ? "驗證中" : "驗證"}</button></article><article><div className="integration-icon"><Sparkles/></div><div><h2>OpenAI</h2><p>產生客服草稿與知識庫回答</p></div><span className={status.configured.OPENAI_API_KEY ? "connected" : "pending"}>{status.configured.OPENAI_API_KEY ? "已設定" : "待設定"}</span><button onClick={() => void test("openai")} disabled={testing === "openai"}>{testing === "openai" ? "驗證中" : "驗證"}</button></article></section>
    <section className="settings-card credentials-card"><header><KeyRound/><div><h2>API 憑證設定</h2><p>欄位只會送到 Cloudflare 後端並以 AES-256 加密；頁面不會讀回完整內容</p></div></header><CredentialField label="OpenAI API Key" value={credentials.OPENAI_API_KEY} configured={status.configured.OPENAI_API_KEY} placeholder="sk-…" onChange={value => setCredentials(old => ({ ...old, OPENAI_API_KEY: value }))}/><CredentialField label="LINE Channel Secret" value={credentials.LINE_CHANNEL_SECRET} configured={status.configured.LINE_CHANNEL_SECRET} placeholder="輸入 Channel Secret" onChange={value => setCredentials(old => ({ ...old, LINE_CHANNEL_SECRET: value }))}/><CredentialField label="LINE Channel Access Token" value={credentials.LINE_CHANNEL_ACCESS_TOKEN} configured={status.configured.LINE_CHANNEL_ACCESS_TOKEN} placeholder="輸入長效 Access Token" onChange={value => setCredentials(old => ({ ...old, LINE_CHANNEL_ACCESS_TOKEN: value }))}/><button className="primary credential-save" onClick={() => void saveCredentials()} disabled={saving || !hasInput}><Save size={16}/>{saving ? "加密儲存中…" : "安全儲存憑證"}</button>{notice ? <div className="settings-notice" role="status">{notice}</div> : null}</section>
    <section className="settings-card"><header><Webhook/><div><h2>Webhook 網址</h2><p>將此網址填入 LINE Developers Console，並啟用 Use webhook</p></div></header><div className="copy-field"><code>{status.webhookUrl}</code><button onClick={() => void copyWebhook()}><Clipboard size={14}/>複製</button></div></section>
  </main>;
}
