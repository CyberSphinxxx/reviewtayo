"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingFlow } from "@/features/onboarding/OnboardingFlow";
import { OnboardingService } from "@/lib/onboarding/onboarding-service";
import { getPostAuthDestinationFromState, sanitizeReturnTo } from "@/lib/onboarding/destination";

/**
 * Standalone onboarding route (focused canvas, no app chrome). The page
 * resolves the entry state client-side: a completed/dismissed user is sent
 * to their destination instead of replaying the flow, an in-progress user
 * resumes their saved step, and edit mode (?edit=1) is always honored.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editMode = params.get("edit") === "1";
    const returnTo = sanitizeReturnTo(params.get("returnTo"));

    if (!editMode) {
      const state = OnboardingService.getState();
      // Redirect away when this user does not need first-run onboarding:
      // completed, dismissed, or an established (legacy) user who never
      // started it. In-progress and brand-new users stay and (re)sume.
      const notNeeded =
        state.status === "completed" ||
        state.status === "dismissed" ||
        (state.status === "not_started" && OnboardingService.isEstablishedUser());
      if (notNeeded) {
        const dest = getPostAuthDestinationFromState(returnTo);
        router.replace(dest);
        return;
      }
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    // Brief pre-render state while the redirect/resume decision resolves.
    return (
      <div className="min-h-dvh bg-[#fdf8f6] dark:bg-[#1a0c11]" aria-busy="true" />
    );
  }

  return <OnboardingFlow />;
}
