"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookTemplate, Check, File, FilePlus2, FileQuestion, MoreHorizontal, PencilLine, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { apiUrl } from "@/lib/api";
import type { KnowledgeDocument } from "@/lib/types";

const categories = ["住宿", "接送", "商品", "FAQ", "人工接手"] as const;

type TemplateDefinition = { id: string; title: string; category: typeof categories[number]; description: string; content: string };

const templates: TemplateDefinition[] = [
  { id: "stay-price", title: "住宿價目表", category: "住宿", description: "房型、每日費用、折扣與加價項目", content: `# 住宿價目表\n\n## 房型與每日費用\n- 65 籠：每日【請填寫】元\n- 88 籠：每日【請填寫】元\n\n## 優惠\n- 自備飼料：折抵【請填寫】元\n- 自備墊料：折抵【請填寫】元\n- 連住優惠：【請填寫】\n\n## 注意事項\n- 空房與最終金額一律由人工客服確認。` },
  { id: "stay-rules", title: "住宿須知", category: "住宿", description: "入住條件、攜帶物品與緊急處理", content: `# 住宿須知\n\n## 入住資料\n- 寵物姓名：{{寵物姓名}}\n- 入住日期：{{入住日期}}\n- 退房日期：{{退房日期}}\n\n## 請攜帶\n- 【請填寫】\n\n## 健康與用藥\n- 有用藥、受傷或特殊照護需求時，請在入住前主動告知。\n- 緊急健康狀況會立即轉人工處理。` },
  { id: "transport", title: "接送服務說明", category: "接送", description: "服務範圍、費用與預約方式", content: `# 接送服務說明\n\n## 服務範圍\n- 免費範圍：【請填寫】\n- 超出範圍費用：【請填寫】\n\n## 預約方式\n請提供接送地址、希望時間、寵物數量與聯絡方式；實際路線與時間由人工客服確認。` },
  { id: "shipping", title: "商品配送與退換貨", category: "商品", description: "出貨門檻、免運與售後規定", content: `# 商品配送與退換貨\n\n## 配送\n- 最低出貨金額：【請填寫】\n- 免運門檻：【請填寫】\n- 預計出貨天數：【請填寫】\n\n## 退換貨\n- 【請填寫適用條件與流程】\n\n庫存、特殊材積與爭議問題請轉人工客服確認。` },
  { id: "faq", title: "常見問題與標準回答", category: "FAQ", description: "建立問題與一致的客服回答", content: `# 常見問題\n\n## 問題一\n問題：【請填寫顧客常見問題】\n回答：【請填寫標準回答】\n\n## 問題二\n問題：【請填寫顧客常見問題】\n回答：【請填寫標準回答】\n\n無法確認的內容請勿自行承諾，改由人工客服處理。` },
  { id: "handoff", title: "人工接手規則", category: "人工接手", description: "定義 AI 必須停止回覆的情境", content: `# 人工接手規則\n\n遇到以下情況，AI 停止自動回覆並通知人工客服：\n- 空房、即時名額或預約確認\n- 生病、受傷、用藥或緊急狀況\n- 退款、客訴或消費爭議\n- 知識庫沒有答案或資訊互相衝突\n- 其他：【請填寫】` },
];

const variables = ["{{顧客姓名}}", "{{寵物姓名}}", "{{入住日期}}", "{{退房日期}}", "{{寵物數量}}"];

async function extractText(file: globalThis.File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "txt" || extension === "md") return file.text();
  if (extension === "docx") {
    const mammoth = await import("mammoth");
    return (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
  }
  if (extension === "pdf") {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), disableFontFace: true }).promise;
    const pages: string[] = [];
    for (let index = 1; index <= Math.min(pdf.numPages, 80); index += 1) {
      const content = await (await pdf.getPage(index)).getTextContent();
      pages.push(content.items.map(item => "str" in item ? item.str : "").join(" "));
    }
    return pages.join("\n");
  }
  return file.text();
}

