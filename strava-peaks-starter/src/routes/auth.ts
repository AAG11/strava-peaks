import { Router } from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma.js";

const router = Router();

router.get("/login", (_, res) => {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: "http://localhost:4000/auth/callback",
    response_type: "code",
    scope: "read,activity:read_all,profile:read_all"
  });
  res.redirect(`https://www.strava.com/oauth/authorize?${params}`);
});

router.get("/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("No code");

  const { data } = await axios.post("https://www.strava.com/oauth/token", {
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    code,
    grant_type: "authorization_code"
  });

  const { athlete, access_token, refresh_token, expires_at } = data;

  const user = await prisma.user.upsert({
    where: { stravaId: BigInt(athlete.id) },
    update: {
      username: athlete.username,
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiresAt: new Date(expires_at * 1000)
    },
    create: {
      stravaId: BigInt(athlete.id),
      username: athlete.username,
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiresAt: new Date(expires_at * 1000)
    }
  });

  const token = jwt.sign({ uid: user.id, stravaId: athlete.id }, process.env.JWT_SECRET!, { expiresIn: "24h" });
  res.cookie("session", token, { httpOnly: true, sameSite: "lax" });
  res.send("✅ Auth OK — you can close this tab");
});

export default router;
