import { C_ERROR } from "@/lib/colors";

interface AIErrorBlockProps {
  message: string;
  onRetry?: () => void;
  /** Headline shown above the error message. Defaults to "Couldn't load AI insights". */
  title?: string;
}

export function AIErrorBlock({
  message,
  onRetry,
  title = "Couldn't load AI insights",
}: AIErrorBlockProps) {
  return (
    <div
      style={{
        background: `${C_ERROR}0d`,
        border: `1.5px solid ${C_ERROR}40`,
        borderLeft: `3px solid ${C_ERROR}`,
        borderRadius: 12,
        padding: "14px 18px",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C_ERROR, marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontSize: 11.5, color: "hsl(245 16% 45%)", lineHeight: 1.5, wordBreak: "break-word" }}>
          {message}
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            background: C_ERROR,
            color: "#fff",
            border: "none",
            borderRadius: 7,
            padding: "6px 12px",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            flexShrink: 0,
            letterSpacing: "0.04em",
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
