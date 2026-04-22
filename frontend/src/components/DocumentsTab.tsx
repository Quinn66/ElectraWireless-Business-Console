import { useRef, useCallback, useState } from "react";
import mammoth from "mammoth";
import { useDocumentStore, type StoredDocument } from "@/store/documentStore";
import { parseFile } from "@/lib/importUtils";
import { DocumentViewer } from "@/components/DocumentViewer";
import { DocumentELLYChat } from "@/components/DocumentELLYChat";
import { C_BORDER, C_PRIMARY, C_ERROR } from "@/lib/colors";

const BG     = "rgba(255,255,255,0.50)";
const BG_SEC = "rgba(255,255,255,0.82)";
const C_TEXT  = "hsl(242 44% 30%)";
const C_MUTED = "hsl(245 16% 55%)";

export function DocumentsTab() {
  const { documents, selectedId, insights, addDocument, removeDocument, selectDocument, setInsights } =
    useDocumentStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const gridRef      = useRef<any>(null);
  const [uploading, setUploading]         = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const selectedDoc = documents.find((d) => d.id === selectedId) ?? null;

  // ── File ingestion ────────────────────────────────────────────────────────
  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const id  = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const base: StoredDocument = { id, name: file.name, ext, file, uploadedAt: Date.now() };

      if (["csv", "xlsx", "xls"].includes(ext)) {
        try {
          const parsedData = await parseFile(file);
          addDocument({ ...base, parsedData });
        } catch {
          addDocument(base);
        }
      } else if (["doc", "docx"].includes(ext)) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          addDocument({ ...base, docxHtml: result.value });
        } catch {
          addDocument(base);
        }
      } else {
        addDocument(base);
      }
    }
    setUploading(false);
  }, [addDocument]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  // ── AI Insights ───────────────────────────────────────────────────────────
  const generateInsights = async (doc: StoredDocument) => {
    setInsightsLoading(true);
    let context = `Document: ${doc.name}`;
    if (doc.parsedData) {
      const hot = gridRef.current?.hotInstance;
      const rows = hot ? hot.getData() : doc.parsedData.rows;
      const headers = doc.parsedData.headers.join(", ");
      const preview = rows.slice(0, 30).map((r: any[]) => r.join(", ")).join("\n");
      context += `\nHeaders: ${headers}\nData:\n${preview}`;
    } else if (doc.docxHtml) {
      context += `\nContent: ${doc.docxHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 2000)}`;
    }

    const question = `${context}\n\nGive exactly 4 concise, actionable business insights about this document. Each insight must be one sentence. Return ONLY a JSON array of 4 strings, no extra text. Example: ["insight1","insight2","insight3","insight4"]`;

    try {
      const res = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      const raw: string = data.analysis_short ?? data.analysis_detailed ?? "";
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        const bullets: string[] = JSON.parse(match[0]);
        setInsights(doc.id, bullets.slice(0, 4));
      } else {
        // Fallback: split by sentence/newline
        const bullets = raw.split(/\n|(?<=\.)\s+/).filter(Boolean).slice(0, 4);
        setInsights(doc.id, bullets.length ? bullets : [raw]);
      }
    } catch {
      setInsights(doc.id, ["Could not generate insights — make sure the backend is running."]);
    } finally {
      setInsightsLoading(false);
    }
  };

  const docInsights = selectedDoc ? (insights[selectedDoc.id] ?? []) : [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100%", gap: "0", overflow: "hidden" }}>

      {/* ── Left sidebar: document list ── */}
      <div style={{
        width: "210px", flexShrink: 0, borderRight: `1px solid ${C_BORDER}`,
        display: "flex", flexDirection: "column", backgroundColor: BG_SEC,
      }}>
        {/* Sidebar header */}
        <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${C_BORDER}`, flexShrink: 0 }}>
          <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C_MUTED, marginBottom: "10px" }}>
            Documents
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,.xlsx,.xls,.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.txt"
            style={{ display: "none" }}
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              width: "100%", padding: "7px 10px", fontSize: "12px", fontWeight: 600,
              color: uploading ? C_MUTED : C_PRIMARY,
              backgroundColor: "rgba(47,36,133,0.08)",
              border: `1px solid rgba(47,36,133,0.20)`,
              borderRadius: "7px", cursor: uploading ? "wait" : "pointer",
            }}
          >
            {uploading ? "Uploading…" : "+ Upload Document"}
          </button>
        </div>

        {/* Drop zone hint (when empty) */}
        {documents.length === 0 && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: "20px",
              color: C_MUTED, fontSize: "11.5px", textAlign: "center", gap: "8px",
            }}
          >
            <div style={{ fontSize: "24px", opacity: 0.3 }}>↑</div>
            Drag & drop files here or click Upload
          </div>
        )}

        {/* Document list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {documents.map((doc) => {
            const isSelected = doc.id === selectedId;
            return (
              <div
                key={doc.id}
                onClick={() => selectDocument(doc.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "9px 12px", cursor: "pointer",
                  backgroundColor: isSelected ? "rgba(47,36,133,0.10)" : "transparent",
                  borderLeft: isSelected ? `3px solid ${C_PRIMARY}` : "3px solid transparent",
                  borderBottom: `1px solid ${C_BORDER}`,
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(47,36,133,0.04)"; }}
                onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
              >
                <ExtBadge ext={doc.ext} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "12px", fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? C_PRIMARY : C_TEXT,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {doc.name}
                  </div>
                  <div style={{ fontSize: "10px", color: C_MUTED }}>
                    {new Date(doc.uploadedAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeDocument(doc.id); }}
                  style={{ fontSize: "12px", color: "hsl(245 16% 70%)", background: "none", border: "none", cursor: "pointer", padding: "2px 4px", flexShrink: 0 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C_ERROR)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "hsl(245 16% 70%)")}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: viewer + chat + insights ── */}
      {!selectedDoc ? (
        /* Empty state */
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: "12px", color: C_MUTED,
          }}
        >
          <div style={{ fontSize: "36px", opacity: 0.2 }}>📄</div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: C_TEXT }}>No document selected</div>
          <div style={{ fontSize: "12px" }}>Upload a file or select one from the list</div>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              marginTop: "8px", fontSize: "12px", fontWeight: 600, color: C_PRIMARY,
              backgroundColor: "rgba(47,36,133,0.08)", border: `1px solid rgba(47,36,133,0.20)`,
              borderRadius: "7px", padding: "8px 20px", cursor: "pointer",
            }}
          >
            + Upload Document
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden", padding: "16px", gap: "12px" }}>

          {/* Top: viewer + chat (split pane) */}
          <div style={{ flex: 1, display: "flex", gap: "12px", minHeight: 0 }}>

            {/* Document viewer */}
            <div style={{ flex: "1 1 0", minWidth: 0 }}>
              <DocumentViewer doc={selectedDoc} gridRef={gridRef} />
            </div>

            {/* ELLY chat */}
            <div style={{ width: "300px", flexShrink: 0 }}>
              <DocumentELLYChat doc={selectedDoc} gridRef={gridRef} />
            </div>
          </div>

          {/* Bottom: AI insights panel */}
          <div style={{
            flexShrink: 0,
            backgroundColor: BG_SEC,
            border: `1px solid ${C_BORDER}`,
            borderRadius: "10px",
            overflow: "hidden",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 16px", borderBottom: docInsights.length > 0 ? `1px solid ${C_BORDER}` : "none",
              backgroundColor: "rgba(47,36,133,0.04)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C_PRIMARY }}>
                  ✦ Key AI Insights
                </span>
                <span style={{ fontSize: "10px", color: C_MUTED }}>
                  {docInsights.length > 0 ? `${docInsights.length} insights` : "Post-analysis summary"}
                </span>
              </div>
              <button
                onClick={() => generateInsights(selectedDoc)}
                disabled={insightsLoading}
                style={{
                  fontSize: "11px", fontWeight: 600,
                  color: insightsLoading ? C_MUTED : C_PRIMARY,
                  backgroundColor: "rgba(47,36,133,0.08)",
                  border: `1px solid rgba(47,36,133,0.20)`,
                  borderRadius: "5px", padding: "4px 12px",
                  cursor: insightsLoading ? "wait" : "pointer",
                }}
              >
                {insightsLoading ? "Analysing…" : docInsights.length > 0 ? "↺ Refresh" : "Analyse Document"}
              </button>
            </div>

            {docInsights.length > 0 && (
              <div style={{ display: "flex", gap: "0", padding: "12px 16px", flexWrap: "wrap" }}>
                {docInsights.map((insight, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: "8px",
                      width: "50%", padding: "6px 10px 6px 0",
                    }}
                  >
                    <div style={{
                      width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0,
                      backgroundColor: "rgba(47,36,133,0.12)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "9px", fontWeight: 700, color: C_PRIMARY, marginTop: "1px",
                    }}>
                      {i + 1}
                    </div>
                    <p style={{ margin: 0, fontSize: "12px", color: C_TEXT, lineHeight: 1.55 }}>
                      {insight}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {docInsights.length === 0 && !insightsLoading && (
              <div style={{ padding: "12px 16px", fontSize: "12px", color: C_MUTED }}>
                Click "Analyse Document" to generate key insights from ELLY.
              </div>
            )}

            {insightsLoading && (
              <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: C_MUTED }}>
                <div style={{
                  width: "12px", height: "12px", borderRadius: "50%",
                  border: "1.5px solid hsl(245 16% 70%)", borderTopColor: C_PRIMARY,
                  animation: "spin 0.7s linear infinite", flexShrink: 0,
                }} />
                ELLY is reading your document…
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function ExtBadge({ ext }: { ext: string }) {
  const color =
    ["xlsx", "xls", "csv"].includes(ext) ? "#1D6F42" :
    ext === "pdf" ? "#E44D26" :
    ["doc", "docx"].includes(ext) ? "#2B579A" :
    ["jpg", "jpeg", "png", "gif", "webp"].includes(ext) ? "#9B59B6" :
    "hsl(247 57% 33%)";

  const label =
    ["xlsx", "xls"].includes(ext) ? "XLS" :
    ext === "csv" ? "CSV" : ext === "pdf" ? "PDF" :
    ["doc", "docx"].includes(ext) ? "DOC" :
    ["jpg","jpeg","png","gif","webp"].includes(ext) ? "IMG" :
    ext.toUpperCase().slice(0, 3);

  return (
    <div style={{
      width: "28px", height: "28px", borderRadius: "4px", backgroundColor: color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "7px", fontWeight: 700, color: "#fff", letterSpacing: "0.04em", flexShrink: 0,
    }}>
      {label}
    </div>
  );
}
