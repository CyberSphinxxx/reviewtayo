/**
 * Post-auth and entry routing rules for onboarding (loop-safe by design).
 * Pure function of (status, established, returnTo) so the matrix is unit-
 * tested exhaustively — the UI never improvises destinations.
 */
import { OnboardingService } from "./onboarding-service";
import type { OnboardingStatus } from "./types";

export interface DestinationInput {
  status: OnboardingStatus;
  established: boolean;
  /** Where the user was heading before auth; must start with "/" if present. */
  returnTo?: string | null;
  editMode?: boolean;
}

/** Sanitizes a returnTo: only same-site absolute paths are allowed. */
export function sanitizeReturnTo(returnTo?: string | null): string | null {
  if (!returnTo) return null;
  if (!returnTo.startsWith("/")) return null;
  if (returnTo.startsWith("//")) return null;
  return returnTo;
}

export function getPostAuthDestination(input: DestinationInput): string {
  const returnTo = sanitizeReturnTo(input.returnTo);
  if (input.status === "completed" || input.status === "dismissed") {
    return returnTo ?? "/dashboard";
  }
  if (input.established) {
    // Legacy users keep normal app access; the dashboard offers a
    // dismissible setup card rather than a forced first-run flow.
    return returnTo ?? "/dashboard";
  }
  // New authenticated user without onboarding: enter (or resume) the flow.
  // The onboarding page itself resumes the saved step from storage.
  return "/onboarding";
}

/** Convenience wrapper reading current local state. */
export function getPostAuthDestinationFromState(
  returnTo?: string | null,
  editMode?: boolean
): string {
  const state = OnboardingService.getState();
  return getPostAuthDestination({
    status: state.status,
    established: OnboardingService.isEstablishedUser(),
    returnTo,
    editMode,
  });
}
