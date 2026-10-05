import { prisma } from '../src/lib/prisma';

async function main() {
  const demoRolls = [
    '210052010001',
    '210052010002',
    '210052010003',
    '210052010004',
    '210052010005',
    '210052010006',
    '210052010007',
    '210052010008',
    '210052010009',
    '210052010010',
  ];

  // Find demo students
  const demoStudents = await prisma.student.findMany({
    where: { rollNumber: { in: demoRolls } },
  });
  const demoIds = demoStudents.map(s => s.id);

  if (demoIds.length > 0) {
    const demoResults = await prisma.result.findMany({
      where: { studentId: { in: demoIds } },
    });
    const demoResultIds = demoResults.map(r => r.id);

    await prisma.subjectResult.deleteMany({ where: { resultId: { in: demoResultIds } } });
    await prisma.validationError.deleteMany({ where: { resultId: { in: demoResultIds } } });
    await prisma.result.deleteMany({ where: { id: { in: demoResultIds } } });
    await prisma.collectionLog.deleteMany({ where: { studentId: { in: demoIds } } });
    await prisma.student.deleteMany({ where: { id: { in: demoIds } } });

    console.log(`✅ Successfully deleted ${demoStudents.length} demo students and their result records.`);
  } else {
    console.log('No demo students found matching 210052010... list.');
  }

  // Also clean up any old demo ResultSessions that have 0 students remaining
  const emptySessions = await prisma.resultSession.findMany({
    where: {
      results: { none: {} },
    },
  });
  for (const es of emptySessions) {
    await prisma.collectionLog.deleteMany({ where: { sessionId: es.id } });
    await prisma.resultSession.delete({ where: { id: es.id } });
  }

  const remaining = await prisma.student.findMany({
    orderBy: { rollNumber: 'asc' },
  });
  console.log(`\nRemaining students in database (${remaining.length}):`);
  remaining.forEach(s =>
    console.log(` - Roll: ${s.rollNumber} | Name: ${s.name} | Course: ${s.course} (${s.semester})`)
  );
}

main()
  .catch(err => {
    console.error('Error deleting demo data:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
