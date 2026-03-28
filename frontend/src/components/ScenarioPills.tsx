import { useProjectionStore, ScenarioPreset } from "@/store/projectionStore";

const PILLS: { label: string; value: ScenarioPreset }[] = [
  { label: "Bear", value: "bear" },
  { label: "Base", value: "base" },
  { label: "Bull", value: "bull" },
  { label: "Custom", value: "custom" },
];

export function ScenarioPills() {
  const { activeScenario, setActiveScenario } = useProjectionStore();

  return (
    <div className="flex gap-2">
      {PILLS.map((pill) => {
        const isActive = activeScenario === pill.value;
        return (
          <button
            key={pill.value}
            onClick={() => setActiveScenario(pill.value)}
            style={{
              backgroundColor: isActive ? "#C9A84C" : "transparent",
              color: isActive ? "#fff" : "#888",
              border: `1px solid ${isActive ? "#C9A84C" : "#333"}`,
              borderRadius: "9999px",
              padding: "4px 14px",
              fontSize: "12px",
              fontWeight: isActive ? 600 : 400,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {pill.label}
          </button>
        );
      })}
    </div>
  );
}
