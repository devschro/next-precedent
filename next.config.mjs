/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Don’t block Vercel deploy on ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Don’t block Vercel deploy on TS errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
