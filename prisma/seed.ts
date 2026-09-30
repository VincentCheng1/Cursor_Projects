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

  const pokemon = await prisma.game.findUniqueOrThrow({ where: { slug: "pokemon" } });
  const onePiece = await prisma.game.findUniqueOrThrow({ where: { slug: "one-piece" } });

  const baseSet = await prisma.cardSet.upsert({
    where: { gameId_code: { gameId: pokemon.id, code: "base1" } },
    update: {},
    create: {
      gameId: pokemon.id,
      name: "Base Set",
      code: "base1",
      releaseDate: new Date("1999-01-09"),
    },
  });

  const op01 = await prisma.cardSet.upsert({
    where: { gameId_code: { gameId: onePiece.id, code: "OP01" } },
    update: {},
    create: {
      gameId: onePiece.id,
      name: "Romance Dawn",
      code: "OP01",
      releaseDate: new Date("2022-07-08"),
    },
  });

  const charizard = await prisma.card.upsert({
    where: { setId_cardNumber_name: { setId: baseSet.id, cardNumber: "4/102", name: "Charizard" } },
    update: {},
    create: {
      gameId: pokemon.id,
      setId: baseSet.id,
      name: "Charizard",
      cardNumber: "4/102",
      rarity: "Holo Rare",
    },
  });

  await prisma.cardVariant.upsert({
    where: {
      cardId_variantName_printing_language: {
        cardId: charizard.id,
        variantName: "Holo",
        printing: "Unlimited",
        language: "EN",
      },
    },
    update: {},
    create: {
      cardId: charizard.id,
      variantName: "Holo",
      printing: "Unlimited",
      language: "EN",
      isFoil: true,
    },
  });

  await prisma.card.upsert({
    where: { setId_cardNumber_name: { setId: op01.id, cardNumber: "OP01-001", name: "Monkey D. Luffy" } },
    update: {},
    create: {
      gameId: onePiece.id,
      setId: op01.id,
      name: "Monkey D. Luffy",
      cardNumber: "OP01-001",
      rarity: "Leader",
    },
  });

  await pool.end();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
