"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, ChevronLeft, Eye, Grid3X3, Image as ImageIcon, ImagePlus, ImageUp, Link2, MessageSquareText, Plus, Rocket, Save, Settings2, Trash2, X } from "lucide-react";
import { apiUrl, assetUrl } from "@/lib/api";
import type { RichAction, RichReplyItem } from "@/lib/types";

type Layout = "3x2" | "2x3";
type MenuPage = "home" | "service";

const pageActionSeed: Record<MenuPage, RichAction[]> = {
  home: ["旅館位置", "活動專區", "IG 點我", "住宿價目表", "預約須知", "接送服務"].map((label, index) => ({ id: index + 1, label, type: "message", value: label, responseMode: "text", replyText: `您點選了「${label}」，請稍候為您提供資訊。`, replyItems: [{ id: `home-${index}-text`, type: "text", text: `您點選了「${label}」，請稍候為您提供資訊。` }] })),
  service: ["商品賣場", "購買方式", "最新優惠", "配送說明", "商品問題", "聯絡客服"].map((label, index) => ({ id: index + 1, label, type: "message", value: label, responseMode: "text", replyText: `您點選了「${label}」，請稍候為您提供資訊。`, replyItems: [{ id: `service-${index}-text`, type: "text", text: `您點選了「${label}」，請稍候為您提供資訊。` }] })),
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
  const [previewMode, setPreviewMode] = useState<"menu" | "reply">("menu");
  const [inspectorTab, setInspectorTab] = useState<"layout" | "action" | "reply">("action");
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const replyImageRef = useRef<HTMLInputElement>(null);
  const imageEditRevision = useRef<Record<MenuPage, number>>({ home: 0, service: 0 });
  const imageDirty = useRef<Record<MenuPage, boolean>>({ home: false, service: false });
  const [replyImageTarget, setReplyImageTarget] = useState<string | null>(null);
  const actions = actionsByPage[page];
  const current = actions.find(action => action.id === selected)!;
  const currentImage = images[page];
  const columns = layout === "3x2" ? 3 : 2;
  const rows = layout === "3x2" ? 2 : 3;
  const bodyPercent = 100 - tabPercent;
  const previewImage = currentImage.data || assetUrl(defaultPageImage[page]);
  const replyItems = current.replyItems?.length ? current.replyItems : [{ id: `${page}-${selected}-legacy`, type: "text" as const, text: current.replyText }];
  const canvasStyle = useMemo(() => ({ aspectRatio: `2500 / ${height}` }), [height]);

  useEffect(() => {
    let active = true;
    const editRevision = imageEditRevision.current[page];
    void fetch(apiUrl(`/api/line/rich-menu/responses?page=${page}&refresh=${Date.now()}`), { cache: "no-store", headers: { "X-Admin-Code": accessCode } })
      .then(async response => response.ok ? await response.json() as { actions?: Partial<RichAction>[]; menuImage?: { data?: string; name?: string; version?: number } } : null)
      .then(data => {
        if (!active || !data) return;
        if (data.actions?.length) setActionsByPage(old => ({ ...old, [page]: old[page].map(action => ({ ...action, ...data.actions!.find(saved => saved.id === action.id) })) }));
        if (data.menuImage?.data && !imageDirty.current[page] && imageEditRevision.current[page] === editRevision) setImages(old => ({ ...old, [page]: { data: data.menuImage!.data!, name: data.menuImage!.name || `已發佈選單 v${data.menuImage!.version || ""}` } }));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [accessCode, page, refreshTick]);

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") setRefreshTick(value => value + 1); };
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);

  const update = (patch: Partial<RichAction>) => {
    setActionsByPage(old => ({ ...old, [page]: old[page].map(action => action.id === selected ? { ...action, ...patch } : action) }));
  };

  const updateReplyItem = (id: string, patch: Partial<RichReplyItem>) => update({ replyItems: replyItems.map(item => item.id === id ? { ...item, ...patch } : item) });
  const removeReplyItem = (id: string) => update({ replyItems: replyItems.filter(item => item.id !== id) });
  const addReplyText = () => {
    if (replyItems.length >= 5) return setNotice("LINE 每次最多傳送 5 則圖文訊息");
    update({ replyItems: [...replyItems, { id: crypto.randomUUID(), type: "text", text: "" }] });
  };
  const addReplyImage = () => {
    if (replyItems.length >= 5) return setNotice("LINE 每次最多傳送 5 則圖文訊息");
    const id = crypto.randomUUID();
    update({ replyItems: [...replyItems, { id, type: "image", imageName: "新圖片" }] });
    setReplyImageTarget(id);
    window.setTimeout(() => replyImageRef.current?.click(), 0);
  };

  function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
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
      imageEditRevision.current[page] += 1;
      imageDirty.current[page] = true;
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
      if (replyImageTarget) updateReplyItem(replyImageTarget, { imageData: String(reader.result || ""), imageName: file.name, imageUrl: undefined });
      else update({ replyImageData: String(reader.result || ""), replyImageName: file.name, replyImageUrl: undefined });
      setNotice(`按鈕 ${selected} 已載入回覆圖片 ${file.name}`);
      setReplyImageTarget(null);
      event.target.value = "";
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
        body: JSON.stringify({ page, actions, height, layout, tabPercent, tabLabels, chatBarText, imageData: currentImage.data, imageName: currentImage.name }),
      });
      const data = await response.json() as { ok?: boolean; error?: string; result?: { demo?: boolean; menuImage?: { data: string; name: string; version: number } } };
      if (!response.ok || !data.ok) throw new Error(data.error || "發佈失敗");
      if (data.result?.menuImage?.data) {
        imageEditRevision.current[page] += 1;
        imageDirty.current[page] = false;
        setImages(old => ({ ...old, [page]: { data: data.result!.menuImage!.data, name: data.result!.menuImage!.name } }));
      }
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
        <div className="canvas-toolbar"><span>即時預覽 <em>{previewMode === "menu" ? `2500 × ${height} px・${layout}` : `按鈕 ${selected} 的 LINE 回覆`}</em></span><div className="preview-switch"><button className={previewMode === "menu" ? "active" : ""} onClick={() => setPreviewMode("menu")}><Grid3X3 size={15}/>選單</button><button className={previewMode === "reply" ? "active" : ""} onClick={() => setPreviewMode("reply")}><Eye size={15}/>回覆</button></div></div>
        <div className="rich-canvas">
          {previewMode === "menu" ? <div className="menu-image editable-menu" style={canvasStyle}>
            <img src={previewImage} alt="圖文選單預覽"/>
            {actions.map((action, index) => <button key={action.id} className={`hotspot ${selected === action.id ? "active" : ""} ${currentImage.data ? "" : "default-art"}`} style={{ left: `${(index % columns) * (100 / columns)}%`, top: `${Math.floor(index / columns) * (bodyPercent / rows)}%`, width: `${100 / columns}%`, height: `${bodyPercent / rows}%` }} onClick={() => { setSelected(action.id); setInspectorTab("action"); setMobileSettingsOpen(true); }}><b>{action.id}</b><span>{action.label}</span></button>)}
            <div className="menu-tabs" style={{ height: `${tabPercent}%` }}><button className={page === "home" ? "active" : ""} onClick={() => setPage("home")}>{tabLabels[0]}</button><button className={page === "service" ? "active" : ""} onClick={() => setPage("service")}>{tabLabels[1]}</button></div>
          </div> : <div className="line-reply-preview"><header><span className="avatar small">顧</span><div><strong>LINE 顧客預覽</strong><em>點擊「{current.label}」後</em></div></header><div className="preview-chat">{replyItems.length ? replyItems.map(item => item.type === "image" ? <img key={item.id} src={item.imageData || item.imageUrl} alt={item.imageName || "自動回覆圖片"}/> : <p key={item.id}>{item.text || "尚未填寫文字"}</p>) : <div className="preview-empty">尚未設定自動回覆內容</div>}</div></div>}
          <p>{previewMode === "menu" ? "點擊區塊即可編輯；新圖片發佈後會立即同步回 App" : `目前共 ${replyItems.length} 則；LINE 單次最多傳送 5 則`}</p>
        </div>
        <div className="publish-notice"><AlertCircle size={20}/><span>{notice}</span><a href="https://developers.line.biz/en/docs/messaging-api/rich-menus-overview/" target="_blank" rel="noreferrer">LINE 規範</a></div>
      </section>
      <aside className={`inspector rich-inspector ${mobileSettingsOpen ? "open" : ""}`}>
        <header><button className="sheet-back" aria-label="關閉設定" onClick={() => setMobileSettingsOpen(false)}><ChevronLeft size={21}/></button><div><h2>版型與按鈕設定</h2><small>按鈕 {selected}/6・{current.label}</small></div><button className="sheet-close" aria-label="關閉設定" onClick={() => setMobileSettingsOpen(false)}><X size={20}/></button></header>
        <nav className="inspector-tabs" aria-label="設定分類"><button className={inspectorTab === "layout" ? "active" : ""} onClick={() => setInspectorTab("layout")}><Grid3X3 size={17}/>版型</button><button className={inspectorTab === "action" ? "active" : ""} onClick={() => setInspectorTab("action")}><Settings2 size={17}/>動作</button><button className={inspectorTab === "reply" ? "active" : ""} onClick={() => { setInspectorTab("reply"); setPreviewMode("reply"); }}><MessageSquareText size={17}/>自動回覆</button></nav>
        <div className={`inspector-pane ${inspectorTab === "layout" ? "active" : ""}`}>
        <div className="layout-controls">
          <label>按鈕排版<select value={layout} onChange={event => setLayout(event.target.value as Layout)}><option value="3x2">三欄 × 兩列</option><option value="2x3">兩欄 × 三列</option></select></label>
          <label>選單高度<select value={height} disabled={!currentImage.data} title={!currentImage.data ? "預設圖片固定為 1686 px" : undefined} onChange={event => setHeight(Number(event.target.value))}><option value="843">精簡 843 px</option><option value="1200">中型 1200 px</option><option value="1686">完整 1686 px</option><option value="1724">最高 1724 px</option></select></label>
        </div>
        <label>分頁列高度 <b>{tabPercent}%</b><input className="range-input" type="range" min="10" max="24" value={tabPercent} onChange={event => setTabPercent(Number(event.target.value))}/></label>
        <div className="layout-controls"><label>左分頁文字<input value={tabLabels[0]} onChange={event => setTabLabels([event.target.value, tabLabels[1]])}/></label><label>右分頁文字<input value={tabLabels[1]} onChange={event => setTabLabels([tabLabels[0], event.target.value])}/></label></div>
        <label>選單提示文字<input value={chatBarText} maxLength={14} onChange={event => setChatBarText(event.target.value)}/></label>
        <label className="upload-zone"><ImageUp size={26}/><strong>{currentImage.name}</strong><span>目前已有 2500×1686 預設圖，也可上傳 PNG／JPEG 覆蓋</span><input type="file" accept="image/png,image/jpeg" onChange={uploadImage}/></label>
        </div>
        <div className={`inspector-pane ${inspectorTab === "action" ? "active" : ""}`}>
        <label>動作類型<select value={current.type} onChange={event => update({ type: event.target.value as RichAction["type"] })}><option value="uri">開啟網址</option><option value="message">傳送文字</option><option value="richmenuswitch">切換頁面</option></select></label>
        <label>按鈕名稱<input value={current.label} onChange={event => update({ label: event.target.value })}/></label>
        <fieldset><legend>目標設定</legend>{[{ v: "uri", l: "開啟網址", i: Link2 }, { v: "message", l: "傳送文字", i: MessageSquareText }, { v: "richmenuswitch", l: "切換頁面", i: Grid3X3 }].map(item => <label key={item.v} className="radio-line"><input type="radio" checked={current.type === item.v} onChange={() => update({ type: item.v as RichAction["type"] })}/><item.i size={16}/>{item.l}</label>)}<input className="target-input" type={current.type === "uri" ? "url" : "text"} inputMode={current.type === "uri" ? "url" : "text"} placeholder={current.type === "uri" ? "https://完整網址" : "顧客點擊後傳送的文字"} value={current.value} onChange={event => update({ value: event.target.value })}/>{current.type === "uri" ? <small>網址必須包含 https://；儲存後才會保留，重新發佈才會套用到 LINE。</small> : null}</fieldset>
        </div>
        <div className={`inspector-pane ${inspectorTab === "reply" ? "active" : ""}`}><section className={`reply-config sequence-config ${current.type !== "message" ? "disabled" : ""}`}>
          <header><ImageIcon size={18}/><div><strong>點擊後自動回覆</strong><span>依排列順序一次傳送，最多 5 則</span></div><b>{replyItems.length}/5</b></header>
          {current.type === "message" ? <>
            <div className="reply-sequence">{replyItems.map((item, index) => <article key={item.id} className="reply-item"><header><span>{index + 1}</span><strong>{item.type === "text" ? "文字訊息" : "圖片訊息"}</strong><button aria-label={`刪除第 ${index + 1} 則`} onClick={() => removeReplyItem(item.id)}><Trash2 size={17}/>刪除</button></header>{item.type === "text" ? <textarea value={item.text || ""} maxLength={5000} placeholder="輸入顧客會收到的文字" onChange={event => updateReplyItem(item.id, { text: event.target.value })}/> : <button className="reply-image-card" onClick={() => { setReplyImageTarget(item.id); replyImageRef.current?.click(); }}>{(item.imageData || item.imageUrl) ? <img src={item.imageData || item.imageUrl} alt={item.imageName || "回覆圖片"}/> : <ImagePlus size={27}/>}<span>{item.imageName || "點此上傳圖片"}</span><small>PNG／JPEG，小於 1 MB</small></button>}</article>)}</div>
            <div className="reply-add"><button onClick={addReplyText} disabled={replyItems.length >= 5}><Plus size={17}/>新增文字</button><button onClick={addReplyImage} disabled={replyItems.length >= 5}><ImagePlus size={17}/>新增圖片</button></div>
            <input ref={replyImageRef} hidden type="file" accept="image/png,image/jpeg" onChange={uploadReplyImage}/>
          </> : <p>選擇「傳送文字」動作後，才能由 Webhook 自動回覆圖片或文字。</p>}
        </section>
        </div>
        <div className="validation"><h3>發佈檢查</h3>{["六個點擊區域已建立", "兩個分頁切換區域已建立", "圖片尺寸 2500 × 1686", currentImage.data ? "自訂背景圖片已載入" : "官方選單圖片已載入"].map(item => <span key={item}><Check size={15}/>{item}<em>OK</em></span>)}</div>
        <div className="inspector-actions"><button className="primary" onClick={() => void saveCurrent()} disabled={saving}><Save size={16}/> {saving ? "儲存中…" : "儲存目前設定"}</button></div>
      </aside>
    </div>
  </main>;
}
