/** @type {import('next').NextConfig} */

// HTTP security headers applied to every response.
// See: https://nextjs.org/docs/app/api-reference/config/next-config-js/headers
const securityHeaders = [
  // Prevent DNS pre-fetching leaking visited sub-resources
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  // Block this page from being embedded in an iframe (clickjacking protection)
  { key: 'X-Frame-Options', value: 'DENY' },
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Limit referrer information sent to third-party origins
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Permissions Policy — disable unused browser features
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  // Content Security Policy
  // - script-src 'unsafe-eval': required by Next.js / Turbopack in development.
  // - style-src 'unsafe-inline': required by Tailwind CSS (injects <style> tags).
  // - worker-src 'self' blob:: 'self' for the PWA service worker (/sw.js);
  //   blob: because jsPDF may spin up a Blob-URL worker for PDF rendering.
  // - img-src data: blob:: jsPDF embeds images as data URIs; blob: for canvas.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
];

const nextConfig = {
  // Standalone output bundles only the minimal Node.js files needed to run the
  // production server — required for the Docker multi-stage build.
  // The .next/standalone/ directory contains server.js + node_modules subset.
  output: 'standalone',
  async headers() {
    return [
      {
        // Apply to every route
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
