import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";

// Self-hosted via next/font: fonts ship with the build and load with
// `display: swap` + a size-adjusted fallback, so headings stop shifting
// width when the webfont arrives (the exam-target width flicker). The CSS
// helpers in globals.css consume these variables.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "800"],
  variable: "--font-display",
  display: "swap",
});
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});
import { getCanonicalUrl } from "@/lib/env";
import { CookieConsentBanner } from "@/components/privacy/CookieConsentBanner";
import { AdSenseScript } from "@/components/ads/AdSenseScript";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { isValidPublisherId } from "@/lib/ads";
import { getRootOrganizationSchema, getRootWebSiteSchema, getRootRobots } from "@/lib/seo/schema";

const isPreview = process.env.VERCEL_ENV === "preview";
const baseUrl = getCanonicalUrl();
const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

export const metadata: Metadata = {
  metadataBase: new URL(getCanonicalUrl()),
  title: {
    default: "ReviewTayo — Philippine Civil Service Exam Reviewer",
    template: "%s | ReviewTayo",
  },
  robots: getRootRobots(isPreview),
  description:
    "Comprehensive, 100% original Philippine Civil Service Examination (CSE-PPT) preparation platform. Practice Professional & Subprofessional mock tests with real continuous timers, detailed concept rationales, and mistake analytics.",
  authors: [{ name: "ReviewTayo Editorial Team" }],
  creator: "ReviewTayo",
  publisher: "ReviewTayo",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_PH",
    url: baseUrl,
    siteName: "ReviewTayo",
    title: "ReviewTayo — Free Civil Service Exam Mock Tests & Practice",
    description:
      "Pass the Philippine Civil Service Examination with confidence. Full 170-item mock tests, continuous timers, and detailed explanations for Filipino civil service examinees.",
    images: [
      {
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "ReviewTayo — Philippine Civil Service Exam Reviewer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ReviewTayo — Civil Service Exam Reviewer",
    description:
      "Pass the Philippine Civil Service Examination with confidence. Free, 100% original, and syllabus-aligned mock tests.",
    images: [`${baseUrl}/og-image.png`],
  },
  other: isValidPublisherId(adsenseClientId)
    ? {
        "google-adsense-account": adsenseClientId!.trim(),
      }
    : {},
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      getRootOrganizationSchema(),
      getRootWebSiteSchema(),
    ],
  };

  return (
    <html lang="en" suppressHydrationWarning className={`${bricolage.variable} ${figtree.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#faf8f7" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#161315" media="(prefers-color-scheme: dark)" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="dns-prefetch" href="https://pagead2.googlesyndication.com" />
        {/* Google Consent Mode v2 default initialization (ADS-04, ADS-05) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{'ad_storage':'denied','ad_user_data':'denied','ad_personalization':'denied','analytics_storage':'denied','wait_for_update':500});try{var c=localStorage.getItem('csereviewer_cookie_consent');if(c){var p=JSON.parse(c);if(p&&p.hasChosen){gtag('consent','update',{'ad_storage':p.ads?'granted':'denied','ad_user_data':p.ads?'granted':'denied','ad_personalization':p.ads?'granted':'denied','analytics_storage':p.analytics?'granted':'denied'});}}}catch(e){}`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=localStorage.getItem('csereviewph_user_preferences_v1');if(p){var parsed=JSON.parse(p);var t=parsed&&parsed.appearance&&parsed.appearance.theme;var m=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(t==='system'&&m)){document.documentElement.classList.add('dark');}}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-[#f8edef] selection:text-[#86152d] flex flex-col transition-colors duration-150">
        <ThemeProvider>
          <NavigationProgress />
          {children}
          <CookieConsentBanner />
          <AdSenseScript />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
