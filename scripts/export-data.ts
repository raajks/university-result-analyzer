import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function exportAllData() {
  console.log('📦 Exporting all local database tables to JSON...');

  const users = await prisma.user.findMany();
  const universities = await prisma.university.findMany();
  const students = await prisma.student.findMany();
  const sessions = await prisma.resultSession.findMany();
  const results = await prisma.result.findMany({
    include: {
      subjects: true,
      validationErrors: true,
    },
  });
  const collectionLogs = await prisma.collectionLog.findMany();

  const dump = {
    exportedAt: new Date().toISOString(),
    counts: {
      users: users.length,
      universities: universities.length,
      students: students.length,
      sessions: sessions.length,
      results: results.length,
      subjects: results.reduce((acc, r) => acc + r.subjects.length, 0),
      collectionLogs: collectionLogs.length,
    },
    users,
    universities,
    students,
    sessions,
    results,
    collectionLogs,
  };

  const outputPath = path.join(process.cwd(), 'prisma', 'data-backup.json');
  fs.writeFileSync(outputPath, JSON.stringify(dump, null, 2), 'utf-8');

  console.log(`✅ Successfully exported to ${outputPath}`);
  console.log('Summary:', dump.counts);
}

exportAllData()
  .catch((e) => {
    console.error('Export failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
