import prisma from "../src/utils/prisma.js";

const rows = await prisma.$queryRaw`
  SELECT a.id,
         a.name,
         COUNT(pa."peakId")::int AS peaks_hit
  FROM   "Activity" a
  LEFT JOIN "PeakOnActivity" pa ON pa."activityId" = a.id
  GROUP  BY a.id
  ORDER  BY peaks_hit DESC
  LIMIT  10;
`;
console.table(rows);
await prisma.$disconnect();