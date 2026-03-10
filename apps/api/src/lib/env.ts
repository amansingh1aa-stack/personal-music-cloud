import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

const envCandidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../../.env"),
  path.resolve(process.cwd(), "../.env")
];

for (const candidate of envCandidates) {
  dotenv.config({ path: candidate, override: false });
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  MASTER_PASSWORD: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  MUSIC_LIBRARY_PATH: z.string().default("./music"),
  APP_STORAGE_PATH: z.string().default("./apps/api/storage"),
  LRCLIB_API_BASE: z.string().url().default("https://lrclib.net/api"),
  YTDLP_BINARY_PATH: z.string().optional(),
  YOUTUBE_COOKIES_PATH: z.string().optional()
});

export const env = envSchema.parse(process.env);
export const musicLibraryPath = path.resolve(process.cwd(), env.MUSIC_LIBRARY_PATH);
export const appStoragePath = path.resolve(process.cwd(), env.APP_STORAGE_PATH);
export const coverStoragePath = path.join(appStoragePath, "covers");