import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // Keep the Prisma engine out of the client bundle.
  serverExternalPackages: ["@prisma/client", "pg"],
};

export default nextConfig;
