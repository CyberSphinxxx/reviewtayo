"use client";

/**
 * Modal-side auth form. Renders from the shared field specs in auth-fields.ts
 * and keeps the exact same props contract and auth calls (signIn.email,
 * signUp.email, requestPasswordReset) as before the redesign.
 */

import React, { useRef, useState } from "react";
import Link from "next/link";
import { signIn, signUp, requestPasswordReset } from "@/lib/auth/auth-client";
import { ReviewTayoOwl } from "@/components/brand/ReviewTayoOwl";
import {
  FIELD_SETS,
  META,
  RULES,
  GENERIC_ERROR,
  type FieldSpec,
  type FieldMetaKey,
} from "./auth-fields";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
} from "lucide-react";

export type AuthMode = "sign-in" | "create-account" | "forgot-password";

const FIELD_ICON: Record<FieldSpec["icon"], React.ComponentType<{ className?: string }>> = {
  mail: Mail,
  lock: Lock,
  user: User,
};

const STATE_FOR_MODE: Record<AuthMode, FieldMetaKey> = {
  "sign-in": "signin",
  "create-account": "create",
  "forgot-password": "reset",
};

const MODE_FOR_STATE: Record<FieldMetaKey, AuthMode> = {
  signin: "sign-in",
  create: "create-account",
  reset: "forgot-password",
  newpass: "sign-in",
};

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a]";
const INK = "text-[color:var(--brand-text)]";
const MUTED = "text-[color:var(--brand-muted)]";
const LINE = "border-[color:var(--brand-border)]";

interface AuthFormProps {
  initialMode?: AuthMode;
  mode?: AuthMode;
  onModeChange?: (mode: AuthMode) => void;
  onSuccess?: () => void;
  onGuestContinue?: () => void;
}

