import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth";
import prisma from "./utils/prisma";        // import your Prisma client
import cors from "cors";
import axios from "axios";
import { matchPeaksForActivity } from "./utils/geo";

dotenv.config();

const app = express();

const allowed = [process.env.FRONTEND_URL, "http://localhost:3000"].filter(Boolean) as string[];

app.use(cors({
  origin(origin, cb) {
    // Allow server-to-server (no Origin) and any whitelisted origin
    if (!origin) return cb(null, true);
    cb(null, allowed.includes(origin));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.options("*", cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    cb(null, allowed.includes(origin));
  },
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.use(cookieParser());
app.use("/auth", authRouter);

// Health check endpoint
app.get("/health", (_req, res) => { res.send("ok"); });

/*
  GET /me/peaks
  Returns each summit plus:
    • done: whether you've climbed it
    • num_acts: number of your activities on that peak
    • latest_act_id: newest activity ID (as string) on that peak
*/
app.get("/me/peaks", async (_req, res) => {
  const user = await prisma.user.findFirst();
  if (!user) { res.json([]); return; }

  const rows = await prisma.$queryRaw<{
    id: number;
    name: string;
    lat: number;
    lon: number;
    elevation: number;
    num_acts: bigint | null;
    latest_act_id: bigint | null;
    done: boolean;
  }[]>`
    SELECT
      p.id,
      p.name,
      p.lat,
      p.lon,
      p.elevation,
      COUNT(a.id)  AS num_acts,
      MAX(a.id)    AS latest_act_id,
      CASE WHEN COUNT(a.id) > 0 THEN true ELSE false END AS done
    FROM "Peak" p
    LEFT JOIN "PeakOnActivity" pa ON pa."peakId" = p.id
    LEFT JOIN "Activity" a
           ON a.id = pa."activityId"
          AND a."userId" = ${user.id}
    GROUP BY p.id
    ORDER BY p.name;
  `;

  res.json(
    rows.map(r => ({
      ...r,
      num_acts: Number(r.num_acts ?? 0),
      latest_act_id: r.latest_act_id ? r.latest_act_id.toString() : null,
    }))
  );
});

// GET /me/ascents: list all climbs by date and peak
app.get("/me/ascents", async (_req, res) => {
  const user = await prisma.user.findFirst();
  if (!user) { res.json([]); return; }

  const rows = await prisma.$queryRaw<{
    peak: string;
    date: Date;
    moving: number;
    gain: number | null;
    dist: number;
    act_id: bigint;
  }[]>`
    SELECT
      p.name                     AS peak,
      a."startDate"              AS date,
      a."movingTime"             AS moving,
      a."totalElevationGain"     AS gain,
      a.distance                 AS dist,
      a.id                       AS act_id
    FROM "PeakOnActivity" pa
    JOIN "Peak"      p ON p.id = pa."peakId"
    JOIN "Activity"  a ON a.id = pa."activityId"
    WHERE a."userId" = ${user.id}
    ORDER BY a."startDate" DESC, p.name;
  `;

  res.json(rows.map(r => ({ ...r, act_id: r.act_id.toString() })));
});

// POST /me/refresh  → pulls only-new Strava activities and rematches peaks
app.post("/me/refresh", async (_req, res) => {
  const user = await prisma.user.findFirst();
  if (!user) { res.status(401).json({ ok: false, error: "no-user" }); return; }

  // ---- 1) get a valid access token (refresh if needed) ----
  async function getToken() {
    let access = (user as any).accessToken;
    let refresh = (user as any).refreshToken;
    const expDate: Date | undefined = (user as any).tokenExpiresAt;
    const exp = expDate ? Math.floor(new Date(expDate).getTime() / 1000) : 0;
  
    // No refresh token stored → user needs to connect Strava
    if (!refresh) {
      return { ok: false as const, reason: "connect" };
    }
  
    // If we still have a valid access token, use it
    if (access && Date.now() / 1000 <= exp - 60) {
      return { ok: true as const, access };
    }
  
    // Otherwise refresh it
    try {
      const r = await axios.post("https://www.strava.com/oauth/token", {
        grant_type: "refresh_token",
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: refresh,
      });
  
      access = r.data.access_token;
      refresh = r.data.refresh_token;
  
      // persist back to DB if your schema has these fields
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            accessToken: access,
            refreshToken: refresh,
            tokenExpiresAt: new Date(r.data.expires_at * 1000),
          } as any,
        });
      } catch {}
  
      return { ok: true as const, access };
    } catch (e: any) {
      const status = e?.response?.status;
      const body = e?.response?.data;
      const msg = typeof body === "string" ? body : JSON.stringify(body);
  
      // Most common: invalid/expired refresh token → ask user to login again
      const looksInvalid =
        status === 400 &&
        (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("grant"));
  
      if (looksInvalid) {
        return { ok: false as const, reason: "connect" };
      }
  
      console.error("Strava token refresh failed:", body || e?.message);
      return { ok: false as const, reason: "refresh-failed", detail: body || e?.message };
    }
  }

  const tok = await getToken();
  if (!tok.ok) {
    if (tok.reason === "connect") {
      res.status(428).json({
        ok: false,
        error: "connect-strava",
        login: `${process.env.PUBLIC_API_URL || "http://localhost:4000"}/auth/login`,
      });
      return;
    }
    res.status(400).json({ ok: false, error: "refresh-failed" });
    return;
  }
  
  const token = tok.access; // safe to use

  // ---- 2) decide how far back to fetch ----
  const latest = await prisma.activity.findFirst({
    where: { userId: user.id },
    orderBy: { startDate: "desc" },
    select: { startDate: true },
  });
  // fetch from the last known startDate minus 1 day (safety); 0 for full backfill
  const sinceEpoch =
    latest?.startDate ? Math.floor(latest.startDate.getTime() / 1000) - 86400 : 0;

  const base = "https://www.strava.com/api/v3";
  let page = 1;
  let added = 0;
  let updated = 0;
  let matched = 0;
  const allowed = new Set(["Run", "TrailRun", "Hike", "Walk"]); // filter client-side

  // ---- 3) page through only-new activities ----
  while (true) {
    const { data: acts } = await axios.get(
      `${base}/athlete/activities?after=${Math.max(sinceEpoch, 0)}&per_page=100&page=${page}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!acts.length) break;

    for (const a of acts) {
      const sport = a.sport_type || a.type;
      if (!allowed.has(sport)) continue;
      if (!a.map?.summary_polyline) continue;

      // ensure we have gain; call detail only if missing
      let totalGain = a.total_elevation_gain ?? a.totalElevationGain;
      if (totalGain == null) {
        const d = await axios.get(`${base}/activities/${a.id}`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { include_all_efforts: false },
        });
        totalGain = d.data.total_elevation_gain ?? 0;
      }

      // upsert
      await prisma.activity.upsert({
        where: { id: BigInt(a.id) },
        update: {
          name: a.name,
          distance: a.distance,
          movingTime: a.moving_time,
          totalElevationGain: totalGain,
          startDate: new Date(a.start_date),
          polyline: a.map.summary_polyline,
        },
        create: {
          id: BigInt(a.id),
          userId: user.id,
          name: a.name,
          distance: a.distance,
          movingTime: a.moving_time,
          totalElevationGain: totalGain,
          startDate: new Date(a.start_date),
          polyline: a.map.summary_polyline,
        },
      });

      const addCount = await matchPeaksForActivity(BigInt(a.id), user.id);
      matched += addCount;
      added++;
    }

    page += 1;
  }

  res.json({ ok: true, added, matched, sinceEpoch });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, "0.0.0.0", () => {
  console.log(`API listening on :${port}`);
});