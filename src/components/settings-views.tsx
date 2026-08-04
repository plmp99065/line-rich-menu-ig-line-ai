"use client";

import { useEffect, useState } from "react";
import { Bot, Check, Clipboard, KeyRound, LoaderCircle, Save, ShieldCheck, Sparkles, Webhook } from "lucide-react";
import { apiUrl } from "@/lib/api";
import type { AppSettings } from "@/lib/types";

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
  const [state, setState] = useState<"loading" | "saved" | "saving" | "error">("loading");
  useEffect(() => { let active = true; void fetch(apiUrl("/api/settings/ai"), { headers: { "X-Admin-Code": accessCode } }).then(async response => response.json() as Promise<{ settings?: AppSettings }>).then(data => { if (active && data.settings) setSettings(data.settings); }).then(() => { if (active) setState("saved"); }).catch(() => setState("error")); return () => { active = false; }; }, [accessCode]);
  async function save(next = settings) {
    setState("saving");
    const response = await fetch(apiUrl("/api/settings/ai"), { method: "PUT", headers: { "Content-Type": "application/json", "X-Admin-Code": accessCode }, body: JSON.stringify(next) });
    setState(response.ok ? "saved" : "error");
  }
  function update(patch: Partial<AppSettings>) { setSettings(old => ({ ...old, ...patch })); setState("saved"); }
  function toggleRule(rule: string, enabled: boolean) { const handoffRules = enabled ? [...new Set([...settings.handoffRules, rule])] : settings.handoffRules.filter(item => item !== rule); update({ handoffRules }); }
  return <main className="content-page settings-page"><div className="page-title-row"><div><h1>AI 客服設定</h1><p>設定會同步到 Webhook 與客服草稿</p></div><button className="primary ai-save" onClick={() => void save()} disabled={state === "saving"}><Save size={15}/>{state === "saving" ? "儲存中…" : "儲存 AI 設定"}</button></div>
    <div className={`settings-notice settings-state ${state}`} role="status">{state === "loading" ? "正在讀取設定…" : state === "saving" ? "正在同步兩台裝置…" : state === "error" ? "設定儲存失敗，請稍後重試" : <><Check size={14}/>設定已同步</>}</div>
    <section className="settings-card"><header><Bot/><div><h2>回覆模式</h2><p>開啟自動回覆後，非固定選單問題會由 AI 直接回覆</p></div></header><label className="setting-row"><span><strong>AI 自動回覆</strong><em>高風險問題仍會依下方規則轉人工</em></span><input type="checkbox" checked={settings.autoReply} onChange={event => update({ autoReply: event.target.checked })}/></label><label className="field">使用模型<select value={settings.model} onChange={event => update({ model: event.target.value })}><option value="gpt-5-mini">gpt-5-mini（建議）</option><option value="gpt-5.1">gpt-5.1</option></select></label><label className="field">客服語氣<textarea value={settings.tone} onChange={event => update({ tone: event.target.value })}/></label></section>
    <section className="settings-card"><header><ShieldCheck/><div><h2>強制轉人工規則</h2><p>符合以下內容時停止 AI 自動回覆</p></div></header>{defaultRules.map(item => <label className="check-row" key={item}><input type="checkbox" checked={settings.handoffRules.includes(item)} onChange={event => toggleRule(item, event.target.checked)}/>{item}</label>)}</section>
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
    <div className="page-title-row"><div><h1>系統設定</h1><p>自行填入 API 憑證，儲存後由伺服器驗證連線</p></div>{loading ? <span className="saved"><LoaderCircle className="spin" size={15}/>讀取中</span> : null}</div>
    <section className="integration-list"><article><div className="integration-icon line">LINE</div><div><h2>LINE Messaging API</h2><p>接收訊息、發送回覆與管理 Rich Menu</p></div><span className={lineReady ? "connected" : "pending"}>{lineReady ? "已設定" : "待設定"}</span><button onClick={() => void test("line")} disabled={testing === "line"}>{testing === "line" ? "驗證中" : "驗證"}</button></article><article><div className="integration-icon"><Sparkles/></div><div><h2>OpenAI</h2><p>產生客服草稿與知識庫回答</p></div><span className={status.configured.OPENAI_API_KEY ? "connected" : "pending"}>{status.configured.OPENAI_API_KEY ? "已設定" : "待設定"}</span><button onClick={() => void test("openai")} disabled={testing === "openai"}>{testing === "openai" ? "驗證中" : "驗證"}</button></article></section>
    <section className="settings-card credentials-card"><header><KeyRound/><div><h2>API 憑證設定</h2><p>欄位只會送到 Cloudflare 後端並以 AES-256 加密；頁面不會讀回完整內容</p></div></header><CredentialField label="OpenAI API Key" value={credentials.OPENAI_API_KEY} configured={status.configured.OPENAI_API_KEY} placeholder="sk-…" onChange={value => setCredentials(old => ({ ...old, OPENAI_API_KEY: value }))}/><CredentialField label="LINE Channel Secret" value={credentials.LINE_CHANNEL_SECRET} configured={status.configured.LINE_CHANNEL_SECRET} placeholder="輸入 Channel Secret" onChange={value => setCredentials(old => ({ ...old, LINE_CHANNEL_SECRET: value }))}/><CredentialField label="LINE Channel Access Token" value={credentials.LINE_CHANNEL_ACCESS_TOKEN} configured={status.configured.LINE_CHANNEL_ACCESS_TOKEN} placeholder="輸入長效 Access Token" onChange={value => setCredentials(old => ({ ...old, LINE_CHANNEL_ACCESS_TOKEN: value }))}/><button className="primary credential-save" onClick={() => void saveCredentials()} disabled={saving || !hasInput}><Save size={16}/>{saving ? "加密儲存中…" : "安全儲存憑證"}</button>{notice ? <div className="settings-notice" role="status">{notice}</div> : null}</section>
    <section className="settings-card"><header><Webhook/><div><h2>Webhook 網址</h2><p>將此網址填入 LINE Developers Console，並啟用 Use webhook</p></div></header><div className="copy-field"><code>{status.webhookUrl}</code><button onClick={() => void copyWebhook()}><Clipboard size={14}/>複製</button></div></section>
  </main>;
}
