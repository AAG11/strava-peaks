import polyline from "@mapbox/polyline";
import prisma from "./prisma";
/* ──────────────────────────────────────────────────────────── */
/* 1.  Configurable tolerance (metres)                         */
/*    • default 150 m                                          */
/*    • override per run:  PEAK_RADIUS_M=200 npx ts-node …     */
/* ──────────────────────────────────────────────────────────── */
const DEFAULT_RADIUS = Number(process.env.PEAK_RADIUS_M ?? 150);
/* ──────────────────────────────────────────────────────────── */
/* 2.  Strava-encoded polyline  →  WKT LineString              */
/*    (WKT expects  lon lat  order, so we flip each pair.)     */
/* ──────────────────────────────────────────────────────────── */
function polylineToWkt(encoded) {
    if (!encoded)
        throw new Error("Activity has no polyline");
    const pts = polyline.decode(encoded); // [[lat, lon], …]
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
export async function matchPeaksForActivity(activityId, userId, radiusM = DEFAULT_RADIUS) {
    const act = await prisma.activity.findUniqueOrThrow({
        where: { id: activityId, userId },
        select: { polyline: true }
    });
    if (!act.polyline)
        return 0;
    const wkt = polylineToWkt(act.polyline);
    // PostGIS distance query (geodesic)
    const peaks = await prisma.$queryRaw `
    SELECT id
      FROM "Peak"
     WHERE ST_DWithin(
            ST_SetSRID(ST_MakePoint("lon","lat"),4326)::geography,
            ST_SetSRID(ST_GeomFromText(${wkt}),4326)::geography,
            ${radiusM}
          );
  `;
    for (const p of peaks) {
        await prisma.peakOnActivity.upsert({
            where: { peakId_activityId: { peakId: p.id, activityId } },
            update: {},
            create: { peakId: p.id, activityId }
        });
    }
    return peaks.length;
}
