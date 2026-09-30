import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Keep the Prisma engine out of the client bundle.
  serverExternalPackages: ["@prisma/client", "pg"],
};

export default nextConfig;
