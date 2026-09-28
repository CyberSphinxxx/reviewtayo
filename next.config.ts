import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://pagead2.googlesyndication.com https://*.googlesyndication.com https://tpc.googlesyndication.com https://adservice.google.com https://www.googletagservices.com https://fundingchoicesmessages.google.com https://*.google.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: https://pagead2.googlesyndication.com https://*.googlesyndication.com https://fundingchoicesmessages.google.com https://*.google.com",
      "frame-src 'self' https://googleads.g.doubleclick.net https://*.googlesyndication.com https://tpc.googlesyndication.com https://fundingchoicesmessages.google.com https://*.google.com",
      "frame-ancestors 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "reviewtayo.online",
          },
        ],
        destination: "https://www.reviewtayo.online/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        // Apply security headers across all routes
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Cache static icons and manifest with 1-day freshness and 7-day stale revalidation
        source: "/(icon-192.png|icon-512.png|icon.svg|manifest.webmanifest|robots.txt|sitemap.xml)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        // Service worker script should never be cached long-term to ensure immediate updates
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
