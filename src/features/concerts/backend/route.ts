import type { Hono } from "hono";
import type { AppEnv } from "@/backend/hono/context";
import { getSupabase } from "@/backend/hono/context";
import { respond } from "@/backend/http/response";
import {
  getConcertDetail,
  getConcertList,
  getConcertSeatMap,
} from "./service";

export const registerConcertRoutes = (app: Hono<AppEnv>) => {
  app.get("/api/concerts", async (c) => {
    const supabase = getSupabase(c);
    const result = await getConcertList(supabase, c.req.query());
    return respond(c, result);
  });

  app.get("/api/concerts/:concertId", async (c) => {
    const supabase = getSupabase(c);
    const result = await getConcertDetail(supabase, c.req.param("concertId"));
    return respond(c, result);
  });

  app.get("/api/concerts/:concertId/seats/map", async (c) => {
    const supabase = getSupabase(c);
    const result = await getConcertSeatMap(
      supabase,
      c.req.param("concertId"),
    );
    return respond(c, result);
  });
};
