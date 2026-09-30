import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "../lib/db/generated/client";

async function main() {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    throw new Error("DATABASE_URL is required to seed");
  }

  const pool = new Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  await prisma.game.upsert({
    where: { slug: "pokemon" },
    update: {},
    create: { name: "Pokémon TCG", slug: "pokemon" },
  });

  await prisma.game.upsert({
    where: { slug: "one-piece" },
    update: {},
    create: { name: "One Piece Card Game", slug: "one-piece" },
  });

  await pool.end();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
