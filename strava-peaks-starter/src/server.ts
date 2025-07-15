import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.js";
import prisma from "./utils/prisma.js";

dotenv.config();

const app = express();
app.use(cookieParser());
app.use(express.json());

app.use("/auth", authRouter);

app.get("/health", (_, res) => res.send("ok"));

app.get("/me/peaks", async (_, res) => {
  const user = await prisma.user.findFirst();
  if (!user) return res.json([]);

  const data = await prisma.$queryRaw`
    SELECT p.*, 
           EXISTS (
             SELECT 1 FROM "PeakOnActivity" pa
             WHERE pa."peakId" = p.id
               AND pa."activityId" IN (SELECT id FROM "Activity" WHERE "userId" = ${user.id})
           ) AS done
    FROM "Peak" p
    ORDER BY p.name;
  `;
  res.json(data);
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on :${port}`));
