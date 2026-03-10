import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import fastifyStatic from "@fastify/static";
import { env, appStoragePath, musicLibraryPath } from "./lib/env.js";
import { prisma } from "./lib/prisma.js";
import { ensureStorage } from "./lib/storage.js";
import { authRoutes } from "./routes/auth.js";
import { importRoutes } from "./routes/import.js";
import { libraryRoutes } from "./routes/library.js";
import { lyricsRoutes } from "./routes/lyrics.js";

const app = Fastify({ logger: true });

async function bootstrap() {
  await ensureStorage();

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET
  });

  await app.register(fastifyStatic, {
    root: musicLibraryPath,
    prefix: "/music/",
    decorateReply: false
  });

  await app.register(fastifyStatic, {
    root: appStoragePath,
    prefix: "/storage/",
    decorateReply: false
  });

  app.get("/health", async () => ({ status: "ok" }));

  await authRoutes(app);
  await libraryRoutes(app);
  await lyricsRoutes(app);
  await importRoutes(app);

  const stop = async () => {
    await prisma.$disconnect();
    await app.close();
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  await app.listen({ host: "0.0.0.0", port: env.API_PORT });
}

bootstrap().catch(async (error) => {
  app.log.error(error);
  await prisma.$disconnect();
  process.exit(1);
});