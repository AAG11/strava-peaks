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
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const auth_1 = __importDefault(require("./routes/auth"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cookie_parser_1.default)());
app.use(auth_1.default);
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
app.get("/me/peaks", (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    // 🔒  TODO: pull userId from the session JWT; for now grab the first user
    const user = yield prisma.user.findFirst();
    if (!user)
        return res.json([]);
    // Postgres query
    const rows = yield prisma.$queryRaw `
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
    const safeRows = rows.map(r => {
        var _a;
        return (Object.assign(Object.assign({}, r), { num_acts: Number((_a = r.num_acts) !== null && _a !== void 0 ? _a : 0), latest_act_id: r.latest_act_id ? r.latest_act_id.toString() : null }));
    });
    res.json(safeRows);
}));
//ascents endpoint
app.get("/me/ascents", (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield prisma.user.findFirst();
    if (!user)
        return res.json([]);
    const rows = yield prisma.$queryRaw `
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
    res.json(rows.map(r => (Object.assign(Object.assign({}, r), { act_id: r.act_id.toString() }))));
}));
app.get("/health", (_, res) => res.send("ok"));
app.use((0, cookie_parser_1.default)());
app.use("/auth", auth_1.default); // mounts /auth/*    // loads .env
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on :${port}`));
