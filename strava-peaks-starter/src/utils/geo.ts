import polyline from "@mapbox/polyline";
import prisma from "./prisma.js";

const DEFAULT_RADIUS = Number(process.env.PEAK_RADIUS_M ?? 150);

function polylineToWkt(encoded: string): string {
  const pts = polyline.decode(encoded);
  const coords = pts.map(([lat, lon]) => \`\${lon} \${lat}\`).join(",");
  return \`LINESTRING(\${coords})\`;
}

export async function matchPeaksForActivity(
  activityId: bigint,
  userId: number,
  radiusM: number = DEFAULT_RADIUS
): Promise<number> {
  const act = await prisma.activity.findUniqueOrThrow({
    where: { id: activityId, userId },
    select: { polyline: true }
  });
  if (!act.polyline) return 0;

  const wkt = polylineToWkt(act.polyline);

  const peaks = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM "Peak"
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
