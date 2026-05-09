interface SpinnerProps {
  /** Diameter in pixels. Defaults to 12 (matches the existing PF panel size). */
  size?: number;
}

export function Spinner({ size = 12 }: SpinnerProps) {
  return (
    <span
      className="rounded-full border-[1.5px] border-[hsl(245_16%_55%)] border-t-transparent inline-block animate-[spin_0.7s_linear_infinite] flex-shrink-0"
      style={{ width: size, height: size }}
    />
  );
}
