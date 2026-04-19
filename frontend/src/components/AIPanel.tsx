import { useState, useRef } from "react";
import { C_BORDER } from "@/lib/colors";
import { API_BASE, type AnalysisResult } from "@/lib/api";

const BG     = "rgba(255,255,255,0.50)";
const BG_SEC = "rgba(255,255,255,0.80)";

export function AIPanel() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit() {
    const question = input.trim();
    if (!question || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data: AnalysisResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", height: "100%" }}>

      {/* Input section */}
      <div
        style={{
          backgroundColor: BG_SEC,
          border: `1px solid ${C_BORDER}`,
          borderRadius: "10px",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: "12px 14px 8px",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            color: "hsl(245 16% 49%)",
            borderBottom: `1px solid ${C_BORDER}`,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="hsl(247 57% 33%)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          AI Suggestions
        </div>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="e.g. What if we hired 2 more sales reps and increased marketing spend by $5,000?"
          style={{
            width: "100%",
            minHeight: "90px",
            maxHeight: "140px",
            backgroundColor: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            padding: "12px 14px",
            fontSize: "12.5px",
            color: "hsl(242 44% 30%)",
            lineHeight: 1.6,
            fontFamily: "inherit",
            boxSizing: "border-box",
            opacity: loading ? 0.6 : 1,
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 12px 10px",
            borderTop: `1px solid ${C_BORDER}`,
          }}
        >
          <span style={{ fontSize: "10.5px", color: "hsl(245 16% 60%)" }}>
            Enter to submit · Shift+Enter for new line
          </span>
          <button
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            style={{
              backgroundColor: loading || !input.trim() ? "hsl(245 16% 85%)" : "hsl(247 57% 33%)",
              color: loading || !input.trim() ? "hsl(245 16% 55%)" : "white",
              border: "none",
              borderRadius: "6px",
              padding: "5px 14px",
              fontSize: "11.5px",
              fontWeight: 600,
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              transition: "background-color 150ms",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {loading ? (
              <>
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    border: "1.5px solid hsl(245 16% 55%)",
                    borderTopColor: "transparent",
                    display: "inline-block",
                    animation: "spin 0.7s linear infinite",
                  }}
                />
                Analysing…
              </>
            ) : (
              "Analyse"
            )}
          </button>
        </div>
      </div>

      {/* Output section */}
      {(result || error || loading) && (
        <div
          style={{
            backgroundColor: BG,
            border: `1px solid ${C_BORDER}`,
            borderRadius: "10px",
            overflow: "hidden",
            flex: 1,
          }}
        >
          <div
            style={{
              padding: "10px 14px 8px",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              color: "hsl(245 16% 49%)",
              borderBottom: `1px solid ${C_BORDER}`,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="hsl(247 57% 33%)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            AI Analysis
          </div>

          <div style={{ padding: "14px 16px" }}>
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "hsl(245 16% 55%)", fontSize: "12.5px" }}>
                <span
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    border: "1.5px solid hsl(245 16% 70%)",
                    borderTopColor: "hsl(247 57% 33%)",
                    display: "inline-block",
                    animation: "spin 0.7s linear infinite",
                    flexShrink: 0,
                  }}
                />
                Running analysis…
              </div>
            )}

            {error && (
              <div style={{ fontSize: "12.5px", color: "#ef4444", lineHeight: 1.6 }}>
                {error}
              </div>
            )}

            {result && !loading && (
              <p
                style={{
                  fontSize: "13px",
                  color: "hsl(242 44% 35%)",
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {result.analysis_short}
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
