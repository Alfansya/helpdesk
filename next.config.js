const isProd = process.env.NODE_ENV === 'production';

// Next.js menyisipkan skrip inline untuk hidrasi, jadi 'unsafe-inline' dibutuhkan pada script-src.
// Cloudflare Turnstile memuat skrip, XHR, dan iframe dari challenges.cloudflare.com.
// Semua sumber lain dikunci ke domain sendiri. Font Google di-host sendiri saat build (next/font).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ...(isProd
    ? [
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        { key: 'Content-Security-Policy', value: csp },
      ]
    : []),
];

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  serverExternalPackages: ['exceljs'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
