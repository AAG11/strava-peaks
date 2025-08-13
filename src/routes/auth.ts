import type { Request, Response } from "express";
import { Router } from "express";
import axios from "axios";
import prisma from "../utils/prisma";

const router = Router();

// Kick off Strava OAuth
router.get("/login", (_req: Request, res: Response): void => {
  const client_id = process.env.STRAVA_CLIENT_ID!;
  const base = process.env.PUBLIC_API_URL || "http://localhost:4000";
  const redirect_uri = base.replace(/\/$/, "") + "/auth/callback";

  const url = new URL("https://www.strava.com/oauth/authorize");
  url.searchParams.set("client_id", client_id);
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

    const token = await axios.post("https://www.strava.com/oauth/token", {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    });

    const { athlete, access_token, refresh_token, expires_at } = token.data;
    const stravaId: number | undefined = athlete?.id;
    if (!stravaId) { res.status(400).send("No athlete"); return; }

    // Manual upsert (avoid unique constraint requirement on stravaAthleteId)
    const existing = await prisma.user.findFirst({ where: { stravaAthleteId: stravaId } });

    const data = {
      name: athlete?.firstname
        ? `${athlete.firstname} ${athlete.lastname ?? ""}`.trim()
        : "Strava user",
      stravaAthleteId: stravaId,
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiresAt: new Date((expires_at as number) * 1000),
    } as any;

    const user = existing
      ? await prisma.user.update({ where: { id: existing.id }, data })
      : await prisma.user.create({ data });

    // Cross-site cookie for Vercel → SameSite=None + Secure
    res.cookie("uid", String(user.id), {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    const dest = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(dest);
  } catch (e: any) {
    console.error("/auth/callback failed:", e?.response?.data || e?.message || e);
    res.status(500).send("Auth failed");
  }
});

// Log out (clears cookie)
router.post("/logout", (_req: Request, res: Response): void => {
  res.clearCookie("uid", { sameSite: "none", secure: true });
  res.json({ ok: true });
});

export default router;