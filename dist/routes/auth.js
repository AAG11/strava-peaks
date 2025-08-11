import { Router } from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma"; // we’ll add a thin wrapper below
const router = Router();
/**
 *  GET /auth/login  – redirect user to Strava consent screen
 */
router.get("/login", (_, res) => {
    const params = new URLSearchParams({
        client_id: process.env.STRAVA_CLIENT_ID,
        redirect_uri: "http://localhost:4000/auth/callback",
        response_type: "code",
        scope: "read,activity:read_all,profile:read_all",
    });
    res.redirect(`https://www.strava.com/oauth/authorize?${params.toString()}`);
});
/**
 *  GET /auth/callback  – Strava redirects here with ?code=xyz
 */
router.get("/callback", async (req, res) => {
    const { code } = req.query;
    if (!code)
        return res.status(400).send("No code");
    // 1️⃣ exchange the code for tokens
    const { data } = await axios.post("https://www.strava.com/oauth/token", {
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
    });
    const { athlete, access_token, refresh_token, expires_at } = data;
    // 2️⃣ upsert in DB
    const user = await prisma.user.upsert({
        where: { stravaId: athlete.id },
        update: {
            username: athlete.username,
            accessToken: access_token,
            refreshToken: refresh_token,
            tokenExpiresAt: new Date(expires_at * 1000),
        },
        create: {
            stravaId: athlete.id,
            username: athlete.username,
            accessToken: access_token,
            refreshToken: refresh_token,
            tokenExpiresAt: new Date(expires_at * 1000),
        },
    });
    // 3️⃣ issue your own session JWT (24 h)
    const session = jwt.sign({ uid: user.id, stravaId: athlete.id }, process.env.JWT_SECRET, { expiresIn: "24h" });
    res.cookie("session", session, { httpOnly: true, sameSite: "lax" });
    res.send("✅ Auth OK — we’ll add a real dashboard later");
});
export default router;
