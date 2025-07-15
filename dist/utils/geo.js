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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchPeaksForActivity = matchPeaksForActivity;
const polyline_1 = __importDefault(require("@mapbox/polyline"));
const prisma_1 = __importDefault(require("./prisma"));
/* ──────────────────────────────────────────────────────────── */
/* 1.  Configurable tolerance (metres)                         */
/*    • default 150 m                                          */
/*    • override per run:  PEAK_RADIUS_M=200 npx ts-node …     */
/* ──────────────────────────────────────────────────────────── */
const DEFAULT_RADIUS = Number((_a = process.env.PEAK_RADIUS_M) !== null && _a !== void 0 ? _a : 150);
/* ──────────────────────────────────────────────────────────── */
/* 2.  Strava-encoded polyline  →  WKT LineString              */
/*    (WKT expects  lon lat  order, so we flip each pair.)     */
/* ──────────────────────────────────────────────────────────── */
function polylineToWkt(encoded) {
    if (!encoded)
        throw new Error("Activity has no polyline");
    const pts = polyline_1.default.decode(encoded); // [[lat, lon], …]
    const wktCoords = pts.map(([lat, lon]) => `${lon} ${lat}`).join(",");
    return `LINESTRING(${wktCoords})`;
}
/* ──────────────────────────────────────────────────────────── */
/* 3.  Match & upsert peaks for ONE activity                   */
/*                                                             */
/* • Pull the activity’s polyline from DB                      */
/* • Ask PostGIS for every summit within `radiusM` metres      */
/* • Write links into PeakOnActivity (id-pair primary key)     */
/* • Return # peaks linked                                     */
/* ──────────────────────────────────────────────────────────── */
function matchPeaksForActivity(activityId_1, userId_1) {
    return __awaiter(this, arguments, void 0, function* (activityId, userId, radiusM = DEFAULT_RADIUS) {
        const act = yield prisma_1.default.activity.findUniqueOrThrow({
            where: { id: activityId, userId },
            select: { polyline: true }
        });
        if (!act.polyline)
            return 0;
        const wkt = polylineToWkt(act.polyline);
        // PostGIS distance query (geodesic)
        const peaks = yield prisma_1.default.$queryRaw `
    SELECT id
      FROM "Peak"
     WHERE ST_DWithin(
            ST_SetSRID(ST_MakePoint("lon","lat"),4326)::geography,
            ST_SetSRID(ST_GeomFromText(${wkt}),4326)::geography,
            ${radiusM}
          );
  `;
        for (const p of peaks) {
            yield prisma_1.default.peakOnActivity.upsert({
                where: { peakId_activityId: { peakId: p.id, activityId } },
                update: {},
                create: { peakId: p.id, activityId }
            });
        }
        return peaks.length;
    });
}
