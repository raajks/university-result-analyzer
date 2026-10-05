import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Purging fake result data for 250302002002 and stale sessions...');
  
  const student = await prisma.student.findUnique({
    where: { rollNumber: '250302002002' },
  });

  if (student) {
    const results = await prisma.result.findMany({
      where: { studentId: student.id },
    });
    const resultIds = results.map(r => r.id);

    await prisma.subjectResult.deleteMany({ where: { resultId: { in: resultIds } } });
    await prisma.validationError.deleteMany({ where: { resultId: { in: resultIds } } });
    await prisma.result.deleteMany({ where: { id: { in: resultIds } } });
    await prisma.collectionLog.deleteMany({ where: { rollNumber: '250302002002' } });

    console.log(`✅ Deleted ${results.length} fake result records for student ${student.name} (${student.rollNumber})`);
  }

  // Also clean up any active sessions counter
  await prisma.resultSession.updateMany({
    data: {
      status: 'IDLE',
      completedCount: 0,
      failedCount: 0,
    },
  });

  console.log('✅ Cleanup complete. Database is clean for real extraction testing.');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
