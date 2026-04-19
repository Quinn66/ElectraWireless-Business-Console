import { useState, useEffect } from "react";
import { ProjectionPage } from "@/pages/ProjectionPage";
import { PersonalFinancePage } from "@/pages/PersonalFinancePage";
import { SpreadsheetPage } from "@/pages/SpreadsheetPage";
import LoginScreen from "./LoginScreen";
import { useProjectionStore } from "@/store/projectionStore";
import type { AccountType } from "@/store/projectionStore";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";

const GradientBg = () => (
  <div className="fixed inset-0 -z-10 bg-gradient-to-r from-[#D7D5F7] via-[#F9E1E7] to-[#F1E0F4]" />
);

export default function App() {
  const setAccountType = useProjectionStore((s) => s.setAccountType);
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

    return <BusinessConsoleDashboard />;
  };

  return (
    <>
      <GradientBg />
      {currentView()}
      {/* SpreadsheetPage renders as a fixed overlay on top of any view */}
      {spreadsheetOpen && <SpreadsheetPage />}
    </>
  );
}
