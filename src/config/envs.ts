import "dotenv/config";
import { z } from "zod";

export const envSchema = z
  .object({
    PORT: z.string().default("3000").transform(Number),
    ALLOWED_ORIGINS: z
      .string()
      .min(1, "ALLOWED_ORIGINS is required.")
      .transform((val) => val.split(",").map((origin) => origin.trim())),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
    REDIS_URL: z.string().min(1, "REDIS_URL is required."),
    RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required."),
    RESEND_FROM_EMAIL: z.string().min(1, "RESEND_FROM_EMAIL is required."),
    JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET is required."),
    JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required."),
    GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required."),
    GOOGLE_CLIENT_SECRET: z
      .string()
      .min(1, "GOOGLE_CLIENT_SECRET is required."),
    GOOGLE_CALLBACK_URL: z.string().min(1, "GOOGLE_CALLBACK_URL is required."),
    EXCHANGE_RATE_MAX_AGE_MS: z
      .string()
      .default("300000")
      .transform(Number),
  })
  .passthrough();

const envParsed = envSchema.safeParse(process.env);

if (!envParsed.success) {
  console.error("❌ Config validation error:", envParsed.error.format());
  throw new Error("Invalid environment variables");
}

export const envs = envParsed.data satisfies z.infer<typeof envSchema>;
