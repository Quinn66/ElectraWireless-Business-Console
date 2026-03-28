import { useState } from "react";
import { ProjectionPage } from "@/pages/ProjectionPage";
import OnboardingFlow from "./OnboardingFlow";

export default function App() {
  const [onboarded, setOnboarded] = useState(false);

  if (!onboarded) {
    return <OnboardingFlow onComplete={() => setOnboarded(true)} />;
  }

  return <ProjectionPage />;
}