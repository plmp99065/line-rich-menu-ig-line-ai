"use client";
import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";
import { defaultBusinessHours, type BusinessHours } from "@/lib/business-hours";

export function BusinessHoursSettings({ accessCode }: { accessCode: string }) {
  const [settings, setSettings] = useState<BusinessHours>(defaultBusinessHours);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("正在讀取營業時間…");
  useEffect(() => {
    let active = true;
    fetch(apiUrl("/api/settings/business-hours"), { cache: "no-store", headers: { "X-Admin-Code": accessCode } })
      .then(async r => { if (!r.ok) throw new Error("讀取失敗，請重新開啟設定"); return r.json() as Promise<{ settings: BusinessHours }>; })
      .then(data => { if (active) { setSettings(data.settings); setReady(true); setNotice(""); } })
      .catch(error => { if (active) setNotice(error.message); });
    return () => { active = false; };
  }, [accessCode]);
  async function save() {
    setSaving(true);
    try {
      const r = await fetch(apiUrl("/api/settings/business-hours"), { method: "PUT", headers: { "Content-Type": "application/json", "X-Admin-Code": accessCode }, body: JSON.stringify(settings) });
      const data = await r.json() as { error?: string };
      if (!r.ok) throw new Error(data.error || "儲存失敗");
      setNotice(settings.enabled ? "已儲存並啟用休息回覆" : "已儲存，休息回覆已關閉");
    } catch (error) { setNotice(error instanceof Error ? error.message : "連線失敗"); }
    finally { setSaving(false); }
  }
  return <section className="settings-card"><header><div><h2>營業時間與休息回覆</h2><p>台灣時間。同一位顧客每 60 分鐘最多提醒一次。</p></div></header>
    <fieldset disabled={!ready || saving} style={{ border: 0, padding: 0, minWidth: 0 }}>
      <label className="check-row"><input type="checkbox" checked={settings.enabled} onChange={e => setSettings(s => ({ ...s, enabled: e.target.checked }))}/>啟用休息時段自動回覆</label>
      <p>休息時段優先傳送提醒，暫停選單固定回覆及 AI 自動回覆；人工仍可回覆。</p>
      {settings.days.map((day, i) => <div key={i} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #e5ebe8" }}>
        <label><input type="checkbox" checked={day.open} onChange={e => setSettings(s => ({ ...s, days: s.days.map((d, j) => j === i ? { ...d, open: e.target.checked } : d) }))}/>週{["日", "一", "二", "三", "四", "五", "六"][i]} {day.open ? "營業" : "公休"}</label>
        {day.open && (["start", "end"] as const).map((key, k) => <label key={key}>{k === 0 ? "開始 " : "結束 "}<input style={{ minHeight: 44, fontSize: 16 }} type="time" aria-label={`週${i} ${key}`} value={day[key]} onChange={e => setSettings(s => ({ ...s, days: s.days.map((d, j) => j === i ? { ...d, [key]: e.target.value } : d) }))}/></label>)}
      </div>)}
      <p>結束時間早於開始時間代表跨午夜。預填時間僅供編輯，請調整為實際營業時間。</p>
      <label className="field">休息回覆內容<textarea maxLength={1000} value={settings.message} onChange={e => setSettings(s => ({ ...s, message: e.target.value }))}/></label>
      <button className="primary" style={{ minHeight: 44 }} onClick={() => void save()}>{saving ? "儲存中…" : "儲存營業時間"}</button>
    </fieldset><p role="status">{notice}</p>
  </section>;
}
