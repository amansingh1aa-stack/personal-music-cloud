import fs from "node:fs/promises";
import path from "node:path";
import slugify from "slugify";
import { appStoragePath, coverStoragePath, musicLibraryPath } from "./env.js";

export async function ensureStorage() {
  await fs.mkdir(musicLibraryPath, { recursive: true });
  await fs.mkdir(appStoragePath, { recursive: true });
  await fs.mkdir(coverStoragePath, { recursive: true });
}

export function toPublicMusicPath(filePath: string) {
  const relative = path.relative(musicLibraryPath, filePath).replace(/\\/g, "/");
  return `/music/${relative}`;
}

export function toPublicCoverPath(filePath?: string | null) {
  if (!filePath) {
    return null;
  }

  const relative = path.relative(appStoragePath, filePath).replace(/\\/g, "/");
  return `/storage/${relative}`;
}

export function safeSlug(input: string) {
  return slugify(input, { lower: true, strict: true, trim: true }) || "track";
}