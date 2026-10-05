import { prisma } from '../src/lib/prisma';

async function main() {
  const logs = await prisma.collectionLog.findMany({
    orderBy: { startedAt: 'desc' },
    take: 20,
  });

  console.log(`=== RECENT COLLECTION LOGS (${logs.length}) ===`);
  logs.forEach(l => {
    console.log(`[${l.startedAt.toISOString()}] Roll: ${l.rollNumber} | Status: ${l.status} | Msg: ${l.message}`);
  });
}

main().finally(() => prisma.$disconnect());
