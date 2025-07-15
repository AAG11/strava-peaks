import express from "express";
import dotenv from "dotenv";

import cookieParser from "cookie-parser";
import authRouter from "./routes/auth";

app.use(cookieParser());
dotenv.config();              // loads .env

const app = express();

app.get("/health", (_, res) => res.send("ok"));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on :${port}`));