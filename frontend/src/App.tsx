import { useState } from "react";
import { ProjectionPage } from "@/pages/ProjectionPage";
import OnboardingFlow from "./OnboardingFlow";
import LoginScreen from "./LoginScreen";
import ProfileSelector from "./ProfileSelector";
import ToolSelector from "./ToolSelector";
import { useProjectionStore } from "@/store/projectionStore";
import type { AccountType } from "@/store/projectionStore";
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
  const [loggedIn, setLoggedIn] = useState(false);
  const [toolSelected, setToolSelected] = useState(false);
  const [profilePreset, setProfilePreset] = useState<ProfilePreset | null>(null);
  const [onboarded, setOnboarded] = useState(false);

  if (!loggedIn) {
    return (
      <>
        <GradientBg />
        <LoginScreen
          onSelect={(type: AccountType) => {
            setAccountType(type);
            setLoggedIn(true);
          }}
        />
      </>
    );
  }

  // "User" accounts see the tool picker before the profile selector
  if (accountType === "user" && !toolSelected) {
    return (
      <>
        <GradientBg />
        <ToolSelector
          onSelect={() => setToolSelected(true)}
          onBack={() => setLoggedIn(false)}
        />
      </>
    );
  }

  if (!profilePreset) {
    return (
      <>
        <GradientBg />
        <ProfileSelector
          accountType={accountType!}
          onSelect={(profileId) => setProfilePreset(PROFILE_PRESETS[profileId] ?? DEFAULT_PRESET)}
          onBack={() => {
            if (accountType === "user") setToolSelected(false);
            else setLoggedIn(false);
          }}
        />
      </>
    );
  }

  if (!onboarded) {
    return (
      <>
        <GradientBg />
        <OnboardingFlow
          initialValues={profilePreset}
          onComplete={() => setOnboarded(true)}
          onBack={() => setProfilePreset(null)}
        />
      </>
    );
  }

  return (
    <>
      <GradientBg />
      <ProjectionPage />
    </>
  );
}
