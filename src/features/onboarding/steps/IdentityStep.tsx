"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CloudUpload, HardDrive } from "lucide-react";
import { ChoiceCard, ContinueButton } from "./ChoiceCard";
import type { UseOnboardingFlowResult } from "../useOnboardingFlow";
import { AuthModal } from "@/components/auth/AuthModal";

/**
 * Step 1 — identity. Two equally usable options; the account path opens the
 * existing auth modal (reusing its guest-data migration screen), while guest
 * mode explains local-only persistence honestly before the learner chooses.
 */
export function IdentityStep({ flow }: { flow: UseOnboardingFlowResult }) {
  const [authOpen, setAuthOpen] = useState(false);
  const selected = flow.state.answers.identityMode;

  const chooseGuest = () => {
    // Selection only — the explicit Continue below advances, keeping the
    // interaction pattern consistent with every other step.
    flow.patchAnswers({ identityMode: "guest" });
  };

  return (
    <div>
      <div className="space-y-3" role="radiogroup" aria-label="How to keep your progress">
        <ChoiceCard
          name="Save my progress"
          selected={selected === "account"}
          onSelect={() => {
            flow.patchAnswers({ identityMode: "account" });
            setAuthOpen(true);
          }}
          title="Save my progress"
          description="Create a free account or sign in. Your scores and streak sync across devices where supported."
          icon={<CloudUpload className="w-5 h-5" aria-hidden="true" />}
        />
        <ChoiceCard
          name="Continue as guest"
          selected={selected === "guest"}
          onSelect={chooseGuest}
          title="Continue as guest"
          description="No account needed. Progress is kept on this device only and can be lost if browser data is cleared."
          icon={<HardDrive className="w-5 h-5" aria-hidden="true" />}
        />
      </div>

      <p className="mt-3 text-[12.5px] text-[#8a7a80] dark:text-[#c99aa6]">
        Guest data stays on your device and is never uploaded. See our{" "}
        <Link
          href="/privacy"
          className="font-semibold text-[#8a1630] dark:text-[#ff9fb5] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a] rounded"
        >
          privacy notice
        </Link>
        .
      </p>

      {/* Account path: reuse the existing auth modal end to end. Cancelling or
          closing returns here with all previous answers intact — no trap. */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode="create-account"
        onSuccess={() => {
          setAuthOpen(false);
          flow.next();
        }}
      />

      <ContinueButton
        label="Continue"
        onClick={flow.next}
        disabled={selected !== "account" && selected !== "guest"}
      />
    </div>
  );
}
