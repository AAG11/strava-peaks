"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../utils/prisma")); // we’ll add a thin wrapper below
const router = (0, express_1.Router)();
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
router.get("/callback", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { code } = req.query;
    if (!code)
        return res.status(400).send("No code");
    // 1️⃣ exchange the code for tokens
    const { data } = yield axios_1.default.post("https://www.strava.com/oauth/token", {
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
    });
    const { athlete, access_token, refresh_token, expires_at } = data;
    // 2️⃣ upsert in DB
    const user = yield prisma_1.default.user.upsert({
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
    const session = jsonwebtoken_1.default.sign({ uid: user.id, stravaId: athlete.id }, process.env.JWT_SECRET, { expiresIn: "24h" });
    res.cookie("session", session, { httpOnly: true, sameSite: "lax" });
    res.send("✅ Auth OK — we’ll add a real dashboard later");
}));
exports.default = router;
