import { z } from "zod";

import { MOVER_PERIODS } from "./movers";

export const moversQuerySchema = z.object({
  period: z.enum(MOVER_PERIODS).default("daily"),
});
