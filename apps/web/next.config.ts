import type { NextConfig } from 'next';

/** Next.js configuration — minimal for Phase 1A foundation. */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@bowling-machine/ui',
    '@bowling-machine/api-contracts',
    '@bowling-machine/shared',
  ],
};

export default nextConfig;
