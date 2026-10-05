import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { browserRunnerService } from '@/services/browser-runner.service';
import { CollegeFormatExporter } from '@/lib/college-format-exporter';
import { normalizeSemesterToNumber, toRomanSemester } from '@/universities/base/semester-helper';

export async function POST(req: NextRequest) {
  let currentSessionId: string | undefined;
  try {
    const body = await req.json();
    const { sessionId, action, rawHtmlOverride, overrideResult } = body;
    currentSessionId = sessionId;

    const session = await prisma.resultSession.findUnique({
      where: { id: sessionId },
      include: { university: true },
    });

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found.' }, { status: 404 });
    }

    const runner = browserRunnerService.getSession(sessionId);
    if (!runner) {
      return NextResponse.json({ success: false, error: 'Active runner not found for this session.' }, { status: 400 });
    }

    // 1. STOP SESSION
    if (action === 'STOP') {
      const stopped = browserRunnerService.stopSession(sessionId);
      await prisma.resultSession.update({
        where: { id: sessionId },
        data: { status: 'STOPPED' },
      });
      return NextResponse.json({ success: true, runnerStatus: stopped });
    }

    // 2. SKIP STUDENT
    if (action === 'SKIP') {
      if (!runner.activeRollNumber) {
        return NextResponse.json({ success: false, error: 'No active student to skip.' }, { status: 400 });
      }

      const currentRoll = runner.activeRollNumber;
      browserRunnerService.skipStudent(sessionId, currentRoll);

      await prisma.collectionLog.create({
        data: {
          sessionId,
          rollNumber: currentRoll,
          status: 'SKIPPED',
          message: 'Student lookup skipped by operator.',
        },
      });

      const nextStatus = await browserRunnerService.prepareNextStudent(sessionId);
      return NextResponse.json({ success: true, runnerStatus: nextStatus });
    }

    // 3. DISCARD PREVIEW RESULT
    if (action === 'DISCARD') {
      const currentRoll = runner.activeRollNumber || 'UNKNOWN';
      browserRunnerService.advanceStudent(sessionId, {
        rollNumber: currentRoll,
        status: 'DISCARDED',
        message: 'Marksheet extraction discarded by operator.',
      });

      await prisma.collectionLog.create({
        data: {
          sessionId,
          rollNumber: currentRoll,
          status: 'SKIPPED',
          message: 'Result discarded by operator.',
        },
      });

      const nextStatus = await browserRunnerService.prepareNextStudent(sessionId);
      return NextResponse.json({ success: true, runnerStatus: nextStatus });
    }

    // 4. SUBMIT CAPTCHA & EXTRACT PREVIEW (Without auto-saving yet)
    if (action === 'SUBMIT_CAPTCHA' || action === 'EXTRACT_PREVIEW') {
      if (!runner.currentStudent) {
        return NextResponse.json({ success: false, error: 'No active student in queue.' }, { status: 400 });
      }

      const activeStudent = runner.currentStudent;

      // Execute extraction & 10-point validation
      const { extracted, validation, stepLogs, debugJson } = await browserRunnerService.submitCaptchaAndExtract(
        sessionId,
        activeStudent,
        rawHtmlOverride
      );

      // Record step logs to database
      const dbStudent = await prisma.student.findUnique({
        where: { rollNumber: activeStudent.rollNumber },
      });

      if (stepLogs && stepLogs.length > 0 && dbStudent) {
        for (const logItem of stepLogs) {
          await prisma.collectionLog.create({
            data: {
              sessionId,
              studentId: dbStudent.id,
              rollNumber: activeStudent.rollNumber,
              status: logItem.step,
              message: logItem.message,
              startedAt: logItem.timestamp,
              completedAt: logItem.timestamp,
            },
          });
        }
      }

      return NextResponse.json({
        success: true,
        previewOnly: true,
        state: 'ROLL_VERIFIED',
        code: 'ROLL_VERIFIED',
        extracted,
        validation,
        debugJson,
        runnerStatus: browserRunnerService.getSession(sessionId),
      });
    }

    // 5. CONFIRM & SAVE (Operator approved extracted real result)
    if (action === 'CONFIRM_SAVE') {
      const pending = runner.pendingVerificationResult?.extracted || overrideResult;
      const validation = runner.pendingVerificationResult?.validation || { isValid: true, status: 'VALID', errors: [], warnings: [] };

      if (!pending) {
        return NextResponse.json({ success: false, error: 'No extracted marksheet pending confirmation.' }, { status: 400 });
      }

      // Security Check: No unverified result can reach database
      if (pending.verificationStatus !== 'VERIFIED' || pending.collectionState !== 'ROLL_VERIFIED') {
        return NextResponse.json({
          success: false,
          error: 'SECURITY_VIOLATION: Unverified result cannot be saved. Marksheet must pass ROLL_VERIFIED.',
          state: 'ROLL_MISMATCH',
        }, { status: 400 });
      }

      const rollNumber = pending.rollNumber;

      // Identity Rule: Extracted roll number must match active student roll
      if (runner.activeRollNumber && rollNumber !== runner.activeRollNumber) {
        return NextResponse.json({
          success: false,
          error: `ROLL_MISMATCH: Extracted roll '${rollNumber}' does not match requested active roll '${runner.activeRollNumber}'.`,
          state: 'ROLL_MISMATCH',
        }, { status: 400 });
      }

      const dbStudent = await prisma.student.findUnique({
        where: { rollNumber },
      });

      if (!dbStudent) {
        return NextResponse.json({ success: false, error: `Student ${rollNumber} not found in database.` }, { status: 404 });
      }

      // Determine consistent key attributes for result record
      const semNum = normalizeSemesterToNumber(pending.semester) || normalizeSemesterToNumber(session.semester) || normalizeSemesterToNumber(dbStudent.semester) || 2;
      const targetSemester = toRomanSemester(semNum);
      const targetExamType = 'REGULAR';
      const targetAcademicYear = session.academicYear;

      // Upsert to be 100% immune to race conditions or duplicate clicks
      const savedResult = await prisma.result.upsert({
        where: {
          unique_student_result: {
            universityId: session.universityId,
            studentId: dbStudent.id,
            semester: targetSemester,
            examType: targetExamType,
            academicYear: targetAcademicYear,
          },
        },
        update: {
          resultStatus: pending.resultStatus,
          totalMarks: pending.totalMarks,
          maxMarks: pending.maxMarks,
          percentage: pending.percentage,
          sgpa: pending.sgpa,
          cgpa: pending.cgpa,
          validationStatus: validation.status,
          rawDataJson: JSON.stringify(pending),
          collectedAt: new Date(),
        },
        create: {
          studentId: dbStudent.id,
          universityId: session.universityId,
          sessionId: session.id,
          examType: targetExamType,
          semester: targetSemester,
          academicYear: targetAcademicYear,
          resultStatus: pending.resultStatus,
          totalMarks: pending.totalMarks,
          maxMarks: pending.maxMarks,
          percentage: pending.percentage,
          sgpa: pending.sgpa,
          cgpa: pending.cgpa,
          validationStatus: validation.status,
          rawDataJson: JSON.stringify(pending),
        },
      });

      const savedResultId = savedResult.id;

      // Clear existing subject results & validation errors for this result
      await prisma.subjectResult.deleteMany({ where: { resultId: savedResultId } });
      await prisma.validationError.deleteMany({ where: { resultId: savedResultId } });

      // Save Subject Results dynamically
      if (savedResultId && pending.subjects) {
        for (const sub of pending.subjects) {
          await prisma.subjectResult.create({
            data: {
              resultId: savedResultId,
              subjectCode: sub.subjectCode,
              subjectName: sub.subjectName,
              internalMarks: sub.internalMarks ?? null,
              externalMarks: sub.externalMarks ?? null,
              practicalMarks: sub.practicalMarks ?? null,
              totalMarks: sub.totalMarks,
              maxMarks: sub.maxMarks,
              grade: sub.grade ?? null,
              gradePoint: sub.gradePoint ?? null,
              status: sub.status,
            },
          });
        }
      }

      // Save Validation Errors / Warnings if any
      if (savedResultId && (validation.errors.length > 0 || validation.warnings.length > 0)) {
        const allIssues = [...validation.errors, ...validation.warnings];
        for (const issue of allIssues) {
          await prisma.validationError.create({
            data: {
              resultId: savedResultId,
              errorType: issue.ruleId,
              fieldName: issue.fieldName || null,
              message: issue.message,
              severity: issue.severity,
            },
          });
        }
      }

      // Automatically generate/update the SDCMT College Format file on disk
      let savedExcelPath: string | null = null;
      let savedExcelName: string | null = null;
      try {
        const exported = await CollegeFormatExporter.saveCollegeFormatToFile(
          dbStudent.course || session.course,
          dbStudent.semester || session.semester
        );
        savedExcelPath = exported.filePath;
        savedExcelName = exported.fileName;
      } catch (err: any) {
        console.error('[COLLEGE FORMAT AUTO-SAVE WARNING]', err.message);
      }

      // Log RESULT_SAVED audit log
      await prisma.collectionLog.create({
        data: {
          sessionId,
          studentId: dbStudent.id,
          rollNumber,
          status: 'RESULT_SAVED',
          message: `Saved ${pending.source || 'CCSU_REAL'} marksheet for ${pending.studentName} (${pending.resultStatus}, SGPA: ${pending.sgpa ?? 'N/A'}, ${pending.subjects.length} subjects). SDCMT College Sheet updated: ${savedExcelName || 'saved'}.`,
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });

      // Update session counters
      await prisma.resultSession.update({
        where: { id: sessionId },
        data: {
          completedCount: { increment: 1 },
        },
      });

      // Advance runner to next student
      browserRunnerService.advanceStudent(sessionId, {
        rollNumber,
        status: 'COMPLETED',
        message: `Saved marksheet for ${pending.studentName} (${pending.resultStatus}, SGPA: ${pending.sgpa ?? 'N/A'}). SDCMT College Excel updated.`,
      });

      const nextStatus = await browserRunnerService.prepareNextStudent(sessionId);

      return NextResponse.json({
        success: true,
        saved: true,
        resultId: savedResultId,
        savedExcelPath,
        savedExcelName,
        runnerStatus: nextStatus,
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400 });
  } catch (error: any) {
    const code = error.code || error.state || 'REAL_CCSU_EXTRACTION_FAILED';
    const state = error.state || error.code || 'REAL_CCSU_EXTRACTION_FAILED';
    const isCloudflare = code === 'CLOUDFLARE_CHALLENGE_ACTIVE' || state === 'CLOUDFLARE_CHALLENGE_ACTIVE';

    if (currentSessionId) {
      const runner = browserRunnerService.getSession(currentSessionId);
      if (runner) {
        runner.collectionState = state as any;
        if (isCloudflare) {
          runner.status = 'CLOUDFLARE_CHALLENGE_ACTIVE';
          runner.lastMessage = 'Cloudflare verification required. Please complete the "Verify you are human" check in the CCSU browser window.';
        } else {
          runner.status = state as any;
          runner.lastMessage = error.message;
        }
        await browserRunnerService.getBrowserDiagnostics(currentSessionId).catch(() => {});
      }
    }

    return NextResponse.json({
      success: false,
      state,
      code,
      error: error.message,
      debug: error.debug || null,
      runnerStatus: currentSessionId ? browserRunnerService.getSession(currentSessionId) : null,
    }, { status: 200 });
  }
}
