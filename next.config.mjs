/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  // SWC binary sorununa karşı Babel fallback
  experimental: {
    forceSwcTransforms: false,
  },
};

export default nextConfig;
