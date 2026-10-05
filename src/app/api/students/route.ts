import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const course = searchParams.get('course') || '';
    const semester = searchParams.get('semester') || '';

    const where: any = {};
    if (search) {
      where.OR = [
        { rollNumber: { contains: search } },
        { name: { contains: search } },
        { enrollmentNumber: { contains: search } },
      ];
    }
    if (course) where.course = course;
    if (semester) where.semester = semester;

    const students = await prisma.student.findMany({
      where,
      orderBy: { rollNumber: 'asc' },
      include: {
        results: {
          select: {
            id: true,
            resultStatus: true,
            totalMarks: true,
            maxMarks: true,
            percentage: true,
            sgpa: true,
            validationStatus: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, students });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rollNumber, name, enrollmentNumber, course, semester, section, batch } = body;

    if (!rollNumber || !name) {
      return NextResponse.json(
        { success: false, error: 'Roll Number and Student Name are required.' },
        { status: 400 }
      );
    }

    const student = await prisma.student.upsert({
      where: { rollNumber: rollNumber.trim() },
      update: {
        name: name.trim(),
        enrollmentNumber: enrollmentNumber?.trim() || null,
        course: course?.trim() || 'B.C.A.',
        semester: semester?.trim() || 'IV',
        section: section?.trim() || null,
        batch: batch?.trim() || null,
      },
      create: {
        rollNumber: rollNumber.trim(),
        name: name.trim(),
        enrollmentNumber: enrollmentNumber?.trim() || null,
        course: course?.trim() || 'B.C.A.',
        semester: semester?.trim() || 'IV',
        section: section?.trim() || null,
        batch: batch?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, student });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const scope = searchParams.get('scope'); // 'all' or 'results'

    if (scope === 'all') {
      await prisma.subjectResult.deleteMany();
      await prisma.validationError.deleteMany();
      await prisma.result.deleteMany();
      await prisma.collectionLog.deleteMany();
      await prisma.resultSession.deleteMany();
      await prisma.student.deleteMany();

      return NextResponse.json({ success: true, message: 'All students and results deleted successfully.' });
    }

    if (scope === 'results') {
      await prisma.subjectResult.deleteMany();
      await prisma.validationError.deleteMany();
      await prisma.result.deleteMany();
      await prisma.collectionLog.deleteMany();

      return NextResponse.json({ success: true, message: 'All result records cleared. Ready for fresh collection.' });
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Student ID or scope parameter required.' }, { status: 400 });
    }

    // Delete single student with cascading relations
    const results = await prisma.result.findMany({ where: { studentId: id } });
    const resultIds = results.map(r => r.id);

    await prisma.subjectResult.deleteMany({ where: { resultId: { in: resultIds } } });
    await prisma.validationError.deleteMany({ where: { resultId: { in: resultIds } } });
    await prisma.result.deleteMany({ where: { id: { in: resultIds } } });
    await prisma.collectionLog.deleteMany({ where: { studentId: id } });
    await prisma.student.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Student deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
