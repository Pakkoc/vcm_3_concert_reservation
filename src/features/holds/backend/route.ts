import type { Hono } from "hono";
import type { AppEnv } from "@/backend/hono/context";
import { getSupabase } from "@/backend/hono/context";
import { respond } from "@/backend/http/response";
import {
  createSeatHold,
  releaseSeatHold,
  verifySeatAvailability,
} from "./service";

export const registerHoldRoutes = (app: Hono<AppEnv>) => {
  app.post("/api/holds", async (c) => {
    const supabase = getSupabase(c);
    const payload = await c.req.json();
    const result = await createSeatHold(supabase, payload);
    return respond(c, result);
  });

  app.delete("/api/holds/:holdToken", async (c) => {
    const supabase = getSupabase(c);
    const result = await releaseSeatHold(supabase, {
      holdToken: c.req.param("holdToken"),
    });
    return respond(c, result);
  });

  app.post("/api/holds/verify", async (c) => {
    const supabase = getSupabase(c);
    const payload = await c.req.json();
    const result = await verifySeatAvailability(supabase, payload);
    return respond(c, result);
  });
};
