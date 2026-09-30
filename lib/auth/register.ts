import { z } from "zod";
import bcrypt from "bcryptjs";

import { getPrisma } from "@/lib/db/client";

export const registerSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(120).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("An account with this email already exists");
    this.name = "EmailAlreadyRegisteredError";
  }
}

export async function registerUser(input: RegisterInput) {
  const email = input.email.trim().toLowerCase();
  const existing = await getPrisma().user.findUnique({ where: { email } });
  if (existing !== null) throw new EmailAlreadyRegisteredError();

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await getPrisma().user.create({
    data: {
      email,
      name: input.name ?? null,
      passwordHash,
    },
    select: { id: true, email: true, name: true },
  });
  return user;
}
