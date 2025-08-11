import { Router } from "express";
import axios from "axios";
import prisma from "../utils/prisma";

const router = Router();

// Express v5 typings expect explicit returns in handlers for async functions

// Where the API lives (port 4000 locally)
const API_BASE = process.env.PUBLIC_API_URL || "http://localhost:4000";
// Where the web app lives (port 3000 locally)
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

router.get("/login", (_req, res) => {
  const params = new URLSearchParams({
    client_id: String(process.env.STRAVA_CLIENT_ID || ""),
    redirect_uri: `${API_BASE}/auth/callback`,
    response_type: "code",
    scope: "read,profile:read_all,activity:read_all",
    approval_prompt: "auto",
  });
  res.redirect(`https://www.strava.com/oauth/authorize?${params.toString()}`);
});

router.get("/callback", async (req, res): Promise<void> => {
  const code = req.query.code as string;
  if (!code) { res.status(400).send("Missing code"); return; }

  try {
    const token = await axios.post("https://www.strava.com/oauth/token", {
      grant_type: "authorization_code",
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
    });

    const t = token.data;
    const athleteId = BigInt(t.athlete?.id);

    // Store/refresh tokens for this athlete
    await prisma.user.upsert({
      where: { stravaId: athleteId },
      update: {
        accessToken: t.access_token,
        refreshToken: t.refresh_token,
        tokenExpiresAt: new Date(t.expires_at * 1000),
      } as any,
      create: {
        stravaId: athleteId,
        accessToken: t.access_token,
        refreshToken: t.refresh_token,
        tokenExpiresAt: new Date(t.expires_at * 1000),
      } as any,
    });

    // Optional: kick off a background refresh (don’t block redirect)
    try {
      await axios.post(`${API_BASE}/me/refresh`);
    } catch (e) {
      console.warn("post-auth refresh failed (non-fatal)");
    }

    // Send user back to the React app
    res.redirect(`${FRONTEND_URL}/?connected=1`);
    return;
  } catch (e: any) {
    console.error("OAuth exchange failed:", e?.response?.data || e.message);
    res.redirect(`${FRONTEND_URL}/?error=strava_oauth`);
    return;
  }
});

export default router;