export function KnowledgeBase({ accessCode }: { accessCode: string }) {
  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("全部類型");
  const [status, setStatus] = useState("正在讀取知識庫…");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [view, setView] = useState<"files" | "templates">("files");
  const [templateCategory, setTemplateCategory] = useState("全部");
  const [editorOpen, setEditorOpen] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateDraft, setTemplateDraft] = useState({ title: "", category: "FAQ", content: "" });
  const ref = useRef<HTMLInputElement>(null);
  const visibleDocs = useMemo(() => docs.filter(doc => doc.title.toLowerCase().includes(query.trim().toLowerCase()) && (type === "全部類型" || doc.type === type)), [docs, query, type]);
  const visibleTemplates = useMemo(() => templates.filter(item => templateCategory === "全部" || item.category === templateCategory), [templateCategory]);

  useEffect(() => { let active = true; void fetch(apiUrl("/api/knowledge"), { headers: { "X-Admin-Code": accessCode } }).then(async response => response.json() as Promise<{ documents?: KnowledgeDocument[] }>).then(data => { if (active) { setDocs(data.documents || []); setStatus(data.documents?.length ? "知識庫已同步" : "尚未上傳文件"); } }).catch(() => setStatus("知識庫讀取失敗，請稍後重試")); return () => { active = false; }; }, [accessCode]);

  async function storeDocument(input: { title: string; type: string; sizeBytes: number; content: string }) {
    const response = await fetch(apiUrl("/api/knowledge"), { method: "POST", headers: { "Content-Type": "application/json", "X-Admin-Code": accessCode }, body: JSON.stringify(input) });
    const data = await response.json() as { document?: KnowledgeDocument; error?: string };
    if (!response.ok || !data.document) throw new Error(data.error || "儲存失敗");
    setDocs(old => [data.document!, ...old.filter(item => item.id !== data.document!.id)]);
    return data.document;
  }

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setStatus(`正在解析 ${files.length} 份文件…`);
    let completed = 0;
    for (const file of Array.from(files)) {
      try {
        const content = await extractText(file);
        if (!content.trim()) throw new Error("文件沒有可讀文字");
        await storeDocument({ title: file.name, type: file.name.split(".").pop()?.toUpperCase() || "FILE", sizeBytes: file.size, content });
        completed += 1;
      } catch (error) { setStatus(`${file.name}：${error instanceof Error ? error.message : "解析失敗"}`); }
    }
    if (completed) setStatus(`已解析並索引 ${completed} 份文件`);
    if (ref.current) ref.current.value = "";
  }

  function openTemplate(template?: TemplateDefinition) {
    setTemplateDraft(template ? { title: template.title, category: template.category, content: template.content } : { title: "未命名知識模板", category: "FAQ", content: "# 新知識文件\n\n【請在這裡填寫內容】" });
    setEditorOpen(true);
  }

  async function saveTemplate() {
    if (!templateDraft.title.trim() || !templateDraft.content.trim()) return setStatus("請填寫模板名稱與內容");
    setSavingTemplate(true);
    try {
      await storeDocument({ title: templateDraft.title.trim(), type: templateDraft.category, sizeBytes: new Blob([templateDraft.content]).size, content: templateDraft.content });
      setStatus(`「${templateDraft.title.trim()}」已上傳並完成索引`);
      setEditorOpen(false); setView("files"); setType("全部類型");
    } catch (error) { setStatus(error instanceof Error ? error.message : "模板上傳失敗"); }
    finally { setSavingTemplate(false); }
  }

  async function remove(doc: KnowledgeDocument) {
    const response = await fetch(apiUrl(`/api/knowledge/${encodeURIComponent(doc.id)}`), { method: "DELETE", headers: { "X-Admin-Code": accessCode } });
    if (!response.ok) return setStatus("刪除失敗，請稍後重試");
    setDocs(old => old.filter(item => item.id !== doc.id)); setActiveMenu(null); setStatus(`已刪除 ${doc.title}`);
  }

  return <main className="content-page knowledge-page">
    <div className="page-title-row"><div><h1>知識庫管理</h1><p>從模板建立內容，或上傳現有文件提供 AI 查詢</p></div><button className="primary big" onClick={() => ref.current?.click()}><Upload size={18}/>上傳文件</button><input ref={ref} hidden type="file" multiple accept=".pdf,.docx,.txt,.md" onChange={event => void add(event.target.files)}/></div>
    <div className="knowledge-tabs" role="tablist"><button className={view === "files" ? "active" : ""} onClick={() => setView("files")}><File size={17}/>文件庫 <b>{docs.length}</b></button><button className={view === "templates" ? "active" : ""} onClick={() => setView("templates")}><BookTemplate size={17}/>模板中心</button></div>
    {view === "files" ? <div className="knowledge-layout"><section>
      <div className="table-tools"><label className="search"><Search size={17}/><input aria-label="搜尋知識文件" placeholder="搜尋知識文件" value={query} onChange={event => setQuery(event.target.value)}/></label><select aria-label="文件類型" value={type} onChange={event => setType(event.target.value)}><option>全部類型</option>{Array.from(new Set(docs.map(doc => doc.type))).map(item => <option key={item}>{item}</option>)}</select></div>
      <div className="upload-feedback" role="status"><Check size={15}/>{status}</div>
      <div className="doc-table"><header><span>文件名稱</span><span>類型</span><span>段落</span><span>更新時間</span><span>狀態</span><span/></header>{visibleDocs.map(doc => <div className="doc-row" key={doc.id}><span className="doc-name"><File size={18}/><strong>{doc.title}</strong></span><span data-label="類型">{doc.type}</span><span data-label="段落">{doc.chunks}</span><span data-label="更新">{new Date(doc.updated).toLocaleDateString("zh-TW")}</span><span className="indexed" data-label="狀態"><Check size={14}/>{doc.status}</span><button aria-label={`${doc.title} 更多操作`} aria-expanded={activeMenu === doc.id} onClick={() => setActiveMenu(activeMenu === doc.id ? null : doc.id)}><MoreHorizontal size={17}/></button>{activeMenu === doc.id ? <div className="row-menu"><button onClick={() => void remove(doc)}><Trash2 size={15}/>刪除文件</button><button onClick={() => setActiveMenu(null)}><X size={15}/>關閉</button></div> : null}</div>)}{visibleDocs.length === 0 ? <div className="doc-empty">{docs.length ? "找不到符合條件的文件" : "尚未上傳知識文件；可先從模板建立。"}</div> : null}</div>
    </section><aside className="kb-guide"><FileQuestion size={28}/><h2>兩種建立方式</h2><p>直接上傳 PDF、DOCX、TXT、Markdown，或到模板中心填寫常用資料。</p><button className="primary" onClick={() => setView("templates")}><BookTemplate size={16}/>開啟模板中心</button><div><strong>AI 已接通知識庫</strong><span>儲存模板後會立即加入客服草稿查詢。</span></div></aside></div>
    : <section className="template-center"><header><div><h2>知識庫模板</h2><p>選一個範本，修改後直接分類並上傳。</p></div><button className="primary" onClick={() => openTemplate()}><FilePlus2 size={17}/>新增空白模板</button></header><div className="template-categories"><button className={templateCategory === "全部" ? "active" : ""} onClick={() => setTemplateCategory("全部")}>全部</button>{categories.map(category => <button key={category} className={templateCategory === category ? "active" : ""} onClick={() => setTemplateCategory(category)}>{category}</button>)}</div><div className="template-grid">{visibleTemplates.map(template => <article key={template.id}><div className="template-icon"><BookTemplate size={21}/></div><span>{template.category}</span><h3>{template.title}</h3><p>{template.description}</p><button onClick={() => openTemplate(template)}><PencilLine size={16}/>使用並編輯</button></article>)}</div></section>}
    {editorOpen ? <div className="modal-backdrop template-backdrop" role="presentation"><section className="app-modal template-editor" role="dialog" aria-modal="true" aria-labelledby="template-editor-title"><header><div><h2 id="template-editor-title">新增／編輯模板</h2><p>完成後會直接成為 AI 可查詢的知識文件。</p></div><button aria-label="關閉模板編輯器" onClick={() => setEditorOpen(false)}><X size={20}/></button></header><label>模板名稱<input value={templateDraft.title} onChange={event => setTemplateDraft(old => ({ ...old, title: event.target.value }))} placeholder="例如：2026 住宿價目表"/></label><label>分類<select value={templateDraft.category} onChange={event => setTemplateDraft(old => ({ ...old, category: event.target.value }))}>{categories.map(category => <option key={category}>{category}</option>)}</select></label><label>內容<textarea value={templateDraft.content} onChange={event => setTemplateDraft(old => ({ ...old, content: event.target.value }))} aria-label="模板內容"/></label><div className="variable-section"><strong>可插入變數提示</strong><div>{variables.map(variable => <button key={variable} onClick={() => setTemplateDraft(old => ({ ...old, content: `${old.content}${old.content.endsWith("\n") ? "" : "\n"}${variable}` }))}><Plus size={13}/>{variable}</button>)}</div></div><footer><button onClick={() => setEditorOpen(false)}>取消</button><button className="primary" onClick={() => void saveTemplate()} disabled={savingTemplate}><Upload size={17}/>{savingTemplate ? "上傳中…" : "儲存並上傳"}</button></footer></section></div> : null}
  </main>;
}
