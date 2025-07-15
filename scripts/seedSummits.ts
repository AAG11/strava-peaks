import { PrismaClient } from "@prisma/client";
import peaks from "./summits.json";

const prisma = new PrismaClient();

async function main() {
  for (const p of peaks) {
    await prisma.peak.upsert({
      where: { name: p.name },
      update: {},
      create: p,
    });
  }
  console.log(`Seeded ${peaks.length} peaks`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());