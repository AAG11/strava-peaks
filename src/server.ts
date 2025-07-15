import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth";

dotenv.config();

const app = express();
app.use(cookieParser());
app.use(authRouter);

app.get("/health", (_, res) => res.send("ok"));

// ---- bind to Fly's $PORT OR fallback to 4000 ----
const port = Number(process.env.PORT) || 4000;
app.listen(port, "0.0.0.0", () => console.log(`API listening on :${port}`));


/* ------------------------------------------------------------------
   GET /me/peaks
   • returns every summit plus:
        – done:  true / false
        – num_acts:   number of your activities that tagged that peak
        – latest_act_id:  string (safe for JSON)  – newest activity on that peak
   • converts any bigint columns to number / string so JSON.stringify won’t fail
-------------------------------------------------------------------*/
app.get("/me/peaks", async (_, res) => {
    // 🔒  TODO: pull userId from the session JWT; for now grab the first user
    const user = await prisma.user.findFirst();
    if (!user) return res.json([]);
  
    // Postgres query
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
  
    // --- bigint ➜ JSON-safe values ---
    const safeRows = rows.map(r => ({
      ...r,
      num_acts: Number(r.num_acts ?? 0),
      latest_act_id: r.latest_act_id ? r.latest_act_id.toString() : null
    }));
  
    res.json(safeRows);
  });

  //ascents endpoint
  app.get("/me/ascents", async (_, res) => {
    const user = await prisma.user.findFirst();
    if (!user) return res.json([]);
  
    const rows = await prisma.$queryRaw<
      {
        peak: string;
        date: Date;
        moving: number;
        gain: number | null;
        dist: number;
        act_id: bigint;
      }[]
    >`
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
  
    //  BigInt → string for JSON
    res.json(
      rows.map(r => ({
        ...r,
        act_id: r.act_id.toString()
      }))
    );
  });
app.get("/health", (_, res) => res.send("ok"));
app.use(cookieParser());
app.use("/auth", authRouter);       // mounts /auth/*    // loads .env

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on :${port}`));