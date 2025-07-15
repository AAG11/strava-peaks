import prisma from "../src/utils/prisma.js";
import { matchPeaksForActivity } from "../src/utils/geo.js";

(async ()=>{
  const acts = await prisma.activity.findMany();
  let total=0;
  for (const a of acts) {
    const n = await matchPeaksForActivity(a.id, a.userId);
    console.log(a.name.padEnd(40), "+", n);
    total+=n;
  }
  console.log("\n==> Added", total,"peak-activity links.");
  await prisma.$disconnect();
})();
