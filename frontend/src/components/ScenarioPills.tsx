import { useProjectionStore, ScenarioPreset } from "@/store/projectionStore";
import { C_ERROR, C_SUCCESS } from "@/lib/colors";

const PILLS: { label: string; value: ScenarioPreset; activeColor: string }[] = [
  { label: "Bear",   value: "bear",   activeColor: C_ERROR },
  { label: "Base",   value: "base",   activeColor: "hsl(var(--primary))" },
  { label: "Bull",   value: "bull",   activeColor: C_SUCCESS },
  { label: "Custom", value: "custom", activeColor: "hsl(var(--muted-foreground))" },
];

export function ScenarioPills() {
  const { activeScenario, setActiveScenario } = useProjectionStore();

  return (
    <div className="flex gap-2 flex-wrap">
      {PILLS.map((pill) => {
        const isActive = activeScenario === pill.value;
        return (
          <button
            key={pill.value}
            onClick={() => setActiveScenario(pill.value)}
            className="rounded-full px-3.5 py-1 text-xs font-semibold cursor-pointer transition-all duration-150 border"
            style={{
              backgroundColor: isActive ? pill.activeColor : "rgba(255,255,255,0.40)",
              color: isActive ? "#fff" : "hsl(var(--muted-foreground))",
              borderColor: isActive ? pill.activeColor : "hsl(var(--border))",
              fontWeight: isActive ? 600 : 400,
            }}
          >
            {pill.label}
          </button>
        );
      })}
    </div>
  );
}
