import { useState } from "react";
import { BusinessConsoleDashboard } from "@/pages/BusinessConsoleDashboard";
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
  const [loggedIn, setLoggedIn] = useState(false);

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
