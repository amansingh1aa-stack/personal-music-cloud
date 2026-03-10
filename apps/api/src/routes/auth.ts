import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../lib/env.js";

const loginSchema = z.object({
  password: z.string().min(1)
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (request, reply) => {
    const { password } = loginSchema.parse(request.body);

    if (password !== env.MASTER_PASSWORD) {
      return reply.code(401).send({ message: "Invalid master password" });
    }

    const token = await reply.jwtSign({ scope: "music-cloud" }, { expiresIn: "30d" });
    return { token };
  });
}