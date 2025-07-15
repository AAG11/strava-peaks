import axios from "axios";
import prisma from "../src/utils/prisma.js";
import { getValidAccessToken } from "../src/utils/strava.js";

async function importAll() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No user in DB");
  const token = await getValidAccessToken(user.id);
  let page = 1, imported = 0;
  while (true) {
    const { data: acts } = await axios.get(
      \`https://www.strava.com/api/v3/athlete/activities?per_page=100&page=\${page}\`,
      { headers: { Authorization: \`Bearer \${token}\` } }
    );
    if (acts.length === 0) break;
    for (const act of acts) {
      if (!["Hike","Run","TrailRun","Walk"].includes(act.type)) continue;
      await prisma.activity.upsert({
        where: { id: BigInt(act.id) },
        update: {},
        create: {
          id: BigInt(act.id),
          userId: user.id,
          name: act.name,
          distance: act.distance,
          movingTime: act.moving_time,
          startDate: new Date(act.start_date),
          polyline: act.map.summary_polyline
        }
      });
      imported++;
    }
    console.log(\`page \${page} imported, total \${imported}\`);
    page++;
    await new Promise(r=>setTimeout(r,1000));
  }
  console.log("done");
}

importAll().then(()=>prisma.$disconnect());
