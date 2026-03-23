import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { InMemoryStore } from "../store/inMemoryStore.js";

const loginBodySchema = z.object({
  provider: z.enum(["apple", "google", "phone"]),
  providerUserId: z.string().min(1),
  displayName: z.string().min(1),
  email: z.string().email().optional(),
});

export function buildAuthRoutes(store: InMemoryStore): FastifyPluginAsync {
  const routes: FastifyPluginAsync = async (fastify) => {
    fastify.post("/v1/auth/login", async (request, reply) => {
      const body = loginBodySchema.parse(request.body);
      const userId = `${body.provider}:${body.providerUserId}`;

      const currentUser = store.users.get(userId);
      if (!currentUser) {
        store.users.set(userId, {
          id: userId,
          displayName: body.displayName,
          email: body.email,
        });
      } else {
        store.users.set(userId, {
          ...currentUser,
          displayName: body.displayName,
          email: body.email ?? currentUser.email,
        });
      }

      // MVP: returns synthetic token. In production, validate provider token server-side.
      const token = Buffer.from(`${userId}:${Date.now()}`).toString("base64url");
      return reply.send({
        user: store.users.get(userId),
        accessToken: token,
      });
    });
  };

  return routes;
}
