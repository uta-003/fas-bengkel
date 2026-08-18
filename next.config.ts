import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // For Capacitor static export (Android/iOS)
  output: 'export',
  images: { unoptimized: true },
  basePath: '',
};

export default nextConfig;
