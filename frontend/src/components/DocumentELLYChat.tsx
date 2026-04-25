import { useState, useRef, useEffect } from "react";
import { useDocumentStore, type ChatMessage } from "@/store/documentStore";
import { C_BORDER, C_PRIMARY } from "@/lib/colors";
import type { StoredDocument } from "@/store/documentStore";

interface DocumentELLYChatProps {
  doc: StoredDocument;
  gridRef: React.MutableRefObject<any>;
}

const BG     = "rgba(255,255,255,0.55)";
const BG_SEC = "rgba(255,255,255,0.85)";

export function DocumentELLYChat({ doc, gridRef }: DocumentELLYChatProps) {
  const { chatHistory, addChatMessage } = useDocumentStore();
  const messages: ChatMessage[] = chatHistory[doc.id] ?? [];

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildContext = (): string => {
    if (doc.parsedData) {
      const hot = gridRef.current?.hotInstance;
      const rows = hot ? hot.getData() : doc.parsedData.rows;
      const headers = doc.parsedData.headers.join(", ");
      const preview = rows.slice(0, 20).map((r: any[]) => r.join(", ")).join("\n");
      return `Document: ${doc.name}\nHeaders: ${headers}\nFirst 20 rows:\n${preview}`;
    }
    if (doc.docxHtml) {
      const text = doc.docxHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 1500);
      return `Document: ${doc.name}\nContent excerpt:\n${text}`;
    }
    return `Document: ${doc.name} (${doc.ext.toUpperCase()} file)`;
  };

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", text, timestamp: Date.now() };
    addChatMessage(doc.id, userMsg);
    setInput("");
    setLoading(true);

    const docContext = buildContext();
    const question = `You are ELLY, an AI business analyst. The user is viewing a document.\n\n${docContext}\n\nUser question: ${text}\n\nAnswer concisely and helpfully. If they ask you to make an edit, describe exactly what change to make.`;

    try {
      const res = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      const ellyMsg: ChatMessage = {
        role: "elly",
        text: data.analysis_short ?? data.analysis_detailed ?? "No response.",
        timestamp: Date.now(),
      };
      addChatMessage(doc.id, ellyMsg);
    } catch {
      addChatMessage(doc.id, {
        role: "elly",
        text: "Could not reach ELLY. Make sure the backend is running.",
        timestamp: Date.now(),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      backgroundColor: BG, border: `1px solid ${C_BORDER}`, borderRadius: "10px",
      overflow: "hidden",
    }}>

      {/* Header */}
      <div style={{
        padding: "10px 14px", borderBottom: `1px solid ${C_BORDER}`,
        backgroundColor: BG_SEC, flexShrink: 0,
        display: "flex", alignItems: "center", gap: "7px",
      }}>
        <div style={{
          width: "8px", height: "8px", borderRadius: "50%",
          backgroundColor: C_PRIMARY, flexShrink: 0,
        }} />
        <span style={{ fontSize: "11px", fontWeight: 700, color: "hsl(247 57% 33%)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          ELLY
        </span>
        <span style={{ fontSize: "10px", color: "hsl(245 16% 55%)" }}>— Ask about this document</span>
      </div>

      {/* Message thread */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {messages.length === 0 && (
          <div style={{ color: "hsl(245 16% 60%)", fontSize: "12px", lineHeight: 1.6, textAlign: "center", marginTop: "20px" }}>
            <div style={{ fontSize: "20px", marginBottom: "8px", opacity: 0.4 }}>✦</div>
            Ask ELLY anything about <strong style={{ color: "hsl(247 57% 33%)" }}>{doc.name}</strong>.
            <br />
            e.g. "Summarise this document" or "What is the total revenue?"
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: msg.role === "user" ? "row-reverse" : "row",
              gap: "8px",
              alignItems: "flex-end",
            }}
          >
            {msg.role === "elly" && (
              <div style={{
                width: "22px", height: "22px", borderRadius: "50%", backgroundColor: C_PRIMARY,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "9px", fontWeight: 700, color: "#fff", flexShrink: 0,
              }}>
                E
              </div>
            )}
            <div style={{
              maxWidth: "82%",
              backgroundColor: msg.role === "user" ? "hsl(247 57% 33%)" : BG_SEC,
              color: msg.role === "user" ? "#fff" : "hsl(242 44% 30%)",
              border: msg.role === "user" ? "none" : `1px solid ${C_BORDER}`,
              borderRadius: msg.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
              padding: "9px 12px",
              fontSize: "12.5px",
              lineHeight: 1.6,
            }}>
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
            <div style={{
              width: "22px", height: "22px", borderRadius: "50%", backgroundColor: C_PRIMARY,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "9px", fontWeight: 700, color: "#fff", flexShrink: 0,
            }}>
              E
            </div>
            <div style={{
              backgroundColor: BG_SEC, border: `1px solid ${C_BORDER}`,
              borderRadius: "12px 12px 12px 4px", padding: "10px 14px",
              display: "flex", gap: "4px", alignItems: "center",
            }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: "5px", height: "5px", borderRadius: "50%", backgroundColor: C_PRIMARY,
                  animation: `ellypulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  opacity: 0.6,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: `1px solid ${C_BORDER}`, flexShrink: 0, backgroundColor: BG_SEC }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="Ask ELLY about this document… (Enter to send)"
          style={{
            width: "100%", minHeight: "68px", maxHeight: "120px",
            backgroundColor: "transparent", border: "none", outline: "none",
            resize: "none", padding: "12px 14px",
            fontSize: "12.5px", color: "hsl(242 44% 30%)", lineHeight: 1.6,
            fontFamily: "inherit", boxSizing: "border-box",
            opacity: loading ? 0.6 : 1,
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 12px 10px" }}>
          <button
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            style={{
              backgroundColor: loading || !input.trim() ? "hsl(245 16% 85%)" : C_PRIMARY,
              color: loading || !input.trim() ? "hsl(245 16% 55%)" : "#fff",
              border: "none", borderRadius: "6px", padding: "5px 16px",
              fontSize: "11.5px", fontWeight: 600, cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              transition: "background-color 150ms",
            }}
          >
            Send
          </button>
        </div>
      </div>

      <style>{`
        @keyframes ellypulse {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
