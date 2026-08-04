"use client";

import { useState } from "react";
import { AlertCircle, Check, ChevronLeft, ChevronRight, Grid3X3, ImageUp, Link2, MessageSquareText, Monitor, Rocket, Save, Smartphone, Trash2 } from "lucide-react";
import { defaultActions } from "@/lib/demo-data";
import type { RichAction } from "@/lib/types";

export function RichMenuEditor() {
  const [page, setPage] = useState<"home" | "service">("home");
  const [actions, setActions] = useState(defaultActions);
  const [selected, setSelected] = useState(1);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState("所有按鈕已設定完成");
  const current = actions.find(a => a.id === selected)!;
  const update = (patch: Partial<RichAction>) => setActions(old => old.map(a => a.id === selected ? { ...a, ...patch } : a));
  async function publish() {
    setPublishing(true); setNotice("正在建立 LINE Rich Menu…");
    try { const res = await fetch("/api/line/rich-menu/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ page, actions }) }); const data = await res.json(); setNotice(data.result?.demo ? "示範模式：加入 LINE 憑證後即可正式發佈" : "已成功發佈至 LINE"); }
    catch { setNotice("發佈失敗，請檢查 LINE 設定"); } finally { setPublishing(false); }
  }
  return <main className="rich-page">
    <div className="page-title-row rich-title"><div><h1>圖文選單管理</h1><p>建立兩頁式 LINE 圖文選單，設定每個區域的點擊動作</p></div><div className="publish-group"><span><Check size={15}/> 已儲存草稿</span><button className="primary big" onClick={publish} disabled={publishing}><Rocket size={18}/>{publishing ? "發佈中…" : "發佈至 LINE"}</button></div></div>
    <div className="rich-layout"><section className="editor-main">
      <div className="version-strip"><div><label>選單版本</label><select><option>v2.1 草稿</option><option>v2.0 已發佈</option></select></div><button className="icon-btn"><ChevronLeft size={18}/></button>{(["home","service"] as const).map((p,i)=><button key={p} className={`page-thumb ${page===p?"active":""}`} onClick={()=>setPage(p)}><span><img src="/rich-menu-demo.png" alt=""/></span><strong>{i===0?"首頁選單":"服務選單"}</strong><em>{i===0?"草稿中":"已發佈"}</em></button>)}<button className="icon-btn"><ChevronRight size={18}/></button></div>
      <div className="canvas-toolbar"><span>預覽 <em>LINE 圖文選單尺寸：2500 × 1686 px</em></span><div><button><Smartphone size={17}/></button><button className="active"><Monitor size={17}/></button><button><Grid3X3 size={17}/> 顯示格線</button></div></div>
      <div className="rich-canvas"><div className="menu-image"><img src="/rich-menu-demo.png" alt="六格倉鼠圖文選單示範"/>{actions.map((a,index)=><button key={a.id} className={`hotspot ${selected===a.id?"active":""}`} style={{left:`${(index%3)*33.333}%`,top:`${Math.floor(index/3)*43.9}%`}} onClick={()=>setSelected(a.id)}><b>{a.id}</b><span>{a.label}</span></button>)}<div className="menu-tabs"><button className={page==="home"?"active":""} onClick={()=>setPage("home")}>⌂　首頁</button><button className={page==="service"?"active":""} onClick={()=>setPage("service")}>●　服務</button></div></div><p>點擊上方區塊以編輯按鈕設定</p></div>
      <div className="publish-notice"><AlertCircle size={20}/><span>{notice}</span><a href="https://developers.line.biz/en/docs/messaging-api/rich-menus-overview/" target="_blank" rel="noreferrer">查看 LINE 圖文選單規範</a></div>
    </section><aside className="inspector"><header><h2>按鈕設定</h2><span>按鈕 {selected}/6</span></header><label>動作類型<select value={current.type} onChange={e=>update({type:e.target.value as RichAction["type"]})}><option value="uri">開啟網址</option><option value="message">傳送文字</option><option value="richmenuswitch">切換頁面</option></select></label><label>按鈕名稱<input value={current.label} onChange={e=>update({label:e.target.value})}/></label><fieldset><legend>目標設定</legend>{[{v:"uri",l:"開啟網址",i:Link2},{v:"message",l:"傳送文字",i:MessageSquareText},{v:"richmenuswitch",l:"切換頁面",i:Grid3X3}].map(x=><label key={x.v} className="radio-line"><input type="radio" checked={current.type===x.v} onChange={()=>update({type:x.v as RichAction["type"]})}/><x.i size={16}/>{x.l}</label>)}<input className="target-input" value={current.value} onChange={e=>update({value:e.target.value})}/></fieldset><label className="upload-zone"><ImageUp size={26}/><strong>點擊上傳或拖曳檔案</strong><span>建議尺寸 2500 × 1686 px</span><input type="file" accept="image/png,image/jpeg"/></label><div className="validation"><h3>檢查清單</h3>{["按鈕尺寸符合規範","圖片尺寸正確","所有按鈕皆有動作","未使用重複別名"].map(x=><span key={x}><Check size={15}/>{x}<em>OK</em></span>)}</div><div className="inspector-actions"><button className="danger-soft"><Trash2 size={16}/> 刪除此按鈕</button><button className="primary"><Save size={16}/> 儲存按鈕設定</button></div></aside></div>
  </main>;
}
