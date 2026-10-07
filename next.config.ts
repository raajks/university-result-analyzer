import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db",
  },
  serverExternalPackages: ["playwright", "@prisma/client", "prisma"],
};

export default nextConfig;

