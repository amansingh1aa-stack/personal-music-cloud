import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../lib/auth.js";
import { YouTubeImporter } from "../lib/youtube-importer.js";

const importSchema = z.object({
  playlistUrl: z.string().url()
});

export async function importRoutes(app: FastifyInstance) {
  const importer = new YouTubeImporter();

  app.post("/import/youtube", { preHandler: authenticate }, async (request) => {
    const { playlistUrl } = importSchema.parse(request.body);
    return importer.importPlaylist(playlistUrl);
  });
}