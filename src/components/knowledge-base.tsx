"use client";
import { useRef, useState } from "react";
import { Check, File, FileQuestion, MoreHorizontal, Search, Upload } from "lucide-react";
import { knowledgeSeed } from "@/lib/demo-data";

export function KnowledgeBase() {
  const [docs, setDocs] = useState(knowledgeSeed);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("全部類型");
  const [uploadStatus, setUploadStatus] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const visibleDocs = docs.filter(doc => doc.title.toLowerCase().includes(query.trim().toLowerCase()) && (type === "全部類型" || doc.type === type));

  function add(files: FileList | null) {
    if (!files?.length) return;
    const incoming = Array.from(files).map((file, index) => ({ id: Date.now() + index, title: file.name, type: file.name.split(".").pop()?.toUpperCase() || "FILE", updated: "剛剛", status: "已索引", chunks: Math.max(1, Math.ceil(file.size / 8000)) }));
    setDocs(old => [...incoming, ...old]);
    setUploadStatus(`已加入 ${incoming.length} 份文件`);
    if (ref.current) ref.current.value = "";
  }

  return <main className="content-page knowledge-page">
    <div className="page-title-row"><div><h1>知識庫管理</h1><p>上傳價目、住宿須知與常見問題，提供 AI 查詢依據</p></div><button className="primary big" onClick={() => ref.current?.click()}><Upload size={18}/>上傳文件</button><input ref={ref} hidden type="file" multiple accept=".pdf,.doc,.docx,.txt,.md" onChange={event => add(event.target.files)}/></div>
    <div className="knowledge-layout"><section>
      <div className="table-tools"><label className="search"><Search size={17}/><input aria-label="搜尋知識文件" placeholder="搜尋知識文件" value={query} onChange={event => setQuery(event.target.value)}/></label><select aria-label="文件類型" value={type} onChange={event => setType(event.target.value)}><option>全部類型</option><option>PDF</option><option>DOCX</option><option>FAQ</option></select></div>
      {uploadStatus ? <div className="upload-feedback"><Check size={15}/>{uploadStatus}</div> : null}
      <div className="doc-table"><header><span>文件名稱</span><span>類型</span><span>段落</span><span>更新時間</span><span>狀態</span><span/></header>{visibleDocs.map(doc => <div className="doc-row" key={doc.id}><span className="doc-name"><File size={18}/><strong>{doc.title}</strong></span><span data-label="類型">{doc.type}</span><span data-label="段落">{doc.chunks}</span><span data-label="更新">{doc.updated}</span><span className="indexed" data-label="狀態"><Check size={14}/>{doc.status}</span><button aria-label={`${doc.title} 更多操作`}><MoreHorizontal size={17}/></button></div>)}{visibleDocs.length === 0 ? <div className="doc-empty">找不到符合條件的文件</div> : null}</div>
    </section><aside className="kb-guide"><FileQuestion size={28}/><h2>什麼適合放進知識庫？</h2><p>內容越明確，AI 回覆越穩定。請避免上傳過期或互相矛盾的資料。</p><ul><li>住宿價目與加價規則</li><li>入住、退房與接送方式</li><li>商品庫存與配送政策</li><li>常見問題與標準回答</li></ul><div><strong>安全規則已啟用</strong><span>健康、空房、退款與爭議問題一律轉人工。</span></div></aside></div>
  </main>;
}
