import type { NextConfig } from 'next';
const config: NextConfig = {
 async headers() {
  return ['/shared/:path*', '/api/shared/:path*', '/api/me/shares'].map(source => ({ source, headers: [
   { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
   { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
   { key: 'Referrer-Policy', value: 'no-referrer' },
  ] }));
 },
};
export default config;
