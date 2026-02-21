import type { NextConfig } from "next";

// Security headers for all routes
const securityHeaders = [
  {
    // HSTS - enforce HTTPS
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    // Prevent clickjacking
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    // Prevent MIME type sniffing
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Control referrer information
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Disable unnecessary browser features
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    // DNS prefetching for performance
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
];

// Content Security Policy
// Baseline policy for JobRun marketing/waitlist site.
// Tighten connect-src when Supabase or analytics are added.
const cspDirectives = [
  "default-src 'self'",
  // Scripts: self + inline (Next.js requires it)
  process.env.NODE_ENV === "development"
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",
  // Styles: self + inline (Tailwind)
  "style-src 'self' 'unsafe-inline'",
  // Images: self + data URIs + blob URIs + HTTPS sources
  "img-src 'self' data: blob: https:",
  // Fonts: self
  "font-src 'self'",
  // Connections: self only (add Supabase/analytics when integrated)
  "connect-src 'self'",
  // Forms: self
  "form-action 'self'",
  // Frame ancestors: none (prevent embedding)
  "frame-ancestors 'none'",
  // Base URI: self
  "base-uri 'self'",
  // Upgrade insecure requests in production
  ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
          {
            key: "Content-Security-Policy",
            value: cspDirectives.join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
