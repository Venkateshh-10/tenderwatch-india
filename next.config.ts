import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
    "pdfjs-dist",
  ],
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
