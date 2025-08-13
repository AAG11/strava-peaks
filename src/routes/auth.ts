import type { Request, Response } from "express";
import { Router } from "express";
import axios from "axios";
import prisma from "../utils/prisma";

const router = Router();

// Kick off Strava OAuth
router.get("/login", (_req: Request, res: Response): void => {
  const base =
    process.env.PUBLIC_API_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://strava-peaks-api.fly.dev"
      : "http://localhost:4000");
  const redirect_uri = base.replace(/\/$/, "") + "/auth/callback";

  const url = new URL("https://www.strava.com/oauth/authorize");
  url.searchParams.set("client_id", process.env.STRAVA_CLIENT_ID!);
  url.searchParams.set("redirect_uri", redirect_uri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("approval_prompt", "auto");
  url.searchParams.set("scope", "read,profile:read_all,activity:read_all");

  res.redirect(url.toString());
});

// Strava redirects here with ?code=...
router.get("/callback", async (req: Request, res: Response): Promise<void> => {
  try {
    const code = req.query.code as string | undefined;
    if (!code) { res.status(400).send("Missing code"); return; }

    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      console.error("Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET");
      res.status(500).send("Server misconfigured");
      return;
    }

    const body = new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      code,
      grant_type: "authorization_code",
    });
    const token = await axios.post(
      "https://www.strava.com/oauth/token",
      body.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 15000,
      }
    );

    const { access_token, refresh_token, expires_at } = token.data;

    // Strava includes the athlete object in the token exchange
    const athleteIdNum: number | undefined = token.data?.athlete?.id;

    // Try to locate an existing user by cookie first, then by Strava athlete id
    const rawUid = req.cookies?.uid;
    const uid = rawUid ? Number(rawUid) : NaN;

    let existing = Number.isFinite(uid)
      ? await prisma.user.findUnique({ where: { id: uid } })
      : null;

    if (!existing && athleteIdNum) {
      try {
        existing = await prisma.user.findUnique({
          where: { stravaId: BigInt(athleteIdNum) },
        });
      } catch (_) {
        // ignore; fallback to create below
      }
    }

    // Fields that always update on login/refresh
    const data: any = {
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiresAt: new Date((expires_at as number) * 1000),
    };

    let user;
    if (existing) {
      user = await prisma.user.update({ where: { id: existing.id }, data });
    } else {
      if (!athleteIdNum) {
        console.error("Missing athlete.id in Strava token response");
        res.status(500).send("Auth failed");
        return;
      }
      user = await prisma.user.create({
        data: {
          ...data,
          // Prisma BigInt expects a JS BigInt
          stravaId: BigInt(athleteIdNum),
        },
      });
    }

    res.cookie("uid", String(user.id), {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    const dest = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(dest);
  } catch (e: any) {
    const detail = e?.response?.data || e?.message || e;
    console.error("/auth/callback failed:", detail);
    res.status(500).send("Auth failed");
  }
});

// Log out (clears cookie)
router.post("/logout", (_req: Request, res: Response): void => {
  res.clearCookie("uid", { sameSite: "none", secure: true });
  res.json({ ok: true });
});

export default router;