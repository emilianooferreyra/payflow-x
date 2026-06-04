import "dotenv/config";
import { z } from "zod";

export const envSchema = z
  .object({
    PORT: z.string().min(1, "PORT is required.").transform(Number),
    ALLOWED_ORIGINS: z
      .string()
      .min(1, "ALLOWED_ORIGINS is required.")
      .transform((val) => val.split(",").map((origin) => origin.trim())),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
    REDIS_URL: z.string().min(1, "REDIS_URL is required."),
  })
  .passthrough();

type envType = z.infer<typeof envSchema>;

const envParsed = envSchema.safeParse(process.env);

if (!envParsed.success) {
  console.error("❌ Config validation error:", envParsed.error.format());
  throw new Error("Invalid environment variables");
}

export const envs: envType = {
  PORT: envParsed.data.PORT,
  ALLOWED_ORIGINS: envParsed.data.ALLOWED_ORIGINS,
  DATABASE_URL: envParsed.data.DATABASE_URL,
  REDIS_URL: envParsed.data.REDIS_URL,
};
