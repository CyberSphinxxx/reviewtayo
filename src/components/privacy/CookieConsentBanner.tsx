"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Shield, Cookie, X, Check, Settings2 } from "lucide-react";

export interface CookieConsentState {
  essential: boolean;
  analytics: boolean;
  ads: boolean;
  hasChosen: boolean;
  updatedAt: number;
}

const STORAGE_KEY = "csereviewer_cookie_consent";

export function getStoredConsent(): CookieConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CookieConsentState;
  } catch {
    return null;
  }
}

export function saveStoredConsent(state: CookieConsentState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(
      new CustomEvent("cookie-consent-updated", { detail: state })
    );

    // Google Consent Mode v2 integration (ADS-04, ADS-05)
    type GtagFn = (...args: unknown[]) => void;
    const win = window as unknown as { gtag?: GtagFn };
    if (typeof win.gtag === "function") {
      win.gtag("consent", "update", {
        ad_storage: state.ads ? "granted" : "denied",
        ad_user_data: state.ads ? "granted" : "denied",
        ad_personalization: state.ads ? "granted" : "denied",
        analytics_storage: state.analytics ? "granted" : "denied",
      });
    }
  } catch {
    // ignore storage quota issues
  }
}

export function CookieConsentBanner() {
  const [mounted, setMounted] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);
  const [adsAllowed, setAdsAllowed] = useState(false);

  const handleOpenSettings = useCallback(() => {
    setShowSettings(true);
    setShowBanner(true);
  }, []);

  useEffect(() => {
    setMounted(true);
    // Certified CMP Detection (IAB TCF v2.3 / Google Privacy & Messaging)
    // When a certified CMP is present, it is the sole authority for advertising consent.
    const win = window as unknown as { __tcfapi?: unknown };

    if (typeof win.__tcfapi === "function") {
      // A certified CMP owns the complete TCF decision (purposes, special features,
      // and vendor consent). Do not reduce that decision to a single local boolean.
      setShowBanner(false);
      return;
    }

    const existing = getStoredConsent();
    if (!existing || !existing.hasChosen) {
      // The onboarding flow has its own first-party privacy gate; showing
      // the global banner there too would stack two consent surfaces and
      // the fixed banner would cover the flow's controls.
      if (!window.location.pathname.startsWith("/onboarding")) {
        setShowBanner(true);
      }
    } else {
      setAnalyticsAllowed(existing.analytics);
      setAdsAllowed(existing.ads);
    }

    // Allow footer or other buttons to reopen settings
    const handleReopen = () => {
      handleOpenSettings();
    };

    window.addEventListener("open-cookie-settings", handleReopen);

    // Another surface (e.g. the onboarding privacy gate) may make the
    // consent decision first; honor it instead of lingering on top of the
    // page where the fixed banner would swallow clicks underneath.
    const handleConsentUpdated = (event: Event) => {
      const detail = (event as CustomEvent<CookieConsentState>).detail;
      if (detail?.hasChosen) {
        setAnalyticsAllowed(detail.analytics);
        setAdsAllowed(detail.ads);
        setShowBanner(false);
        setShowSettings(false);
      }
    };
    window.addEventListener("cookie-consent-updated", handleConsentUpdated);

    return () => {
      window.removeEventListener("open-cookie-settings", handleReopen);
      window.removeEventListener("cookie-consent-updated", handleConsentUpdated);
    };
  }, [handleOpenSettings]);

  if (!mounted || !showBanner) {
    return null;
  }

  const handleAcceptAll = () => {
    const consent: CookieConsentState = {
      essential: true,
      analytics: true,
      ads: true,
      hasChosen: true,
      updatedAt: Date.now(),
    };
    saveStoredConsent(consent);
    setAnalyticsAllowed(true);
    setAdsAllowed(true);
    setShowBanner(false);
    setShowSettings(false);
  };

  const handleDeclineNonEssential = () => {
    const consent: CookieConsentState = {
      essential: true,
      analytics: false,
      ads: false,
      hasChosen: true,
      updatedAt: Date.now(),
    };
    saveStoredConsent(consent);
    setAnalyticsAllowed(false);
    setAdsAllowed(false);
    setShowBanner(false);
    setShowSettings(false);
  };

  const handleSavePreferences = () => {
    const consent: CookieConsentState = {
      essential: true,
      analytics: analyticsAllowed,
      ads: adsAllowed,
      hasChosen: true,
      updatedAt: Date.now(),
    };
    saveStoredConsent(consent);
    setShowBanner(false);
    setShowSettings(false);
  };

  return (
    <div
      id="cookie-consent-banner"
      role="region"
      aria-label="Cookie and Privacy Consent"
      className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 bg-transparent pointer-events-none"
    >
      <div className="max-w-4xl mx-auto pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/80 p-5 sm:p-6 transition-all duration-300">
          {!showSettings ? (
            /* Concise Banner Summary */
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5 flex-1">
                <div className="p-2 rounded-xl bg-brand-50 text-brand-700 shrink-0 border border-brand-100">
                  <Cookie className="w-5 h-5" />
                </div>
                <div className="space-y-1 text-left">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    Privacy & Ad Transparency Notice
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      RA 10173
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    We use cookies and privacy-respecting advertising partners (Google AdSense) to keep this Civil Service Exam reviewer 100% free and accessible for Filipino civil servants. You can manage your preferences or accept all to support the platform.{" "}
                    <Link
                      href="/privacy"
                      className="text-brand-700 underline font-medium hover:text-brand-800"
                    >
                      Read our Privacy Policy
                    </Link>
                    .
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 justify-end">
                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  Customize
                </button>
                <button
                  type="button"
                  onClick={handleDeclineNonEssential}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-xl hover:bg-slate-50 transition"
                >
                  Essential Only
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="px-4 py-2 text-xs font-bold text-white bg-brand-700 hover:bg-brand-800 rounded-xl shadow-md shadow-brand-700/20 transition flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-gold-400" />
                  Accept All
                </button>
              </div>
            </div>
          ) : (
            /* Granular Preferences Modal Dialog */
            <div className="space-y-5 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-brand-700" />
                  <h3 className="text-base font-bold text-slate-900">
                    Cookie & Advertising Preferences
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
                  aria-label="Close preferences"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Essential */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">Strictly Essential</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        Required
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Session state, offline quiz persistence, timer accuracy, and CSRF protection.
                    </p>
                  </div>
                </div>

                {/* Analytics */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="cookie-analytics-toggle" className="font-bold text-slate-900 cursor-pointer">
                        Anonymous Analytics
                      </label>
                      <input
                        type="checkbox"
                        id="cookie-analytics-toggle"
                        checked={analyticsAllowed}
                        onChange={(e) => setAnalyticsAllowed(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Aggregated metrics on diagnostic completion rates and system performance.
                    </p>
                  </div>
                </div>

                {/* Advertising */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="cookie-ads-toggle" className="font-bold text-slate-900 cursor-pointer">
                        Advertising &amp; Ads
                      </label>
                      <input
                        type="checkbox"
                        id="cookie-ads-toggle"
                        checked={adsAllowed}
                        onChange={(e) => setAdsAllowed(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Google AdSense advertising cookies that support free access for examinees.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleDeclineNonEssential}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition"
                >
                  Reject Non-Essential
                </button>
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="px-4 py-2 text-xs font-bold text-white bg-brand-700 hover:bg-brand-800 rounded-xl shadow-md transition"
                >
                  Save My Preferences
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
