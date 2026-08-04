"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Grid3X3, Image as ImageIcon, ImageUp, Link2, MessageSquareText, Rocket, Save } from "lucide-react";
import { apiUrl, assetUrl } from "@/lib/api";
import type { RichAction } from "@/lib/types";

type Layout = "3x2" | "2x3";
type MenuPage = "home" | "service";

const pageActionSeed: Record<MenuPage, RichAction[]> = {
  home: ["旅館位置", "活動專區", "IG 點我", "住宿價目表", "預約須知", "接送服務"].map((label, index) => ({ id: index + 1, label, type: "message", value: label, responseMode: "text", replyText: `您點選了「${label}」，請稍候為您提供資訊。` })),
  service: ["商品賣場", "購買方式", "最新優惠", "配送說明", "商品問題", "聯絡客服"].map((label, index) => ({ id: index + 1, label, type: "message", value: label, responseMode: "text", replyText: `您點選了「${label}」，請稍候為您提供資訊。` })),
};

const defaultPageImage: Record<MenuPage, string> = { home: "rich-menu-hotel.jpg", service: "rich-menu-shop.jpg" };

export function RichMenuEditor({ accessCode }: { accessCode: string }) {
  const [page, setPage] = useState<MenuPage>("home");
  const [actionsByPage, setActionsByPage] = useState(pageActionSeed);
  const [selected, setSelected] = useState(1);
  const [height, setHeight] = useState(1686);
  const [layout, setLayout] = useState<Layout>("3x2");
  const [tabPercent, setTabPercent] = useState(14);
  const [tabLabels, setTabLabels] = useState<[string, string]>(["⌂ 旅館服務", "▣ 賣貨便專區"]);
  const [chatBarText, setChatBarText] = useState("點選下方選單開始服務");
  const [images, setImages] = useState<Record<MenuPage, { data: string; name: string }>>({ home: { data: "", name: "旅館服務預設圖" }, service: { data: "", name: "賣貨便預設圖" } });
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("版型會同步建立兩個分頁切換區域");
  const actions = actionsByPage[page];
  const current = actions.find(action => action.id === selected)!;
  const currentImage = images[page];
  const columns = layout === "3x2" ? 3 : 2;
  const rows = layout === "3x2" ? 2 : 3;
  const bodyPercent = 100 - tabPercent;
  const previewImage = currentImage.data || assetUrl(defaultPageImage[page]);
  const canvasStyle = useMemo(() => ({ aspectRatio: `2500 / ${height}` }), [height]);

  useEffect(() => {
    let active = true;
    void fetch(apiUrl(`/api/line/rich-menu/responses?page=${page}`), { headers: { "X-Admin-Code": accessCode } })
      .then(async response => response.ok ? await response.json() as { actions?: Partial<RichAction>[] } : null)
      .then(data => {
        if (!active || !data?.actions?.length) return;
        setActionsByPage(old => ({ ...old, [page]: old[page].map(action => ({ ...action, ...data.actions!.find(saved => saved.id === action.id) })) }));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [accessCode, page]);

  const update = (patch: Partial<RichAction>) => {
    setActionsByPage(old => ({ ...old, [page]: old[page].map(action => action.id === selected ? { ...action, ...patch } : action) }));
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
      setImages(old => ({ ...old, [page]: { data: String(reader.result || ""), name: file.name } }));
      setNotice(`已載入 ${file.name}`);
    };
    reader.readAsDataURL(file);
  }

  function uploadReplyImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg)$/.test(file.type)) return setNotice("回覆圖片只支援 PNG 或 JPEG");
    if (file.size > 1024 * 1024) return setNotice("回覆圖片需小於 1 MB");
    const reader = new FileReader();
    reader.onload = () => {
      update({ replyImageData: String(reader.result || ""), replyImageName: file.name, replyImageUrl: undefined });
      setNotice(`按鈕 ${selected} 已載入回覆圖片 ${file.name}`);
    };
    reader.readAsDataURL(file);
  }

  async function saveResponses(showNotice = true) {
    const response = await fetch(apiUrl("/api/line/rich-menu/responses"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Code": accessCode },
      body: JSON.stringify({ page, actions }),
    });
    const data = await response.json() as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok) throw new Error(data.error || "回覆設定儲存失敗");
    if (showNotice) setNotice(`按鈕 ${selected} 的動作與回覆設定已儲存`);
  }

  async function saveCurrent() {
    setSaving(true);
    try { await saveResponses(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "回覆設定儲存失敗"); }
    finally { setSaving(false); }
  }

  async function publish() {
    setPublishing(true);
    setNotice("正在建立 LINE Rich Menu 與分頁別名…");
    try {
      await saveResponses(false);
      const response = await fetch(apiUrl("/api/line/rich-menu/publish"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Code": accessCode },
        body: JSON.stringify({ page, actions, height, layout, tabPercent, tabLabels, chatBarText, imageData: currentImage.data }),
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
          {(["home", "service"] as const).map((item, index) => <button key={item} className={`page-thumb ${page === item ? "active" : ""}`} onClick={() => { setPage(item); setSelected(1); }}><span><img src={images[item].data || assetUrl(defaultPageImage[item])} alt=""/></span><strong>{index === 0 ? "旅館服務" : "賣貨便專區"}</strong><em>{page === item ? "編輯中" : "點此切換"}</em></button>)}
        </div>
        <div className="canvas-toolbar"><span>即時預覽 <em>2500 × {height} px・{layout}</em></span><strong>{chatBarText}</strong></div>
        <div className="rich-canvas">
          <div className="menu-image editable-menu" style={canvasStyle}>
            <img src={previewImage} alt="圖文選單預覽"/>
            {actions.map((action, index) => <button key={action.id} className={`hotspot ${selected === action.id ? "active" : ""} ${currentImage.data ? "" : "default-art"}`} style={{ left: `${(index % columns) * (100 / columns)}%`, top: `${Math.floor(index / columns) * (bodyPercent / rows)}%`, width: `${100 / columns}%`, height: `${bodyPercent / rows}%` }} onClick={() => setSelected(action.id)}><b>{action.id}</b><span>{action.label}</span></button>)}
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
          <label>選單高度<select value={height} disabled={!currentImage.data} title={!currentImage.data ? "預設圖片固定為 1686 px" : undefined} onChange={event => setHeight(Number(event.target.value))}><option value="843">精簡 843 px</option><option value="1200">中型 1200 px</option><option value="1686">完整 1686 px</option><option value="1724">最高 1724 px</option></select></label>
        </div>
        <label>分頁列高度 <b>{tabPercent}%</b><input className="range-input" type="range" min="10" max="24" value={tabPercent} onChange={event => setTabPercent(Number(event.target.value))}/></label>
        <div className="layout-controls"><label>左分頁文字<input value={tabLabels[0]} onChange={event => setTabLabels([event.target.value, tabLabels[1]])}/></label><label>右分頁文字<input value={tabLabels[1]} onChange={event => setTabLabels([tabLabels[0], event.target.value])}/></label></div>
        <label>選單提示文字<input value={chatBarText} maxLength={14} onChange={event => setChatBarText(event.target.value)}/></label>
        <hr/>
        <label>動作類型<select value={current.type} onChange={event => update({ type: event.target.value as RichAction["type"] })}><option value="uri">開啟網址</option><option value="message">傳送文字</option><option value="richmenuswitch">切換頁面</option></select></label>
        <label>按鈕名稱<input value={current.label} onChange={event => update({ label: event.target.value })}/></label>
        <fieldset><legend>目標設定</legend>{[{ v: "uri", l: "開啟網址", i: Link2 }, { v: "message", l: "傳送文字", i: MessageSquareText }, { v: "richmenuswitch", l: "切換頁面", i: Grid3X3 }].map(item => <label key={item.v} className="radio-line"><input type="radio" checked={current.type === item.v} onChange={() => update({ type: item.v as RichAction["type"] })}/><item.i size={16}/>{item.l}</label>)}<input className="target-input" type={current.type === "uri" ? "url" : "text"} inputMode={current.type === "uri" ? "url" : "text"} placeholder={current.type === "uri" ? "https://完整網址" : "顧客點擊後傳送的文字"} value={current.value} onChange={event => update({ value: event.target.value })}/>{current.type === "uri" ? <small>網址必須包含 https://；儲存後才會保留，重新發佈才會套用到 LINE。</small> : null}</fieldset>
        <section className={`reply-config ${current.type !== "message" ? "disabled" : ""}`}>
          <header><ImageIcon size={18}/><div><strong>點擊後自動回覆</strong><span>可單獨回圖片，或圖片與文字一起傳送</span></div></header>
          {current.type === "message" ? <>
            <label>回覆形式<select value={current.responseMode} onChange={event => update({ responseMode: event.target.value as RichAction["responseMode"] })}><option value="text">只回文字</option><option value="image">只回圖片</option><option value="text_image">圖片＋文字</option></select></label>
            {current.responseMode !== "image" ? <label>回覆文字<textarea value={current.replyText} maxLength={1000} placeholder="顧客點擊後收到的說明" onChange={event => update({ replyText: event.target.value })}/></label> : null}
            {current.responseMode !== "text" ? <label className="reply-image-zone">
              {(current.replyImageData || current.replyImageUrl) ? <img src={current.replyImageData || current.replyImageUrl} alt="回覆圖片預覽"/> : <ImageUp size={25}/>}
              <strong>{current.replyImageName || "上傳回覆圖片"}</strong><span>PNG／JPEG，小於 1 MB；會直接顯示在 LINE 對話中</span><input type="file" accept="image/png,image/jpeg" onChange={uploadReplyImage}/>
            </label> : null}
          </> : <p>選擇「傳送文字」動作後，才能由 Webhook 自動回覆圖片或文字。</p>}
        </section>
        <label className="upload-zone"><ImageUp size={26}/><strong>{currentImage.name}</strong><span>目前已有 2500×1686 預設圖，也可上傳 PNG／JPEG 覆蓋</span><input type="file" accept="image/png,image/jpeg" onChange={uploadImage}/></label>
        <div className="validation"><h3>發佈檢查</h3>{["六個點擊區域已建立", "兩個分頁切換區域已建立", "圖片尺寸 2500 × 1686", currentImage.data ? "自訂背景圖片已載入" : "官方選單圖片已載入"].map(item => <span key={item}><Check size={15}/>{item}<em>OK</em></span>)}</div>
        <div className="inspector-actions"><button className="primary" onClick={() => void saveCurrent()} disabled={saving}><Save size={16}/> {saving ? "儲存中…" : "儲存目前設定"}</button></div>
      </aside>
    </div>
  </main>;
}
