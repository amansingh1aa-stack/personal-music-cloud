import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../lib/auth.js";
import { findLyricsMatch, persistLyrics } from "../lib/lyrics.js";

const querySchema = z.object({
  artist: z.string().min(1),
  title: z.string().min(1)
});

const saveSchema = z.object({
  trackId: z.string(),
  lyrics: z.string().min(1),
  source: z.string().optional()
});

export async function lyricsRoutes(app: FastifyInstance) {
  app.get("/lyrics/match", { preHandler: authenticate }, async (request) => {
    const { artist, title } = querySchema.parse(request.query);
    return findLyricsMatch(artist, title);
  });

  app.post("/lyrics/save", { preHandler: authenticate }, async (request) => {
    const { trackId, lyrics, source } = saveSchema.parse(request.body);
    const track = await persistLyrics(trackId, lyrics, source);
    return { track };
  });
}