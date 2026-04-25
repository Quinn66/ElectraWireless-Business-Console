import { useState } from "react";
import { ConsoleTopBar } from "@/components/ConsoleTopBar";
import { ConsoleSidebar, type ConsoleTool } from "@/components/ConsoleSidebar";
import { ConsoleAISidebar } from "@/components/ConsoleAISidebar";
import { ProjectionPage } from "@/pages/ProjectionPage";
import { PersonalFinancePage } from "@/pages/PersonalFinancePage";
import { ConsoleHome } from "@/pages/ConsoleHome";
import ProfileSelector from "@/ProfileSelector";
import OnboardingFlow from "@/OnboardingFlow";
import { useProjectionStore } from "@/store/projectionStore";
import { PROFILE_PRESETS, DEFAULT_PRESET } from "@/lib/profilePresets";
import type { ProfilePreset } from "@/lib/profilePresets";

type OnboardStage = "idle" | "profile-selector" | "onboarding-flow";

export function BusinessConsoleDashboard() {
  const [activeTool, setActiveTool]           = useState<ConsoleTool>("home");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [onboardStage, setOnboardStage]       = useState<OnboardStage>("idle");
  const [profilePreset, setProfilePreset]     = useState<ProfilePreset | null>(null);
  const [projectionOnboarded, setProjectionOnboarded] = useState(false);

  const accountType = useProjectionStore((s) => s.accountType);

  function handleOpenProjection() {
    setActiveTool("projection");
    if (!projectionOnboarded) {
      setOnboardStage("profile-selector");
    }
  }

  function renderMainContent() {
    if (activeTool === "home") {
      return (
        <ConsoleHome
          onOpenProjection={handleOpenProjection}
          onOpenPersonal={() => setActiveTool("personal")}
        />
      );
    }

    if (activeTool === "projection") {
      if (onboardStage === "profile-selector") {
        return (
          <ProfileSelector
            accountType={accountType ?? "user"}
            onSelect={(profileId) => {
              setProfilePreset(PROFILE_PRESETS[profileId] ?? DEFAULT_PRESET);
              setOnboardStage("onboarding-flow");
            }}
            onBack={() => {
              setOnboardStage("idle");
              setActiveTool("home");
            }}
          />
        );
      }

      if (onboardStage === "onboarding-flow") {
        return (
          <OnboardingFlow
            initialValues={profilePreset ?? DEFAULT_PRESET}
            onComplete={() => {
              setOnboardStage("idle");
              setProjectionOnboarded(true);
            }}
            onBack={() => {
              setProfilePreset(null);
              setOnboardStage("profile-selector");
            }}
          />
        );
      }

      return <ProjectionPage />;
    }

    if (activeTool === "personal") {
      return <PersonalFinancePage />;
    }

    return null;
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <ConsoleTopBar sidebarExpanded={sidebarExpanded} />

      <div className="flex flex-1 overflow-hidden min-h-0">
        <ConsoleSidebar
          activeTool={activeTool}
          onSelect={(tool) => tool === "projection" ? handleOpenProjection() : setActiveTool(tool)}
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded((e) => !e)}
        />

        <div className="flex-1 overflow-hidden min-w-0">
          {renderMainContent()}
        </div>

        <ConsoleAISidebar activeTool={activeTool} />
      </div>
    </div>
  );
}
