"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signUp, requestPasswordReset, resetPassword } from "@/lib/auth/auth-client";
import { getPostAuthDestinationFromState } from "@/lib/onboarding/destination";
import { ReviewTayoOwl } from "@/components/brand/ReviewTayoOwl";
import {
  FIELD_SETS,
  META,
  RULES,
  GENERIC_ERROR,
  type FieldSpec,
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

export type AuthStandaloneState =
  | "signin"
  | "create"
  | "reset"
  | "reset-sent"
  | "newpass"
  | "newpass-invalid"
  | "newpass-done";

const FIELD_ICON: Record<FieldSpec["icon"], React.ComponentType<{ className?: string }>> = {
  mail: Mail,
  lock: Lock,
  user: User,
};

const ROUTE_FOR_STATE: Partial<Record<AuthStandaloneState, string>> = {
  signin: "/sign-in",
  create: "/create-account",
  reset: "/forgot-password",
};

/** Shared theme-safe tokens (defined in both themes in globals.css). */
const CARD = "bg-[color:var(--card)]";
const INK = "text-[color:var(--brand-text)]";
const MUTED = "text-[color:var(--brand-muted)]";
const LINE = "border-[color:var(--brand-border)]";
const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a]";

function Field({
  spec,
  stateKey,
  value,
  error,
  onChange,
}: {
  spec: FieldSpec;
  stateKey: "signin" | "create" | "reset" | "newpass";
  value: string;
  error: string | null;
  onChange: (id: string, value: string) => void;
}) {
  const [show, setShow] = useState(false);
  const inputId = `${stateKey}-${spec.id}`;
  const Icon = FIELD_ICON[spec.icon];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2.5">
        <label htmlFor={inputId} className={`text-[13px] font-bold ${INK}`}>
          {spec.label}
        </label>
        {spec.forgot && (
          <Link
            href="/forgot-password"
            className={`rounded-md px-1 py-0.5 text-[13px] font-bold text-brand-700 hover:underline dark:text-[#ff9fb5] ${FOCUS}`}
          >
            Forgot password?
          </Link>
        )}
      </div>
      <div className="relative">
        <Icon className={`pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 ${MUTED}`} aria-hidden="true" />
        <input
          id={inputId}
          name={spec.id}
          type={spec.type === "password" && show ? "text" : spec.type}
          value={value}
          onChange={(e) => onChange(spec.id, e.target.value)}
          placeholder={spec.placeholder}
          autoComplete={spec.autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-err` : spec.hint || spec.meter ? `${inputId}-hint` : undefined}
          className={`w-full rounded-xl border-[1.5px] bg-transparent py-3 pl-11 ${
            spec.eye ? "pr-11" : "pr-4"
          } text-[15px] ${INK} outline-none transition placeholder:opacity-65 placeholder:${MUTED} focus:border-brand-700 focus:shadow-[0_0_0_3px_rgba(138,22,48,0.14)] dark:focus:border-[#ffd27a] dark:focus:shadow-[0_0_0_3px_rgba(255,210,122,0.16)] ${
            error
              ? "border-[#c4213f] shadow-[0_0_0_3px_rgba(157,26,51,0.12)]"
              : LINE
          }`}
        />
        {spec.eye && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-pressed={show}
            aria-label={show ? "Hide password" : "Show password"}
            className={`absolute right-1.5 top-1/2 grid h-[34px] w-[34px] -translate-y-1/2 place-items-center rounded-[9px] ${MUTED} transition hover:text-[color:var(--brand-text)] aria-pressed:text-brand-700 dark:aria-pressed:text-[#ff9fb5] ${FOCUS}`}
          >
            {show ? <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" /> : <Eye className="h-[18px] w-[18px]" aria-hidden="true" />}
          </button>
        )}
      </div>
      {(spec.hint || spec.meter) && !error && (
        <p id={`${inputId}-hint`} className={`text-[12.5px] ${MUTED}`}>
          {spec.hint}
          {spec.meter && (
            <>
              Use at least 8 characters.{" "}
              <span className={`font-extrabold ${value.length >= 8 ? "text-[#0b7a3b] dark:text-[#4ade80]" : ""}`}>
                {value.length}/8
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
}

export function AuthStandaloneForm({ initialState = "signin" }: { initialState?: AuthStandaloneState }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  // A reset link without its token can never succeed; show the invalid-link state.
  const [state, setState] = useState<AuthStandaloneState>(
    initialState === "newpass" && !token ? "newpass-invalid" : initialState
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);
  // Enter inside an input fires the form submit event even while the submit
  // button is disabled, so `disabled={loading}` alone cannot prevent a second
  // submission during an in-flight request. This ref closes that gap.
  const inFlightRef = useRef(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState("");

  const activeFields = useMemo<FieldSpec[]>(() => {
    switch (state) {
      case "signin": return FIELD_SETS.signin;
      case "create": return FIELD_SETS.create;
      case "reset": return FIELD_SETS.reset;
      case "newpass": return FIELD_SETS.newpass;
      default: return [];
    }
  }, [state]);

  const meta =
    state === "signin" || state === "create" || state === "reset" || state === "newpass"
      ? META[state]
      : null;

  const goTo = (next: AuthStandaloneState) => {
    setFormError(null);
    setErrors({});
    setState(next);
    const route = ROUTE_FOR_STATE[next];
    if (route && next !== state) router.push(route);
  };

  const handleChange = (id: string, value: string) => {
    setValues((v) => ({ ...v, [id]: value }));
    setErrors((e) => (e[id] ? { ...e, [id]: null } : e));
  };

  const validateAll = () => {
    const next: Record<string, string | null> = {};
    let firstBad: string | null = null;
    for (const f of activeFields) {
      let msg = RULES[f.id] ? RULES[f.id](values[f.id] ?? "") : "";
      if (!msg && f.id === "np-confirm" && (values["np-pass"] ?? "") !== (values["np-confirm"] ?? "")) {
        msg = "Passwords don't match.";
      }
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
      if (state === "signin") {
        const res = await signIn.email({
          email: (values["si-email"] ?? "").trim(),
          password: values["si-pass"] ?? "",
        });
        if (res.error) {
          setFormError("The email or password is incorrect.");
        } else {
          // Loop-safe destination: completed/established → dashboard (or
          // returnTo), first-time → onboarding (which resumes the saved step).
          router.push(getPostAuthDestinationFromState());
          router.refresh();
        }
      } else if (state === "create") {
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
        } else {
          // New accounts enter onboarding; accounts that already finished it
          // go to the dashboard. Established users are never re-onboarded.
          router.push(getPostAuthDestinationFromState());
          router.refresh();
        }
      } else if (state === "reset") {
        const email = (values["rs-email"] ?? "").trim();
        const res = await requestPasswordReset({ email });
        if (res.error) {
          setFormError(res.error.message || GENERIC_ERROR);
        } else {
          setSentEmail(email);
          setState("reset-sent");
        }
      } else if (state === "newpass") {
        const res = await resetPassword({
          newPassword: values["np-pass"] ?? "",
          token: token ?? undefined,
        });
        if (res.error) {
          setFormError("This reset link is invalid or has expired. Request a new one below.");
        } else {
          setState("newpass-done");
        }
      }
    } catch {
      setFormError(GENERIC_ERROR);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  /* ---------- terminal / confirmation states ---------- */

  if (state === "newpass-invalid") {
    return (
      <div role="status" className="flex w-full flex-col items-center gap-2.5 px-1 py-2.5 text-center">
        <ReviewTayoOwl mood="oops" withCap alt="Confused ReviewTayo owl" />
        <h2 tabIndex={-1} className={`font-display text-[23px] font-extrabold tracking-[-0.03em] ${INK}`}>
          This reset link is not valid
        </h2>
        <p className={`max-w-[40ch] text-sm ${MUTED}`}>
          The link may have expired or already been used. Request a fresh one and try again.
        </p>
        <button
          type="button"
          onClick={() => goTo("reset")}
          className={`mt-1.5 inline-flex items-center justify-center gap-2 rounded-xl border-[1.5px] ${LINE} px-4 py-2.5 text-sm font-extrabold ${INK} transition hover:-translate-y-0.5 hover:bg-[color:var(--blush)] ${FOCUS}`}
        >
          Request a new link
        </button>
      </div>
    );
  }

  if (state === "reset-sent") {
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
          onClick={() => goTo("signin")}
          className={`mt-1.5 inline-flex items-center justify-center gap-2 rounded-xl border-[1.5px] ${LINE} px-4 py-2.5 text-sm font-extrabold ${INK} transition hover:-translate-y-0.5 hover:bg-[color:var(--blush)] ${FOCUS}`}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  if (state === "newpass-done") {
    return (
      <div role="status" className="flex w-full flex-col items-center gap-2.5 px-1 py-2.5 text-center">
        <ReviewTayoOwl mood="happy" withCap alt="Happy ReviewTayo owl" />
        <h2 tabIndex={-1} className={`font-display text-[23px] font-extrabold tracking-[-0.03em] ${INK}`}>
          Password updated
        </h2>
        <p className={`text-sm ${MUTED}`}>All set, sign in with your new password.</p>
        <button
          type="button"
          onClick={() => goTo("signin")}
          className={`mt-1.5 inline-flex items-center justify-center gap-2 rounded-xl border-[1.5px] ${LINE} px-4 py-2.5 text-sm font-extrabold ${INK} transition hover:-translate-y-0.5 hover:bg-[color:var(--blush)] ${FOCUS}`}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  const showSwitcher = state === "signin" || state === "create";

  return (
    <div className="flex w-full flex-col gap-4">
      {showSwitcher && (
        <div
          role="group"
          aria-label="Sign in or create account"
          className="grid grid-cols-2 gap-1 rounded-xl bg-[color:var(--secondary)] p-1"
        >
          {(["signin", "create"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => goTo(s)}
              aria-pressed={state === s}
              className={`rounded-lg py-2 text-sm font-bold transition ${FOCUS} ${
                state === s
                  ? `${CARD} ${INK} shadow-[0_1px_4px_rgba(27,10,16,0.14)]`
                  : `${MUTED} hover:text-[color:var(--brand-text)]`
              }`}
            >
              {s === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>
      )}

      <header>
        <h2
          id="standalone-auth-title"
          tabIndex={-1}
          className={`font-display text-[23px] font-extrabold tracking-[-0.03em] ${INK}`}
        >
          {meta?.title}
        </h2>
        <p className={`mt-1 text-sm ${MUTED}`}>{meta?.sub}</p>
      </header>

      {formError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-[#f3ccd6] bg-[#fdeef1] p-3 text-[13px] font-semibold text-[#9d1a33] dark:border-[#4a1a27] dark:bg-[#4a1a27]/40 dark:text-[#ffb3c2]"
        >
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {activeFields.map((f) => (
          <Field
            key={f.id}
            spec={f}
            stateKey={state as "signin" | "create" | "reset" | "newpass"}
            value={values[f.id] ?? ""}
            error={errors[f.id] ?? null}
            onChange={handleChange}
          />
        ))}
        <button
          type="submit"
          disabled={loading}
          className={`mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 py-3 text-[15px] font-extrabold text-white shadow-[0_10px_24px_-10px_rgba(138,22,48,0.75)] transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-55 ${FOCUS}`}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>
                {state === "signin" && "Signing in..."}
                {state === "create" && "Creating account..."}
                {state === "reset" && "Sending instructions..."}
                {state === "newpass" && "Updating password..."}
              </span>
            </>
          ) : (
            meta?.cta
          )}
        </button>
      </form>

      {/* Footer links */}
      {state === "signin" && (
        <div className="flex flex-col items-center gap-2.5">
          <Link
            href="/practice"
            className={`w-full rounded-xl border-[1.5px] ${LINE} py-2.5 text-center text-sm font-extrabold ${INK} transition hover:bg-[color:var(--blush)] ${FOCUS}`}
          >
            Continue without an account
          </Link>
          <p className={`text-[13.5px] ${MUTED}`}>
            New to CSE Reviewer?{" "}
            <Link href="/create-account" className={`rounded font-bold text-brand-700 hover:underline dark:text-[#ff9fb5] ${FOCUS}`}>
              Create a free account
            </Link>
          </p>
        </div>
      )}
      {state === "create" && (
        <div className="flex flex-col items-center gap-2.5">
          <Link
            href="/practice"
            className={`w-full rounded-xl border-[1.5px] ${LINE} py-2.5 text-center text-sm font-extrabold ${INK} transition hover:bg-[color:var(--blush)] ${FOCUS}`}
          >
            Continue without an account
          </Link>
          <p className={`text-[13.5px] ${MUTED}`}>
            Already have an account?{" "}
            <Link href="/sign-in" className={`rounded font-bold text-brand-700 hover:underline dark:text-[#ff9fb5] ${FOCUS}`}>
              Sign in
            </Link>
          </p>
        </div>
      )}
      {(state === "reset" || state === "newpass") && (
        <p className={`text-center text-[13.5px] ${MUTED}`}>
          <Link href="/sign-in" className={`rounded font-bold text-brand-700 hover:underline dark:text-[#ff9fb5] ${FOCUS}`}>
            &larr; Back to sign in
          </Link>
        </p>
      )}

      {/* Data privacy — only a create-account concern */}
      {state === "create" && (
        <div className={`mt-1 flex items-start gap-2.5 rounded-[14px] bg-[color:var(--secondary)] p-3.5 text-[12.5px] leading-relaxed ${MUTED}`}>
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
