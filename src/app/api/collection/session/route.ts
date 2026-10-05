import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { browserRunnerService } from '@/services/browser-runner.service';
import { StudentLookupInput } from '@/universities/base/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    // Get all distinct student cohorts to populate UI dropdowns
    const allStudentsForCohorts = await prisma.student.findMany({
      select: { course: true, semester: true },
    });
    const cohortMap = new Map<string, number>();
    for (const s of allStudentsForCohorts) {
      const key = `${s.course}___${s.semester}`;
      cohortMap.set(key, (cohortMap.get(key) || 0) + 1);
    }
    const availableCohorts = Array.from(cohortMap.entries()).map(([k, count]) => {
      const [c, sem] = k.split('___');
      return { course: c, semester: sem, count };
    });

    if (!sessionId) {
      // Return latest session or idle state
      const latestSession = await prisma.resultSession.findFirst({
        orderBy: { createdAt: 'desc' },
        include: { university: true },
      });

      const activeRunner = latestSession ? browserRunnerService.getSession(latestSession.id) : null;
      if (activeRunner) {
        await browserRunnerService.getBrowserDiagnostics(activeRunner.sessionId);
      }

      return NextResponse.json({
        success: true,
        session: latestSession,
        runnerStatus: activeRunner,
        availableCohorts,
        totalStudentsCount: allStudentsForCohorts.length,
      });
    }

    const runner = browserRunnerService.getSession(sessionId);
    if (runner) {
      await browserRunnerService.getBrowserDiagnostics(runner.sessionId);
    }
    const session = await prisma.resultSession.findUnique({
      where: { id: sessionId },
      include: {
        university: true,
        collectionLogs: {
          orderBy: { startedAt: 'desc' },
          take: 20,
        },
      },
    });

    return NextResponse.json({
      success: true,
      session,
      runnerStatus: runner,
      availableCohorts,
      totalStudentsCount: allStudentsForCohorts.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { universityCode = 'CCSU', course, semester, marksheetType, academicYear, mode = 'mock', rollNumber } = body;

    const university = await prisma.university.findUnique({
      where: { code: universityCode },
    });

    if (!university) {
      return NextResponse.json({ success: false, error: `University ${universityCode} not found.` }, { status: 404 });
    }

    // Flexible student retrieval
    let allStudents = await prisma.student.findMany({
      orderBy: { rollNumber: 'asc' },
    });

    if (allStudents.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No students found in the database. Please go to the Students page and import or add students first.',
      }, { status: 400 });
    }

    let filtered = allStudents;

    // Filter by single Roll Number if provided (e.g. single-student test)
    if (rollNumber) {
      filtered = filtered.filter(s => s.rollNumber === rollNumber.trim());
    } else {
      // Filter by Course if specified and not 'ALL'
      if (course && course !== 'ALL') {
        const cleanCourse = course.toLowerCase().replace(/[^a-z0-9]/g, '');
        filtered = filtered.filter(s => {
          const sClean = s.course.toLowerCase().replace(/[^a-z0-9]/g, '');
          return sClean.includes(cleanCourse) || cleanCourse.includes(sClean);
        });
      }

      // Filter by Semester if specified and not 'ALL'
      if (semester && semester !== 'ALL') {
        const normSem = (val: string) => {
          const v = val.toUpperCase().trim();
          if (v === 'I' || v === '1' || v.includes('SEM I') || v.includes('SEM 1') || v.includes('SEMESTER I')) return '1';
          if (v === 'II' || v === '2' || v.includes('SEM II') || v.includes('SEM 2') || v.includes('SEMESTER II')) return '2';
          if (v === 'III' || v === '3' || v.includes('SEM III') || v.includes('SEM 3') || v.includes('SEMESTER III')) return '3';
          if (v === 'IV' || v === '4' || v.includes('SEM IV') || v.includes('SEM 4') || v.includes('SEMESTER IV')) return '4';
          if (v === 'V' || v === '5' || v.includes('SEM V') || v.includes('SEM 5') || v.includes('SEMESTER V')) return '5';
          if (v === 'VI' || v === '6' || v.includes('SEM VI') || v.includes('SEM 6') || v.includes('SEMESTER VI')) return '6';
          return v;
        };

        const targetNorm = normSem(semester);
        filtered = filtered.filter(s => {
          return normSem(s.semester) === targetNorm || s.semester.toUpperCase().includes(semester.toUpperCase());
        });
      }
    }

    if (filtered.length === 0) {
      const availableCohorts = [...new Set(allStudents.map(s => `${s.course} (${s.semester})`))].join(', ');
      return NextResponse.json({
        success: false,
        error: `No students match course '${course}' and semester '${semester}'. Available cohorts in database: ${availableCohorts}. Please select one of these or choose 'All Students'.`,
      }, { status: 400 });
    }

    const students = filtered;

    // Create ResultSession in DB
    const sessionName = `${universityCode} ${course || 'All'} Sem ${semester || 'All'} - ${marksheetType} (${academicYear || '2024'})`;
    const targetSessionSem = (semester && semester !== 'ALL') ? String(semester) : null;
    const dbSession = await prisma.resultSession.create({
      data: {
        universityId: university.id,
        name: sessionName,
        course: course ? String(course) : 'B.C.A.',
        semester: semester ? String(semester) : 'II',
        marksheetType: marksheetType || 'NEP',
        academicYear: academicYear || '2023-2024',
        status: 'RUNNING',
        totalStudents: students.length,
        completedCount: 0,
        failedCount: 0,
      },
    });

    const lookupList: StudentLookupInput[] = students.map(s => ({
      rollNumber: s.rollNumber,
      name: s.name,
      enrollmentNumber: s.enrollmentNumber,
      course: s.course,
      semester: targetSessionSem || s.semester || 'II',
      marksheetType: marksheetType || 'NEP',
      academicYear: academicYear || '2023-2024',
    }));

    // Initialize in-memory runner
    browserRunnerService.createSession(dbSession.id, universityCode, lookupList, mode);

    // Prepare first student (pauses for CAPTCHA)
    const runnerStatus = await browserRunnerService.prepareNextStudent(dbSession.id, lookupList);

    // Retrieve live browser session info & diagnostics
    const browserInfo = await browserRunnerService.getBrowserDiagnostics(dbSession.id);

    return NextResponse.json({
      success: true,
      session: dbSession,
      runnerStatus,
      browserStatus: browserInfo.status,
      browserDiagnostics: browserInfo.diagnostics,
      queue: lookupList.map(s => ({
        rollNumber: s.rollNumber,
        name: s.name,
        status: s.rollNumber === runnerStatus.activeRollNumber ? 'WAITING_FOR_CAPTCHA' : 'PENDING',
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
