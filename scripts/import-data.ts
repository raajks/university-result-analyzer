import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// If a target database URL was passed via CLI arg or TARGET_DATABASE_URL env:
const targetDbUrl = process.argv[2] || process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL;

console.log('🔄 Target Database URL:', targetDbUrl ? targetDbUrl.replace(/:[^:@]+@/, ':****@') : 'Default');

const prisma = new PrismaClient({
  datasources: targetDbUrl
    ? {
        db: {
          url: targetDbUrl,
        },
      }
    : undefined,
});

async function importAllData() {
  const backupFile = path.join(process.cwd(), 'prisma', 'data-backup.json');
  if (!fs.existsSync(backupFile)) {
    throw new Error(`Backup file not found at ${backupFile}. Please run "npm run db:export" first.`);
  }

  const data = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
  console.log(`🚀 Starting data import from backup (Exported at ${data.exportedAt})...`);

  // 1. Users
  console.log(`👤 Importing ${data.users?.length || 0} users...`);
  for (const u of data.users || []) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role },
      create: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: new Date(u.createdAt),
      },
    });
  }

  // 2. Universities
  console.log(`🏫 Importing ${data.universities?.length || 0} universities...`);
  for (const uni of data.universities || []) {
    await prisma.university.upsert({
      where: { code: uni.code },
      update: {
        name: uni.name,
        portalUrl: uni.portalUrl,
        adapterKey: uni.adapterKey,
        isActive: uni.isActive,
        configJson: uni.configJson,
      },
      create: {
        id: uni.id,
        code: uni.code,
        name: uni.name,
        portalUrl: uni.portalUrl,
        adapterKey: uni.adapterKey,
        isActive: uni.isActive,
        configJson: uni.configJson,
      },
    });
  }

  // 3. Students
  console.log(`🎓 Importing ${data.students?.length || 0} students...`);
  for (const st of data.students || []) {
    await prisma.student.upsert({
      where: { rollNumber: st.rollNumber },
      update: {
        name: st.name,
        course: st.course,
        semester: st.semester,
        enrollmentNumber: st.enrollmentNumber,
        section: st.section,
        batch: st.batch,
      },
      create: {
        id: st.id,
        rollNumber: st.rollNumber,
        enrollmentNumber: st.enrollmentNumber,
        name: st.name,
        course: st.course,
        semester: st.semester,
        section: st.section,
        batch: st.batch,
      },
    });
  }

  // 4. Result Sessions
  console.log(`📋 Importing ${data.sessions?.length || 0} sessions...`);
  for (const s of data.sessions || []) {
    const existing = await prisma.resultSession.findUnique({ where: { id: s.id } });
    if (!existing) {
      await prisma.resultSession.create({
        data: {
          id: s.id,
          universityId: s.universityId,
          name: s.name,
          course: s.course,
          semester: s.semester,
          marksheetType: s.marksheetType,
          academicYear: s.academicYear,
          status: s.status,
          totalStudents: s.totalStudents,
          completedCount: s.completedCount,
          failedCount: s.failedCount,
          currentRollNo: s.currentRollNo,
          createdAt: new Date(s.createdAt),
        },
      });
    }
  }

  // 5. Results & Subject Marks
  console.log(`📊 Importing ${data.results?.length || 0} results with subjects...`);
  for (const r of data.results || []) {
    const existingResult = await prisma.result.findUnique({ where: { id: r.id } });
    if (!existingResult) {
      const createdResult = await prisma.result.create({
        data: {
          id: r.id,
          studentId: r.studentId,
          universityId: r.universityId,
          sessionId: r.sessionId,
          examType: r.examType,
          semester: r.semester,
          academicYear: r.academicYear,
          resultStatus: r.resultStatus,
          totalMarks: r.totalMarks,
          maxMarks: r.maxMarks,
          percentage: r.percentage,
          sgpa: r.sgpa,
          cgpa: r.cgpa,
          rawResultHash: r.rawResultHash,
          rawDataJson: r.rawDataJson,
          collectedAt: new Date(r.collectedAt),
          validationStatus: r.validationStatus,
          createdAt: new Date(r.createdAt),
        },
      });

      if (r.subjects && r.subjects.length > 0) {
        for (const sub of r.subjects) {
          await prisma.subjectResult.create({
            data: {
              id: sub.id,
              resultId: createdResult.id,
              subjectCode: sub.subjectCode,
              subjectName: sub.subjectName,
              internalMarks: sub.internalMarks,
              externalMarks: sub.externalMarks,
              practicalMarks: sub.practicalMarks,
              totalMarks: sub.totalMarks,
              maxMarks: sub.maxMarks,
              grade: sub.grade,
              gradePoint: sub.gradePoint,
              status: sub.status,
              createdAt: new Date(sub.createdAt),
            },
          });
        }
      }
    }
  }

  console.log('🎉 Data import completed successfully!');
}

importAllData()
  .catch((e) => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
