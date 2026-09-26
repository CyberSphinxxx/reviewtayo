import React, { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { ReviewTayoOwl } from "@/components/brand/ReviewTayoOwl";
import { useSession } from "@/lib/auth/auth-client";
import { AuthModal } from "@/components/auth/AuthModal";
import { OnboardingService } from "@/lib/onboarding/onboarding-service";
import { getPostAuthDestinationFromState } from "@/lib/onboarding/destination";

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const { data: session, refetch } = useSession();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  // Users with a real study history OR a saved onboarding session get
  // "Continue studying"; brand-new visitors get the guided "Get started"
  // entry. Computed after mount from local state so SSR markup stays stable.
  // (A completed/abandoned onboarding alone also means there is something to
  // resume — the dashboard shows the study plan it produced.)
  const [established, setEstablished] = useState(false);
  useEffect(() => {
    setEstablished(
      OnboardingService.isEstablishedUser() ||
        OnboardingService.getStatus() !== "not_started"
    );
  }, [session]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let rafId: number | null = null;

    const handlePointerMove = (e: PointerEvent) => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const rect = section.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;

        const items = section.querySelectorAll<HTMLElement>("[data-depth]");
        items.forEach((el) => {
          const depth = parseFloat(el.dataset.depth || "0");
          el.style.transform = `translate(${(-x * depth).toFixed(1)}px, ${(-y * depth).toFixed(1)}px)`;
        });
      });
    };

    const handlePointerLeave = () => {
      const items = section.querySelectorAll<HTMLElement>("[data-depth]");
      items.forEach((el) => {
        el.style.transform = "";
      });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", handlePointerLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("mouseleave", handlePointerLeave);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="sec-a"
      data-parallax
      className="relative min-h-[700px] flex flex-col items-center pt-9 px-6 pb-0 text-center overflow-hidden"
    >
      {/* Background Decorative Glow & Dashed Concentric Rings */}
      <div className="absolute left-1/2 -bottom-[150px] w-[560px] h-[560px] rounded-full -translate-x-1/2 bg-[radial-gradient(circle,#f7cdd5_0,#f9e0e4_52%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(138,22,48,0.3)_0,rgba(59,26,37,0.4)_52%,transparent_70%)] pointer-events-none" />
      <div className="absolute left-1/2 -bottom-[270px] w-[460px] h-[460px] -translate-x-1/2 border-[1.5px] border-dashed border-[#8a1630]/30 dark:border-white/15 rounded-full pointer-events-none" />
      <div className="absolute left-1/2 -bottom-[410px] w-[700px] h-[700px] -translate-x-1/2 border-[1.5px] border-dashed border-[#8a1630]/30 dark:border-white/15 rounded-full pointer-events-none" />

      {/* Display Headline */}
      <h1 className="font-display font-extrabold text-[clamp(42px,6.8vw,88px)] leading-[0.98] tracking-[-0.035em] text-[#1b1216] dark:text-[#f8ecee] relative z-10 m-0">
        Review smarter.
        <br />
        Pass sooner.
      </h1>

      {/* Subtitle */}
      <p className="text-[20px] text-[#5a4a50] dark:text-[#d6bcc3] mt-5 mb-7 max-w-[34ch] relative z-10 font-normal">
        Free timed mock exams for Philippine government and licensure tests.
      </p>

      {/* Calls to Action */}
      <div className="flex gap-3 flex-wrap justify-center relative z-10">
        {session?.user ? (
          established ? (
            <>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-6 py-[15px] rounded-[14px] font-bold text-[16px] text-white bg-[#8a1630] shadow-[0_10px_24px_-10px_rgba(138,22,48,0.75)] hover:-translate-y-0.5 hover:shadow-[0_16px_28px_-10px_rgba(138,22,48,0.8)] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b93b]"
              >
                Continue studying &rarr;
              </Link>
              <Link
                href="/reviewers"
                className="inline-flex items-center justify-center gap-2 px-6 py-[15px] rounded-[14px] font-bold text-[16px] text-[#1b1216] dark:text-[#f8ecee] bg-white dark:bg-[#2b1620] shadow-[inset_0_0_0_1.5px_rgba(27,18,22,0.24)] dark:shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.2)] hover:bg-[rgba(27,18,22,0.06)] dark:hover:bg-[#3b1a25] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b93b]"
              >
                Browse exams
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center gap-2 px-6 py-[15px] rounded-[14px] font-bold text-[16px] text-white bg-[#8a1630] shadow-[0_10px_24px_-10px_rgba(138,22,48,0.75)] hover:-translate-y-0.5 hover:shadow-[0_16px_28px_-10px_rgba(138,22,48,0.8)] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b93b]"
              >
                Get started
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-6 py-[15px] rounded-[14px] font-bold text-[16px] text-[#1b1216] dark:text-[#f8ecee] bg-white dark:bg-[#2b1620] shadow-[inset_0_0_0_1.5px_rgba(27,18,22,0.24)] dark:shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.2)] hover:bg-[rgba(27,18,22,0.06)] dark:hover:bg-[#3b1a25] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b93b]"
              >
                My dashboard
              </Link>
            </>
          )
        ) : established ? (
          <>
            {/* Returning guest (same device): resume where they left off. */}
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-6 py-[15px] rounded-[14px] font-bold text-[16px] text-white bg-[#8a1630] shadow-[0_10px_24px_-10px_rgba(138,22,48,0.75)] hover:-translate-y-0.5 hover:shadow-[0_16px_28px_-10px_rgba(138,22,48,0.8)] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b93b]"
            >
              Continue studying &rarr;
            </Link>
            <Link
              href="/onboarding?edit=1"
              className="inline-flex items-center justify-center gap-2 px-6 py-[15px] rounded-[14px] font-bold text-[16px] text-[#1b1216] dark:text-[#f8ecee] bg-white dark:bg-[#2b1620] shadow-[inset_0_0_0_1.5px_rgba(27,18,22,0.24)] dark:shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.2)] hover:bg-[rgba(27,18,22,0.06)] dark:hover:bg-[#3b1a25] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b93b]"
            >
              Update my study plan
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center gap-2 px-6 py-[15px] rounded-[14px] font-bold text-[16px] text-white bg-[#8a1630] shadow-[0_10px_24px_-10px_rgba(138,22,48,0.75)] hover:-translate-y-0.5 hover:shadow-[0_16px_28px_-10px_rgba(138,22,48,0.8)] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b93b]"
            >
              Get started
            </Link>
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-[15px] rounded-[14px] font-bold text-[16px] text-[#1b1216] dark:text-[#f8ecee] bg-white dark:bg-[#2b1620] shadow-[inset_0_0_0_1.5px_rgba(27,18,22,0.24)] dark:shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.2)] hover:bg-[rgba(27,18,22,0.06)] dark:hover:bg-[#3b1a25] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b93b]"
            >
              Sign in
            </button>
          </>
        )}
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          refetch();
          // Automatic first-login rule: a brand-new account goes through
          // onboarding (resuming a saved step); everyone else stays put.
          const dest = getPostAuthDestinationFromState();
          if (dest !== "/onboarding") return;
          window.location.assign(dest);
        }}
      />

      {/* Trust Badges */}
      <div className="flex gap-x-[22px] gap-y-2 justify-center flex-wrap mt-5 font-semibold text-[14px] text-[#4d3d43] dark:text-[#d6bcc3] relative z-10">
        <span className="inline-flex items-center gap-1.5">
          <svg className="w-[17px] h-[17px] stroke-[#12a150] fill-none stroke-[3] stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
          No account needed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg className="w-[17px] h-[17px] stroke-[#12a150] fill-none stroke-[3] stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
          Free diagnostic
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg className="w-[17px] h-[17px] stroke-[#12a150] fill-none stroke-[3] stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
          Explanations included
        </span>
      </div>

      {/* Floating Proof Cards */}
      <div ref={cardsRef} className="cards">
        {/* Card 1: Question item preview (left top) */}
        <div className="fw" data-depth="26" style={{ left: "3%", top: "36%" }}>
          <div className="fc fq" style={{ ["--r" as string]: "-3deg" }}>
            <span className="chip">Verbal ability</span>
            <p className="q">Opposite of “scarce”?</p>
            <div className="pills">
              <i>Rare</i>
              <i className="ok">Plentiful</i>
              <i>Costly</i>
            </div>
          </div>
        </div>

        {/* Card 2: 82% Circular Score Result (right top) */}
        <div className="fw" data-depth="36" style={{ right: "3%", top: "32%" }}>
          <div className="fc fs" style={{ ["--r" as string]: "3deg" }}>
            <svg viewBox="0 0 80 80" width="78" className="mx-auto mb-1.5" aria-hidden="true">
              <circle cx="40" cy="40" r="32" fill="none" strokeWidth="9" className="stroke-[#f3dfe3] dark:stroke-[#3a1f29]" />
              <circle
                cx="40"
                cy="40"
                r="32"
                fill="none"
                stroke="#8a1630"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray="165 201"
                transform="rotate(-90 40 40)"
              />
              <text
                x="40"
                y="46"
                textAnchor="middle"
                fontSize="19"
                fontWeight="800"
                fontFamily="Bricolage Grotesque, sans-serif"
                className="fill-[#1b1216] dark:fill-[#f8ecee]"
              >
                82%
              </text>
            </svg>
            <b className="block font-bold text-[14px] text-[#1b1216] dark:text-[#f8ecee]">Verbal ability</b>
            <small>sample result</small>
          </div>
        </div>

        {/* Card 3: Owl Explanation Tip (left bottom) */}
        <div className="fw" data-depth="30" style={{ left: "11%", bottom: "84px" }}>
          <div className="fc fx" style={{ ["--r" as string]: "2deg" }}>
            <span className="ow w-[38px] shrink-0 block">
              <ReviewTayoOwl size={38} withCap />
            </span>
            <p className="font-semibold text-[14px] leading-[1.3] text-[#1b1216] dark:text-[#f8ecee] m-0">
              Scarce means hard to find, so the opposite is plentiful.
            </p>
          </div>
        </div>

        {/* Card 4: Full mock exam progress (right bottom) */}
        <div className="fw" data-depth="40" style={{ right: "10%", bottom: "140px" }}>
          <div className="fc fp" style={{ ["--r" as string]: "-2deg" }}>
            <small>Full mock exam</small>
            <b>
              64<span style={{ fontSize: "18px", opacity: 0.6 }}> / 170</span>
            </b>
            <div className="bar">
              <i />
            </div>
          </div>
        </div>
      </div>

      {/* Hero Owl Mascot */}
      <div className="w-[210px] relative z-10 mt-auto pt-6 animate-owl-bob">
        <ReviewTayoOwl size={210} withCap alt="ReviewTayo Owl Mascot" />
      </div>
    </section>
  );
}
