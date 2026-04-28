import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
  eslint: {
    ignoreDuringBuilds: true
  },
  async rewrites() {
    return [
      {
        source: "/auth/login",
        destination: "/api/auth/login"
      },
      {
        source: "/auth/register",
        destination: "/api/auth/register"
      }
    ];
  }
};

export default nextConfig;
