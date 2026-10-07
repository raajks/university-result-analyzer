import { prisma } from './prisma';
import fs from 'fs';
import path from 'path';

let seedAttempted = false;

/**
 * Automatically seeds initial data if the target database (e.g. online deployment) has 0 records.
 * Uses prisma/data-backup.json as the source of truth.
 */
export async function ensureDataSeeded() {
  if (seedAttempted) return;
  seedAttempted = true;

  try {
    const studentCount = await prisma.student.count().catch(() => -1);
    if (studentCount > 0 || studentCount === -1) {
      return; // Database already has records, or database is unavailable
    }

    const backupFile = path.join(process.cwd(), 'prisma', 'data-backup.json');
    if (!fs.existsSync(backupFile)) {
      return;
    }

    const data = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
    console.log('[AUTO-SEED] Fresh database detected. Synchronizing initial dataset from backup...');

    // 1. Users
    for (const u of data.users || []) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
        },
      }).catch(() => {});
    }

    // 2. Universities
    for (const uni of data.universities || []) {
      await prisma.university.upsert({
        where: { code: uni.code },
        update: {},
        create: {
          id: uni.id,
          code: uni.code,
          name: uni.name,
          portalUrl: uni.portalUrl,
          adapterKey: uni.adapterKey,
          isActive: uni.isActive,
          configJson: uni.configJson,
        },
      }).catch(() => {});
    }

    // 3. Students
    for (const st of data.students || []) {
      await prisma.student.upsert({
        where: { rollNumber: st.rollNumber },
        update: {},
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
      }).catch(() => {});
    }

    // 4. Sessions
    for (const s of data.sessions || []) {
      const exists = await prisma.resultSession.findUnique({ where: { id: s.id } }).catch(() => null);
      if (!exists) {
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
          },
        }).catch(() => {});
      }
    }

    // 5. Results & Subjects
    for (const r of data.results || []) {
      const exists = await prisma.result.findUnique({ where: { id: r.id } }).catch(() => null);
      if (!exists) {
        const created = await prisma.result.create({
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
          },
        }).catch(() => null);

        if (created && r.subjects) {
          for (const sub of r.subjects) {
            await prisma.subjectResult.create({
              data: {
                id: sub.id,
                resultId: created.id,
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
              },
            }).catch(() => {});
          }
        }
      }
    }

    console.log('[AUTO-SEED] Successfully synchronized initial data to online database.');
  } catch (err: any) {
    console.warn('[AUTO-SEED] Notice during auto-seed:', err?.message);
  }
}
