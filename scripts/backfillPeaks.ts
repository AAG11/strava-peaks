/** scripts/backfillPeaks.ts
 * Re-evaluates EVERY activity against the current PEAK_RADIUS_M
 * Run with:  npx ts-node-esm scripts/backfillPeaks.ts
 */
import prisma from "../src/utils/prisma";
import { matchPeaksForActivity } from "../src/utils/geo";

(async () => {
  const activities = await prisma.activity.findMany();
  let total = 0;

  for (const a of activities) {
    const added = await matchPeaksForActivity(a.id, a.userId);
    console.log(`${a.name.padEnd(35)} +${added}`);
    total += added;
  }

  console.log(`\n==> Added ${total} peak-activity links.`);
  await prisma.$disconnect();
})();