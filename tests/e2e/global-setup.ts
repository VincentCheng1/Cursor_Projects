import { execSync } from "node:child_process";

import { config as loadEnv } from "dotenv";

export default async function globalSetup() {
  loadEnv();
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for Playwright e2e (see .env.example).");
  }
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
  execSync("npx prisma db seed", { stdio: "inherit", env: process.env });
}
