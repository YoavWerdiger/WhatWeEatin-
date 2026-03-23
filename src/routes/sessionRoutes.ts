import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { SessionService } from "../services/sessionService.js";

const createSessionSchema = z.object({
  hostUserId: z.string().min(1),
  locationLat: z.number().min(-90).max(90),
  locationLng: z.number().min(-180).max(180),
  radiusKm: z.number().min(1).max(25),
  budgetLevel: z.number().int().min(1).max(4),
  timerSeconds: z.number().int().min(30).max(300).optional(),
  cuisinePreferences: z.array(z.string()).max(10).optional(),
});

const joinSessionSchema = z.object({
  userId: z.string().min(1),
});

const voteSchema = z.object({
  userId: z.string().min(1),
  restaurantId: z.string().min(1),
  vote: z.enum(["left_no", "right_want", "up_must", "neutral"]),
});

function toHttpError(message: string): { code: number; message: string } {
  if (message.includes("not found")) {
    return { code: 404, message };
  }
  if (message.includes("not active") || message.includes("not joinable")) {
    return { code: 409, message };
  }
  if (message.includes("not part of this session") || message.includes("not an active candidate")) {
    return { code: 400, message };
  }
  return { code: 500, message };
}

export function buildSessionRoutes(sessionService: SessionService): FastifyPluginAsync {
  const routes: FastifyPluginAsync = async (fastify) => {
    fastify.post("/v1/sessions", async (request, reply) => {
      try {
        const body = createSessionSchema.parse(request.body);
        const session = await sessionService.createSession(body);
        const inviteLink = `whatweeatin://join/${session.id}`;
        return reply.code(201).send({ session, inviteLink });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        const httpError = toHttpError(message);
        return reply.code(httpError.code).send({ error: httpError.message });
      }
    });

    fastify.post("/v1/sessions/:id/join", async (request, reply) => {
      try {
        const params = z.object({ id: z.string().uuid() }).parse(request.params);
        const body = joinSessionSchema.parse(request.body);
        const member = sessionService.joinSession(params.id, body.userId);
        return reply.send({ member });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        const httpError = toHttpError(message);
        return reply.code(httpError.code).send({ error: httpError.message });
      }
    });

    fastify.get("/v1/sessions/:id/state", async (request, reply) => {
      try {
        const params = z.object({ id: z.string().uuid() }).parse(request.params);
        return reply.send(sessionService.getSessionState(params.id));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        const httpError = toHttpError(message);
        return reply.code(httpError.code).send({ error: httpError.message });
      }
    });

    fastify.get("/v1/sessions/:id/candidates", async (request, reply) => {
      try {
        const params = z.object({ id: z.string().uuid() }).parse(request.params);
        const candidates = sessionService.getCandidates(params.id);
        return reply.send({ candidates });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        const httpError = toHttpError(message);
        return reply.code(httpError.code).send({ error: httpError.message });
      }
    });

    fastify.post("/v1/sessions/:id/votes", async (request, reply) => {
      try {
        const params = z.object({ id: z.string().uuid() }).parse(request.params);
        const body = voteSchema.parse(request.body);
        const result = sessionService.castVote(params.id, body);
        return reply.send(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        const httpError = toHttpError(message);
        return reply.code(httpError.code).send({ error: httpError.message });
      }
    });

    fastify.post("/v1/sessions/:id/auto-pick", async (request, reply) => {
      try {
        const params = z.object({ id: z.string().uuid() }).parse(request.params);
        const match = sessionService.autoPick(params.id);
        return reply.send({ match });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        const httpError = toHttpError(message);
        return reply.code(httpError.code).send({ error: httpError.message });
      }
    });

    fastify.get("/v1/sessions/:id/match", async (request, reply) => {
      try {
        const params = z.object({ id: z.string().uuid() }).parse(request.params);
        return reply.send(sessionService.getMatch(params.id));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        const httpError = toHttpError(message);
        return reply.code(httpError.code).send({ error: httpError.message });
      }
    });
  };

  return routes;
}
