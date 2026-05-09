import { C_SUCCESS, C_WARNING, C_ERROR, C_PRIMARY } from "@/lib/colors";

// LLM output sometimes prefixes list items with "•", "-", "*", or "1." even
// after the backend parser runs. Strip them so we can apply a single consistent
// bullet style on the frontend.
export function stripBulletPrefix(s: string): string {
  return s.replace(/^[\s]*(?:[•\-*]|\d+\.)\s*/, "");
}

export function gradeFromScore(score: number | null): string {
  if (score === null) return "—";
  if (score >= 90) return "A";
  if (score >= 80) return "B+";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "F";
}

export function scoreColor(score: number | null): string {
  if (score === null) return C_PRIMARY;
  if (score >= 70) return C_SUCCESS;
  if (score >= 50) return C_WARNING;
  return C_ERROR;
}

interface HealthCircleProps {
  score: number | null;
  /** Outer diameter in pixels. Defaults to 48 (sidebar size). */
  size?: number;
}

export function HealthCircle({ score, size = 48 }: HealthCircleProps) {
  const color = scoreColor(score);
  const scoreFont = Math.round(size * 0.36);
  const gradeFont = Math.round(size * 0.18);
  return (
    <div
      className="flex flex-col items-center justify-center rounded-full flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: `${color}1a`,
        border: `1.5px solid ${color}66`,
      }}
    >
      <span className="font-bold leading-none" style={{ color, fontSize: scoreFont }}>
        {score ?? "—"}
      </span>
      <span
        className="font-semibold leading-none mt-0.5"
        style={{ color, fontSize: gradeFont }}
      >
        {gradeFromScore(score)}
      </span>
    </div>
  );
}
