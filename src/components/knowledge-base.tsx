"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, File, FileQuestion, MoreHorizontal, Search, Trash2, Upload, X } from "lucide-react";
import { apiUrl } from "@/lib/api";
import type { KnowledgeDocument } from "@/lib/types";

async function extractText(file: File) {
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
  const ref = useRef<HTMLInputElement>(null);
  const visibleDocs = useMemo(() => docs.filter(doc => doc.title.toLowerCase().includes(query.trim().toLowerCase()) && (type === "全部類型" || doc.type === type)), [docs, query, type]);

  useEffect(() => { let active = true; void fetch(apiUrl("/api/knowledge"), { headers: { "X-Admin-Code": accessCode } }).then(async response => response.json() as Promise<{ documents?: KnowledgeDocument[] }>).then(data => { if (active) { setDocs(data.documents || []); setStatus(data.documents?.length ? "知識庫已同步" : "尚未上傳文件"); } }).catch(() => setStatus("知識庫讀取失敗，請稍後重試")); return () => { active = false; }; }, [accessCode]);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setStatus(`正在解析 ${files.length} 份文件…`);
    let completed = 0;
    for (const file of Array.from(files)) {
      try {
        const content = await extractText(file);
        if (!content.trim()) throw new Error("文件沒有可讀文字");
        const response = await fetch(apiUrl("/api/knowledge"), { method: "POST", headers: { "Content-Type": "application/json", "X-Admin-Code": accessCode }, body: JSON.stringify({ title: file.name, type: file.name.split(".").pop()?.toUpperCase() || "FILE", sizeBytes: file.size, content }) });
        const data = await response.json() as { document?: KnowledgeDocument; error?: string };
        if (!response.ok || !data.document) throw new Error(data.error || "儲存失敗");
        setDocs(old => [data.document!, ...old.filter(item => item.id !== data.document!.id)]);
        completed += 1;
      } catch (error) { setStatus(`${file.name}：${error instanceof Error ? error.message : "解析失敗"}`); }
    }
    if (completed) setStatus(`已解析並索引 ${completed} 份文件`);
    if (ref.current) ref.current.value = "";
  }

  async function remove(doc: KnowledgeDocument) {
    const response = await fetch(apiUrl(`/api/knowledge/${encodeURIComponent(doc.id)}`), { method: "DELETE", headers: { "X-Admin-Code": accessCode } });
    if (!response.ok) return setStatus("刪除失敗，請稍後重試");
    setDocs(old => old.filter(item => item.id !== doc.id));
    setActiveMenu(null);
    setStatus(`已刪除 ${doc.title}`);
  }

  return <main className="content-page knowledge-page">
    <div className="page-title-row"><div><h1>知識庫管理</h1><p>上傳文件後會解析文字，提供 AI 產生客服草稿</p></div><button className="primary big" onClick={() => ref.current?.click()}><Upload size={18}/>上傳文件</button><input ref={ref} hidden type="file" multiple accept=".pdf,.docx,.txt,.md" onChange={event => void add(event.target.files)}/></div>
    <div className="knowledge-layout"><section>
      <div className="table-tools"><label className="search"><Search size={17}/><input aria-label="搜尋知識文件" placeholder="搜尋知識文件" value={query} onChange={event => setQuery(event.target.value)}/></label><select aria-label="文件類型" value={type} onChange={event => setType(event.target.value)}><option>全部類型</option>{Array.from(new Set(docs.map(doc => doc.type))).map(item => <option key={item}>{item}</option>)}</select></div>
      <div className="upload-feedback" role="status"><Check size={15}/>{status}</div>
      <div className="doc-table"><header><span>文件名稱</span><span>類型</span><span>段落</span><span>更新時間</span><span>狀態</span><span/></header>{visibleDocs.map(doc => <div className="doc-row" key={doc.id}><span className="doc-name"><File size={18}/><strong>{doc.title}</strong></span><span data-label="類型">{doc.type}</span><span data-label="段落">{doc.chunks}</span><span data-label="更新">{new Date(doc.updated).toLocaleDateString("zh-TW")}</span><span className="indexed" data-label="狀態"><Check size={14}/>{doc.status}</span><button aria-label={`${doc.title} 更多操作`} aria-expanded={activeMenu === doc.id} onClick={() => setActiveMenu(activeMenu === doc.id ? null : doc.id)}><MoreHorizontal size={17}/></button>{activeMenu === doc.id ? <div className="row-menu"><button onClick={() => void remove(doc)}><Trash2 size={15}/>刪除文件</button><button onClick={() => setActiveMenu(null)}><X size={15}/>關閉</button></div> : null}</div>)}{visibleDocs.length === 0 ? <div className="doc-empty">{docs.length ? "找不到符合條件的文件" : "尚未上傳知識文件；點擊右上角開始。"}</div> : null}</div>
    </section><aside className="kb-guide"><FileQuestion size={28}/><h2>支援的知識文件</h2><p>PDF、DOCX、TXT 與 Markdown 會在手機或電腦上解析，再安全保存文字內容。</p><ul><li>住宿價目與加價規則</li><li>入住、退房與接送方式</li><li>商品庫存與配送政策</li><li>常見問題與標準回答</li></ul><div><strong>AI 已接通知識庫</strong><span>產生客服草稿時會自動加入最新文件內容。</span></div></aside></div>
  </main>;
}
