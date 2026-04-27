import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(process.cwd(), "src")
    };

    return config;
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
