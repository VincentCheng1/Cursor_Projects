import "dotenv/config";

import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Resolved lazily so `prisma validate`/`generate` work without a database
    // configured (CI, fresh clones). Commands that actually connect still fail loudly.
    url: process.env.DATABASE_URL ?? "",
  },
});
