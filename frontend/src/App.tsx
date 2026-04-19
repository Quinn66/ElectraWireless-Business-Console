import { useState, useEffect } from "react";
import { ProjectionPage } from "@/pages/ProjectionPage";
import { PersonalFinancePage } from "@/pages/PersonalFinancePage";
import { SpreadsheetPage } from "@/pages/SpreadsheetPage";
import OnboardingFlow from "./OnboardingFlow";
import LoginScreen from "./LoginScreen";
import ProfileSelector from "./ProfileSelector";
import ToolSelector from "./ToolSelector";
import type { ToolKey } from "./ToolSelector";
import { useProjectionStore } from "@/store/projectionStore";
import type { AccountType } from "@/store/projectionStore";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import { PROFILE_PRESETS, DEFAULT_PRESET } from "@/lib/profilePresets";
import type { ProfilePreset } from "@/lib/profilePresets";

const GradientBg = () => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: -1,
      background: "linear-gradient(135deg, #c3cef0 0%, #e8b8ce 60%, #f5c8d8 100%)",
    }}
  />
);

export default function App() {
  const setAccountType = useProjectionStore((s) => s.setAccountType);
  const accountType = useProjectionStore((s) => s.accountType);
  const spreadsheetOpen = useSpreadsheetStore((s) => s.isOpen);

  const _nav = (): Record<string, unknown> => {
    try { return JSON.parse(localStorage.getItem("ew-nav") ?? "{}"); } catch { return {}; }
  };

  const [loggedIn, setLoggedIn] = useState<boolean>(() => (_nav().loggedIn as boolean) ?? false);
  const [selectedTool, setSelectedTool] = useState<ToolKey | null>(() => (_nav().selectedTool as ToolKey) ?? null);
  const [profilePreset, setProfilePreset] = useState<ProfilePreset | null>(() => (_nav().profilePreset as ProfilePreset) ?? null);
  const [onboarded, setOnboarded] = useState<boolean>(() => (_nav().onboarded as boolean) ?? false);

  // Persist nav state so a page refresh lands back where the user was
  useEffect(() => {
    localStorage.setItem("ew-nav", JSON.stringify({ loggedIn, selectedTool, profilePreset, onboarded, accountType }));
  }, [loggedIn, selectedTool, profilePreset, onboarded, accountType]);

  const currentView = () => {
    if (!loggedIn) {
      return (
        <LoginScreen
          onSelect={(type: AccountType) => {
            setAccountType(type);
            setLoggedIn(true);
          }}
        />
      );
    }

    if (accountType === "user" && !selectedTool) {
      return (
        <ToolSelector
          onSelect={(tool) => setSelectedTool(tool)}
          onBack={() => setLoggedIn(false)}
        />
      );
    }

    if (selectedTool === "personal") {
      return <PersonalFinancePage />;
    }

    if (!profilePreset) {
      return (
        <ProfileSelector
          accountType={accountType!}
          onSelect={(profileId) => setProfilePreset(PROFILE_PRESETS[profileId] ?? DEFAULT_PRESET)}
          onBack={() => {
            if (accountType === "user") setSelectedTool(null);
            else setLoggedIn(false);
          }}
        />
      );
    }

    if (!onboarded) {
      return (
        <OnboardingFlow
          initialValues={profilePreset}
          onComplete={() => setOnboarded(true)}
          onBack={() => setProfilePreset(null)}
        />
      );
    }

    return <ProjectionPage />;
  };

  const goHome = () => {
    setLoggedIn(false);
    setSelectedTool(null);
    setProfilePreset(null);
    setOnboarded(false);
  };

  return (
    <>
      <GradientBg />
      {currentView()}
      {/* SpreadsheetPage renders as a fixed overlay on top of any view */}
      {spreadsheetOpen && <SpreadsheetPage />}
      {loggedIn && (
        <button
          onClick={goHome}
          title="Go to Home"
          style={{
            position: "fixed",
            bottom: "24px",
            left: "24px",
            zIndex: 9999,
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(0,0,0,0.12)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.1)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.2)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.15)";
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
            <polyline points="9 21 9 12 15 12 15 21" />
          </svg>
        </button>
      )}
    </>
  );
}
