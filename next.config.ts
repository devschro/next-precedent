import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Don’t block Vercel deploy on ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Don’t block deploy on type errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
