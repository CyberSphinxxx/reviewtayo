import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SignInPage from "@/app/(public)/sign-in/page";
import CreateAccountPage from "@/app/(public)/create-account/page";
import ForgotPasswordPage from "@/app/(public)/forgot-password/page";
import ResetPasswordPage from "@/app/(public)/reset-password/page";
import { AuthStandaloneForm } from "@/components/auth/AuthStandaloneForm";
import { signIn, signUp, requestPasswordReset, resetPassword } from "@/lib/auth/auth-client";

// Mock next/navigation (useSearchParams must return a stable URLSearchParams)
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(window.location.search),
  usePathname: () => "/",
}));

// Mock better-auth client
vi.mock("@/lib/auth/auth-client", () => ({
  signIn: { email: vi.fn() },
  signUp: { email: vi.fn() },
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}));

describe("Standalone Auth Pages (Concept C)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.history.replaceState(null, "", "/");
  });

  it("standalone form ignores a second submit while a request is in flight", async () => {
    let resolveSignIn: (value: unknown) => void = () => {};
    vi.mocked(signIn.email).mockImplementationOnce(
      () => new Promise((resolve) => { resolveSignIn = resolve; }) as ReturnType<typeof signIn.email>
    );

    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: "juan@example.ph" } });
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: "Secret123!" } });

    const submitBtn = screen.getByRole("button", { name: "Sign In" });
    fireEvent.click(submitBtn);
    await waitFor(() => expect(submitBtn).toBeDisabled());

    // Second submit while in flight (e.g. pressing Enter in an input)
    const form = submitBtn.closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    expect(signIn.email).toHaveBeenCalledTimes(1);

    resolveSignIn({ data: { user: { id: "u-1" } } });
    await waitFor(() => expect(submitBtn).toBeEnabled());
    expect(signIn.email).toHaveBeenCalledTimes(1);
  });

  it("renders /sign-in with brand panel, owl, benefits and the sign-in form", () => {
    render(<SignInPage />);

    // Brand panel
    expect(screen.getByRole("heading", { name: /Review smarter/i })).toBeInTheDocument();
    expect(screen.getByText("Live · Civil Service Exam")).toBeInTheDocument();
    expect(screen.getByText("Sync your study progress")).toBeInTheDocument();
    // Form side
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your password")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to practice/i })).toHaveAttribute("href", "/practice");
    // No privacy box on sign-in (it is a create-account concern only)
    expect(screen.queryByText(/Data Privacy:/i)).not.toBeInTheDocument();
  });

  it("renders /create-account with the privacy notice and password meter hint", () => {
    render(<CreateAccountPage />);

    expect(screen.getByText("Create your free account")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Juan Dela Cruz")).toBeInTheDocument();
    expect(screen.getByText(/Data Privacy:/i)).toHaveAttribute("href", "/privacy");
    expect(screen.getByText(/Use at least 8 characters./i)).toBeInTheDocument();
  });

  it("renders /forgot-password with the reset form", () => {
    render(<ForgotPasswordPage />);

    expect(screen.getByText("Reset your password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send Reset Link/i })).toBeInTheDocument();
  });

  it("renders /reset-password new-password form when a token is present", () => {
    window.history.replaceState(null, "", "/reset-password?token=abc123");
    render(<ResetPasswordPage />);

    expect(screen.getByText("Set a new password")).toBeInTheDocument();
    expect(screen.getByLabelText(/^New password$/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Confirm new password/i)).toBeInTheDocument();
  });

  it("renders the invalid-link state on /reset-password without a token", () => {
    render(<ResetPasswordPage />);

    expect(screen.getByText("This reset link is not valid")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Request a new link/i })).toBeInTheDocument();
  });

  it("shows inline per-field errors and focuses the first invalid field on sign-in", async () => {
    render(<SignInPage />);

    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(signIn.email).not.toHaveBeenCalled();
    expect(document.activeElement?.id).toContain("si-email");
  });

  it("toggles password visibility with the eye button", () => {
    render(<SignInPage />);

    const passwordInput = screen.getByPlaceholderText("Enter your password");
    expect(passwordInput).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(passwordInput).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("signs in with valid credentials and routes a new user to onboarding", async () => {
    vi.mocked(signIn.email).mockResolvedValueOnce({
      data: { user: { id: "u-1" } },
    } as unknown as ReturnType<typeof signIn.email>);

    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: "juan@example.ph" } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: "Secret123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(signIn.email).toHaveBeenCalledWith({ email: "juan@example.ph", password: "Secret123!" });
      // Fresh visitor (no history, no onboarding record) → guided setup.
      expect(pushMock).toHaveBeenCalledWith("/onboarding");
    });
  });

  it("routes an established user to the dashboard after sign-in (never re-onboarded)", async () => {
    window.localStorage.setItem(
      "rt_workspaces_v1",
      JSON.stringify([
        {
          id: "workspace_cse",
          examId: "cse",
          levelId: "professional",
          createdAt: new Date().toISOString(),
          lastAccessedAt: new Date().toISOString(),
        },
      ])
    );
    vi.mocked(signIn.email).mockResolvedValueOnce({
      data: { user: { id: "u-1" } },
    } as unknown as ReturnType<typeof signIn.email>);

    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: "juan@example.ph" } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: "Secret123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("creates an account and routes a new user to onboarding", async () => {
    vi.mocked(signUp.email).mockResolvedValueOnce({
      data: { user: { id: "u-1" } },
    } as unknown as ReturnType<typeof signUp.email>);

    render(<AuthStandaloneForm initialState="create" />);

    fireEvent.change(screen.getByLabelText(/Display Name/i), { target: { value: "Juan Dela Cruz" } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: "juan@example.ph" } });
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: "ValidPass123!" } });
    fireEvent.click(screen.getByRole("button", { name: /Create Account & Sync/i }));

    await waitFor(() => {
      expect(signUp.email).toHaveBeenCalledWith({
        email: "juan@example.ph",
        password: "ValidPass123!",
        name: "Juan Dela Cruz",
      });
      expect(pushMock).toHaveBeenCalledWith("/onboarding");
    });
  });

  it("surfaces a duplicate-email signup as an inline email error", async () => {
    vi.mocked(signUp.email).mockResolvedValueOnce({
      error: { message: "User already exists with this email" },
    } as unknown as ReturnType<typeof signUp.email>);

    render(<AuthStandaloneForm initialState="create" />);

    fireEvent.change(screen.getByLabelText(/Display Name/i), { target: { value: "Juan Dela Cruz" } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: "taken@example.ph" } });
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: "ValidPass123!" } });
    fireEvent.click(screen.getByRole("button", { name: /Create Account & Sync/i }));

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
  });

  it("sends a reset request and shows the check-inbox state without confirming the email exists", async () => {
    vi.mocked(requestPasswordReset).mockResolvedValueOnce({ data: { success: true } });

    render(<AuthStandaloneForm initialState="reset" />);

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: "juan@example.ph" } });
    fireEvent.click(screen.getByRole("button", { name: /Send Reset Link/i }));

    await waitFor(() => {
      expect(requestPasswordReset).toHaveBeenCalledWith({ email: "juan@example.ph" });
    });
    expect(await screen.findByText("Check your inbox")).toBeInTheDocument();
    expect(screen.getByText(/If an account matches/)).toBeInTheDocument();
  });

  it("submits a new password with the token and shows the success state", async () => {
    vi.mocked(resetPassword).mockResolvedValueOnce({ data: { status: true } } as unknown as ReturnType<typeof resetPassword>);
    window.history.replaceState(null, "", "/reset-password?token=tok-1");

    render(<AuthStandaloneForm initialState="newpass" />);

    fireEvent.change(screen.getByLabelText(/^New password$/), { target: { value: "NewPass123!" } });
    fireEvent.change(screen.getByLabelText(/Confirm new password/i), { target: { value: "NewPass123!" } });
    fireEvent.click(screen.getByRole("button", { name: /Update Password/i }));

    await waitFor(() => {
      expect(resetPassword).toHaveBeenCalledWith({ newPassword: "NewPass123!", token: "tok-1" });
    });
    expect(await screen.findByText("Password updated")).toBeInTheDocument();
  });

  it("rejects mismatched confirmation passwords inline", async () => {
    window.history.replaceState(null, "", "/reset-password?token=tok-1");
    render(<AuthStandaloneForm initialState="newpass" />);

    fireEvent.change(screen.getByLabelText(/^New password$/), { target: { value: "NewPass123!" } });
    fireEvent.change(screen.getByLabelText(/Confirm new password/i), { target: { value: "Different123!" } });
    fireEvent.click(screen.getByRole("button", { name: /Update Password/i }));

    expect(await screen.findByText("Passwords don't match.")).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });
});
