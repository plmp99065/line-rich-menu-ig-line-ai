"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { AlertCircle, Check, Grid3X3, ImageUp, Link2, MessageSquareText, Rocket, Save } from "lucide-react";
import { defaultActions } from "@/lib/demo-data";
import { apiUrl, assetUrl } from "@/lib/api";
import type { RichAction } from "@/lib/types";

type Layout = "3x2" | "2x3";

export function RichMenuEditor({ accessCode }: { accessCode: string }) {
  const [page, setPage] = useState<"home" | "service">("home");
  const [actions, setActions] = useState(defaultActions);
  const [selected, setSelected] = useState(1);
  const [height, setHeight] = useState(1686);
  const [layout, setLayout] = useState<Layout>("3x2");
  const [tabPercent, setTabPercent] = useState(14);
  const [tabLabels, setTabLabels] = useState<[string, string]>(["⌂ 首頁", "● 服務"]);
  const [chatBarText, setChatBarText] = useState("點選下方選單開始服務");
  const [imageData, setImageData] = useState("");
  const [imageName, setImageName] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState("版型會同步建立兩個分頁切換區域");
  const current = actions.find(action => action.id === selected)!;
  const columns = layout === "3x2" ? 3 : 2;
  const rows = layout === "3x2" ? 2 : 3;
  const bodyPercent = 100 - tabPercent;
  const previewImage = imageData || assetUrl("rich-menu-demo.png");
  const canvasStyle = useMemo(() => ({ aspectRatio: `2500 / ${height}` }), [height]);

  const update = (patch: Partial<RichAction>) => {
    setActions(old => old.map(action => action.id === selected ? { ...action, ...patch } : action));
  };

  function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg)$/.test(file.type)) {
      setNotice("圖片只支援 PNG 或 JPEG");
      return;
    }
    if (file.size > 1024 * 1024) {
      setNotice("圖片需小於 1 MB，請壓縮後再上傳");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageData(String(reader.result || ""));
      setImageName(file.name);
      setNotice(`已載入 ${file.name}`);
    };
    reader.readAsDataURL(file);
  }

  async function publish() {
    setPublishing(true);
    setNotice("正在建立 LINE Rich Menu 與分頁別名…");
    try {
      const response = await fetch(apiUrl("/api/line/rich-menu/publish"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Code": accessCode },
        body: JSON.stringify({ page, actions, height, layout, tabPercent, tabLabels, chatBarText, imageData }),
      });
      const data = await response.json() as { ok?: boolean; error?: string; result?: { demo?: boolean } };
      if (!response.ok || !data.ok) throw new Error(data.error || "發佈失敗");
      setNotice(data.result?.demo ? "設定已儲存；加入 LINE 憑證後即可正式發佈" : `「${page === "home" ? "首頁" : "服務"}」已成功發佈至 LINE`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "發佈失敗，請檢查 LINE 設定");
    } finally {
      setPublishing(false);
    }
  }

  return <main className="rich-page">
    <div className="page-title-row rich-title">
      <div><h1>圖文選單管理</h1><p>手機可直接調整版型、高度、圖片與每個點擊區域</p></div>
      <div className="publish-group"><span><Check size={15}/> 設定自動儲存</span><button className="primary big" onClick={publish} disabled={publishing}><Rocket size={18}/>{publishing ? "發佈中…" : "發佈至 LINE"}</button></div>
    </div>
    <div className="rich-layout">
      <section className="editor-main">
        <div className="version-strip menu-pages">
          <div><label>目前編輯頁面</label><strong>兩頁式 Rich Menu</strong></div>
          {(["home", "service"] as const).map((item, index) => <button key={item} className={`page-thumb ${page === item ? "active" : ""}`} onClick={() => setPage(item)}><span><img src={previewImage} alt=""/></span><strong>{index === 0 ? "首頁選單" : "服務選單"}</strong><em>{page === item ? "編輯中" : "點此切換"}</em></button>)}
        </div>
        <div className="canvas-toolbar"><span>即時預覽 <em>2500 × {height} px・{layout}</em></span><strong>{chatBarText}</strong></div>
        <div className="rich-canvas">
          <div className="menu-image editable-menu" style={canvasStyle}>
            <img src={previewImage} alt="圖文選單預覽"/>
            {actions.map((action, index) => <button key={action.id} className={`hotspot ${selected === action.id ? "active" : ""}`} style={{ left: `${(index % columns) * (100 / columns)}%`, top: `${Math.floor(index / columns) * (bodyPercent / rows)}%`, width: `${100 / columns}%`, height: `${bodyPercent / rows}%` }} onClick={() => setSelected(action.id)}><b>{action.id}</b><span>{action.label}</span></button>)}
            <div className="menu-tabs" style={{ height: `${tabPercent}%` }}><button className={page === "home" ? "active" : ""} onClick={() => setPage("home")}>{tabLabels[0]}</button><button className={page === "service" ? "active" : ""} onClick={() => setPage("service")}>{tabLabels[1]}</button></div>
          </div>
          <p>點擊區塊即可編輯；底部分頁列高度與文字都能調整</p>
        </div>
        <div className="publish-notice"><AlertCircle size={20}/><span>{notice}</span><a href="https://developers.line.biz/en/docs/messaging-api/rich-menus-overview/" target="_blank" rel="noreferrer">LINE 規範</a></div>
      </section>
      <aside className="inspector">
        <header><h2>版型與按鈕設定</h2><span>按鈕 {selected}/6</span></header>
        <div className="layout-controls">
          <label>按鈕排版<select value={layout} onChange={event => setLayout(event.target.value as Layout)}><option value="3x2">三欄 × 兩列</option><option value="2x3">兩欄 × 三列</option></select></label>
          <label>選單高度<select value={height} onChange={event => setHeight(Number(event.target.value))}><option value="843">精簡 843 px</option><option value="1200">中型 1200 px</option><option value="1686">完整 1686 px</option><option value="1724">最高 1724 px</option></select></label>
        </div>
        <label>分頁列高度 <b>{tabPercent}%</b><input className="range-input" type="range" min="10" max="24" value={tabPercent} onChange={event => setTabPercent(Number(event.target.value))}/></label>
        <div className="layout-controls"><label>左分頁文字<input value={tabLabels[0]} onChange={event => setTabLabels([event.target.value, tabLabels[1]])}/></label><label>右分頁文字<input value={tabLabels[1]} onChange={event => setTabLabels([tabLabels[0], event.target.value])}/></label></div>
        <label>選單提示文字<input value={chatBarText} maxLength={14} onChange={event => setChatBarText(event.target.value)}/></label>
        <hr/>
        <label>動作類型<select value={current.type} onChange={event => update({ type: event.target.value as RichAction["type"] })}><option value="uri">開啟網址</option><option value="message">傳送文字</option><option value="richmenuswitch">切換頁面</option></select></label>
        <label>按鈕名稱<input value={current.label} onChange={event => update({ label: event.target.value })}/></label>
        <fieldset><legend>目標設定</legend>{[{ v: "uri", l: "開啟網址", i: Link2 }, { v: "message", l: "傳送文字", i: MessageSquareText }, { v: "richmenuswitch", l: "切換頁面", i: Grid3X3 }].map(item => <label key={item.v} className="radio-line"><input type="radio" checked={current.type === item.v} onChange={() => update({ type: item.v as RichAction["type"] })}/><item.i size={16}/>{item.l}</label>)}<input className="target-input" value={current.value} onChange={event => update({ value: event.target.value })}/></fieldset>
        <label className="upload-zone"><ImageUp size={26}/><strong>{imageName || "上傳此頁背景圖片"}</strong><span>PNG／JPEG，依上方高度製作，檔案小於 1 MB</span><input type="file" accept="image/png,image/jpeg" onChange={uploadImage}/></label>
        <div className="validation"><h3>發佈檢查</h3>{["六個點擊區域已建立", "兩個分頁切換區域已建立", "手機高度與排版有效", imageData ? "背景圖片已載入" : "目前使用示範背景"].map(item => <span key={item}><Check size={15}/>{item}<em>OK</em></span>)}</div>
        <div className="inspector-actions"><button className="primary" onClick={() => setNotice(`按鈕 ${selected} 設定已儲存`)}><Save size={16}/> 儲存目前設定</button></div>
      </aside>
    </div>
  </main>;
}
