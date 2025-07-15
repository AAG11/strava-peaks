import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const peaks = JSON.parse(readFileSync('./scripts/summits_accurate.json', 'utf8'));

(async () => {
  for (const p of peaks) {
    await prisma.peak.updateMany({
      where: { name: p.name },
      data:  { lat: p.lat, lon: p.lon }
    });
  }
  console.log(`Updated ${peaks.length} peaks`);
  await prisma.$disconnect();
})();