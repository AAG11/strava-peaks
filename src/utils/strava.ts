import axios from "axios";
import prisma from "./prisma";

export async function getValidAccessToken(userId: number): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const expiresAt = user.tokenExpiresAt.getTime();
  const now = Date.now();

  // Give ourselves 60-sec buffer
  if (now < expiresAt - 60_000) {
    return user.accessToken;                         // still fresh
  }

  // --- refresh ---
  const { data } = await axios.post("https://www.strava.com/oauth/token", {
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: user.refreshToken
  });

  await prisma.user.update({
    where:  { id: userId },
    data: {
      accessToken:    data.access_token,
      refreshToken:   data.refresh_token,
      tokenExpiresAt: new Date(data.expires_at * 1000)
    }
  });

  return data.access_token;
}