export function AuthForm({
  initialMode = "sign-in",
  mode: controlledMode,
  onModeChange,
  onSuccess,
  onGuestContinue,
}: AuthFormProps) {
  const [internalMode, setInternalMode] = useState<AuthMode>(initialMode);
  const currentMode = controlledMode ?? internalMode;
  const state = STATE_FOR_MODE[currentMode];

  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // Enter inside an input fires the form submit event even while the submit
  // button is disabled, so `disabled={loading}` alone cannot prevent a second
  // submission during an in-flight request. This ref closes that gap.
  const inFlightRef = useRef(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const activeFields = FIELD_SETS[state];
  const meta = META[state];

  const handleModeChange = (nextMode: AuthMode) => {
    setErrors({});
    setFormError(null);
    setResetSent(false);
    if (onModeChange) {
      onModeChange(nextMode);
    } else {
      setInternalMode(nextMode);
    }
  };

  const handleChange = (id: string, value: string) => {
    setValues((v) => ({ ...v, [id]: value }));
    setErrors((e) => (e[id] ? { ...e, [id]: null } : e));
  };

  const validateAll = () => {
    const next: Record<string, string | null> = {};
    let firstBad: string | null = null;
    for (const f of activeFields) {
      const msg = RULES[f.id] ? RULES[f.id](values[f.id] ?? "") : "";
      next[f.id] = msg || null;
      if (msg && !firstBad) firstBad = f.id;
    }
    setErrors(next);
    if (firstBad) {
      const el = document.getElementById(`${state}-${firstBad}`) as HTMLInputElement | null;
      el?.focus();
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlightRef.current) return;
    setFormError(null);
    if (!validateAll()) return;

    inFlightRef.current = true;
    setLoading(true);
    try {
      if (state === "reset") {
        const email = (values["rs-email"] ?? "").trim();
        const res = await requestPasswordReset({ email });
        if (res.error) {
          setFormError(res.error.message || GENERIC_ERROR);
        } else {
          setSentEmail(email);
          setResetSent(true);
        }
        return;
      }

      if (state === "create") {
        const res = await signUp.email({
          email: (values["ca-email"] ?? "").trim(),
          password: values["ca-pass"] ?? "",
          name: (values["ca-name"] ?? "").trim(),
        });
        if (res.error) {
          const msg = res.error.message?.toLowerCase() ?? "";
          if (msg.includes("already") || msg.includes("exist") || msg.includes("registered")) {
            setErrors({ "ca-email": "An account with this email already exists. Sign in instead." });
          } else {
            setFormError(res.error.message || GENERIC_ERROR);
          }
          return;
        }
        if (onSuccess) onSuccess();
        return;
      }

      // Sign in
      const res = await signIn.email({
        email: (values["si-email"] ?? "").trim(),
        password: values["si-pass"] ?? "",
      });
      if (res.error) {
        setFormError("The email or password is incorrect.");
        return;
      }
      if (onSuccess) onSuccess();
    } catch {
      setFormError(GENERIC_ERROR);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  /* ---------- reset-sent confirmation state ---------- */

  if (resetSent && state === "reset") {
    return (
      <div role="status" className="flex w-full flex-col items-center gap-2.5 px-1 py-2.5 text-center">
        <ReviewTayoOwl mood="happy" withCap alt="Happy ReviewTayo owl" />
        <h2 tabIndex={-1} className={`font-display text-[23px] font-extrabold tracking-[-0.03em] ${INK}`}>
          Check your inbox
        </h2>
        <p className={`max-w-[38ch] text-sm ${MUTED}`}>
          If an account matches <b className={INK}>{sentEmail || "your email"}</b>, reset instructions are on
          their way.
        </p>
        <button
          type="button"
          onClick={() => handleModeChange("sign-in")}
          className={`mt-1.5 inline-flex items-center justify-center gap-2 rounded-xl border-[1.5px] ${LINE} px-4 py-2.5 text-sm font-extrabold ${INK} transition hover:-translate-y-0.5 hover:bg-[color:var(--blush)] ${FOCUS}`}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  const fieldId = (f: FieldSpec) => `${state}-${f.id}`;

  return (
    <div className="w-full">
      {/* Sign in / Create account tabs */}
      <div
        role="group"
        aria-label="Sign in or create account"
        className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-[color:var(--secondary)] p-1"
      >
        {(["signin", "create"] as const).map((s) => {
          const tabMode = MODE_FOR_STATE[s];
          const active = state === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => handleModeChange(tabMode)}
              aria-pressed={active}
              className={`rounded-lg py-2 text-sm font-bold transition ${FOCUS} ${
                active
                  ? `bg-[color:var(--card)] ${INK} shadow-[0_1px_4px_rgba(27,10,16,0.14)]`
                  : `${MUTED} hover:text-[color:var(--brand-text)]`
              }`}
            >
              {s === "signin" ? "Sign in" : "Create account"}
            </button>
          );
        })}
      </div>

      <header className="mb-4">
        <h2
          id="auth-form-title"
          tabIndex={-1}
          className={`font-display text-[23px] font-extrabold tracking-[-0.03em] ${INK}`}
        >
          {meta.title}
        </h2>
        <p className={`mt-1 text-sm ${MUTED}`}>{meta.sub}</p>
      </header>

      {formError && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#f3ccd6] bg-[#fdeef1] p-3 text-[13px] font-semibold text-[#9d1a33] dark:border-[#4a1a27] dark:bg-[#4a1a27]/40 dark:text-[#ffb3c2]"
        >
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {activeFields.map((f) => {
          const inputId = fieldId(f);
          const Icon = FIELD_ICON[f.icon];
          const error = errors[f.id] ?? null;
          const isPassword = f.type === "password";
          return (
            <div key={f.id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2.5">
                <label htmlFor={inputId} className={`text-[13px] font-bold ${INK}`}>
                  {f.label}
                </label>
                {f.forgot && currentMode === "sign-in" && (
                  <button
                    type="button"
                    onClick={() => handleModeChange("forgot-password")}
                    className={`rounded-md px-1 py-0.5 text-[13px] font-bold text-brand-700 hover:underline dark:text-[#ff9fb5] ${FOCUS}`}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Icon
                  className={`pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 ${MUTED}`}
                  aria-hidden="true"
                />
                <input
                  id={inputId}
                  name={f.id}
                  type={isPassword && showPassword ? "text" : f.type}
                  value={values[f.id] ?? ""}
                  onChange={(e) => handleChange(f.id, e.target.value)}
                  placeholder={f.placeholder}
                  autoComplete={f.autoComplete}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={
                    error ? `${inputId}-err` : f.hint || f.meter ? `${inputId}-hint` : undefined
                  }
                  className={`w-full rounded-xl border-[1.5px] bg-transparent py-3 pl-11 ${
                    f.eye ? "pr-11" : "pr-4"
                  } text-[15px] ${INK} outline-none transition placeholder:opacity-65 focus:border-brand-700 focus:shadow-[0_0_0_3px_rgba(138,22,48,0.14)] dark:focus:border-[#ffd27a] dark:focus:shadow-[0_0_0_3px_rgba(255,210,122,0.16)] ${
                    error
                      ? "border-[#c4213f] shadow-[0_0_0_3px_rgba(157,26,51,0.12)]"
                      : LINE
                  }`}
                />
                {f.eye && (
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className={`absolute right-1.5 top-1/2 grid h-[34px] w-[34px] -translate-y-1/2 place-items-center rounded-[9px] ${MUTED} transition hover:text-[color:var(--brand-text)] aria-pressed:text-brand-700 dark:aria-pressed:text-[#ff9fb5] ${FOCUS}`}
                  >
                    {showPassword ? (
                      <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" aria-hidden="true" />
                    )}
                  </button>
                )}
              </div>
              {(f.hint || f.meter) && !error && (
                <p id={`${inputId}-hint`} className={`text-[12.5px] ${MUTED}`}>
                  {f.hint}
                  {f.meter && (
                    <>
                      Use at least 8 characters.{" "}
                      <span className={`font-extrabold ${(values[f.id] ?? "").length >= 8 ? "text-[#0b7a3b] dark:text-[#4ade80]" : ""}`}>
                        {(values[f.id] ?? "").length}/8
                      </span>
                    </>
                  )}
                </p>
              )}
              {error && (
                <p id={`${inputId}-err`} className="text-[12.5px] font-bold text-[#c4213f] dark:text-[#ff9fb5]">
                  {error}
                </p>
              )}
            </div>
          );
        })}

        <button
          type="submit"
          disabled={loading}
          className={`mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 py-3 text-[15px] font-extrabold text-white shadow-[0_10px_24px_-10px_rgba(138,22,48,0.75)] transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-55 ${FOCUS}`}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>
                {state === "create" && "Creating account..."}
                {state === "reset" && "Sending instructions..."}
                {state === "signin" && "Signing in..."}
              </span>
            </>
          ) : (
            meta.cta
          )}
        </button>
      </form>

      {/* Guest option + footer links */}
      <div className="mt-4 flex flex-col items-center gap-2.5">
        {onGuestContinue && (
          <button
            type="button"
            onClick={onGuestContinue}
            className={`w-full rounded-xl border-[1.5px] ${LINE} py-2.5 text-center text-sm font-extrabold ${INK} transition hover:bg-[color:var(--blush)] ${FOCUS}`}
          >
            Continue without an account
          </button>
        )}
        {state === "signin" && (
          <p className={`text-[13.5px] ${MUTED}`}>
            New to ReviewTayo?{" "}
            <button
              type="button"
              onClick={() => handleModeChange("create-account")}
              className={`rounded font-bold text-brand-700 hover:underline dark:text-[#ff9fb5] ${FOCUS}`}
            >
              Create a free account
            </button>
          </p>
        )}
        {state === "create" && (
          <p className={`text-[13.5px] ${MUTED}`}>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => handleModeChange("sign-in")}
              className={`rounded font-bold text-brand-700 hover:underline dark:text-[#ff9fb5] ${FOCUS}`}
            >
              Sign in
            </button>
          </p>
        )}
        {state === "reset" && (
          <p className={`text-[13.5px] ${MUTED}`}>
            <button
              type="button"
              onClick={() => handleModeChange("sign-in")}
              className={`rounded font-bold text-brand-700 hover:underline dark:text-[#ff9fb5] ${FOCUS}`}
            >
              &larr; Back to sign in
            </button>
          </p>
        )}
      </div>

      {/* Data privacy — only a create-account concern */}
      {state === "create" && (
        <div className={`mt-4 flex items-start gap-2.5 rounded-[14px] bg-[color:var(--secondary)] p-3.5 text-[12.5px] leading-relaxed ${MUTED}`}>
          <ShieldCheck className="mt-0.5 h-[17px] w-[17px] shrink-0 text-brand-700 dark:text-[#ff9fb5]" aria-hidden="true" />
          <p>
            <Link
              href="/privacy"
              className={`font-bold ${INK} underline underline-offset-2 hover:text-brand-700 dark:hover:text-[#ff9fb5] ${FOCUS}`}
            >
              Data Privacy:
            </Link>{" "}
            Creating an account is optional. We use your email and display name to save and sync your study
            progress across devices. You can export or delete your records anytime.
          </p>
        </div>
      )}
    </div>
  );
}
