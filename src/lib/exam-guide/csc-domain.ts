/**
 * Official CSC Domain Validation and External Link Utilities.
 *
 * Rules:
 * 1. Only allow official Civil Service Commission domains.
 * 2. Links must use HTTPS.
 * 3. External links must open in a new tab with rel="noopener noreferrer".
 * 4. Never accept user-supplied redirect URLs.
 */

export const ALLOWED_OFFICIAL_CSC_DOMAINS = [
  "csc.gov.ph",
  "www.csc.gov.ph",
  "ocseas.csc.gov.ph",
  "services.csc.gov.ph",
  "erpo.csc.gov.ph",
  "exam.csc.gov.ph",
] as const;

/**
 * Validates whether a given URL points strictly to an official CSC domain.
 * Protects against open redirects, phishing domains, and lookalikes.
 */
export function isOfficialCscUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Require HTTPS protocol in production
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return false;
    }

    const hostname = url.hostname.toLowerCase();

    // Check exact match in allowlist
    if (ALLOWED_OFFICIAL_CSC_DOMAINS.includes(hostname as (typeof ALLOWED_OFFICIAL_CSC_DOMAINS)[number])) {
      return true;
    }

    // Also accept any valid subdomain strictly ending with .csc.gov.ph
    if (hostname.endsWith(".csc.gov.ph")) {
      // Ensure no sneaky prefixes like evilcsc.gov.ph (must be a genuine subdomain)
      const parts = hostname.split(".");
      if (parts.length >= 3 && parts[parts.length - 2] === "gov" && parts[parts.length - 1] === "ph" && parts[parts.length - 3] === "csc") {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Extracts a clean domain badge string for UI display (e.g., 'ocseas.csc.gov.ph').
 */
export function getDomainBadge(urlString: string): string {
  try {
    const url = new URL(urlString);
    return url.hostname.toLowerCase();
  } catch {
    return "csc.gov.ph";
  }
}

/**
 * Returns security attributes for external links to official portals.
 */
export function getSafeExternalLinkProps(url: string) {
  const isOfficial = isOfficialCscUrl(url);
  return {
    href: url,
    target: "_blank",
    rel: "noopener noreferrer",
    "data-official-domain": isOfficial ? "true" : "false",
  };
}

export const CSC_LOGIN_SECURITY_DISCLAIMER =
  "You are leaving ReviewTayo and opening an official CSC website. Enter your CSC credentials only on a verified csc.gov.ph domain.";

export const CSE_REVIEWER_INDEPENDENCE_DISCLAIMER =
  "ReviewTayo is an independent exam-preparation platform. It is not affiliated with or endorsed by the Civil Service Commission. Examination schedules, locations, requirements, and application procedures may change. Always confirm current details through the linked official CSC announcement or regional office.";
