import axios from "axios";
import prisma from "../src/utils/prisma";
import { getValidAccessToken } from "../src/utils/strava";

async function importAllActivities() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No user in DB");

  const token = await getValidAccessToken(user.id);
  const perPage = 100;                  // Strava max = 200; we’ll use 100 for headroom
  let page = 1;
  let imported = 0;

  while (true) {
    const { data: acts } = await axios.get(
      `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}&page=${page}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (acts.length === 0) break;       // no more pages

    for (const act of acts) {
      // optional: skip non-hike/run if you want
      if (!["Hike", "Run", "TrailRun", "Walk"].includes(act.type)) continue;

      await prisma.activity.upsert({
        where:  { id: BigInt(act.id) },
        update: {},                     // no update on re-sync; keep original data
        create: {
          id:         BigInt(act.id),
          userId:     user.id,
          name:       act.name,
          distance:   act.distance,
          movingTime: act.moving_time,
          totalElevationGain: act.total_elevation_gain,   // NEW
          startDate:  new Date(act.start_date),
          polyline:   act.map.summary_polyline
        }
      });
      imported++;
    }

    console.log(`Page ${page}: pulled ${acts.length}, kept ${imported}`);

    page++;
    await new Promise(r => setTimeout(r, 1000));   // 1-sec courtesy to Strava
  }

  console.log(`\n✅  Imported / deduped total: ${imported} activities`);
}

importAllActivities()
  .catch(console.error)
  .finally(() => prisma.$disconnect());