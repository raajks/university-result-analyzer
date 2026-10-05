import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const sessionId = searchParams.get('sessionId');

    const where: any = {};
    if (status) where.status = status;
    if (sessionId) where.sessionId = sessionId;

    const logs = await prisma.collectionLog.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: 100,
      include: {
        session: { select: { name: true, marksheetType: true } },
      },
    });

    const counts = {
      total: await prisma.collectionLog.count(),
      completed: await prisma.collectionLog.count({ where: { status: 'COMPLETED' } }),
      failed: await prisma.collectionLog.count({ where: { status: 'FAILED' } }),
      warnings: await prisma.collectionLog.count({ where: { status: 'VALIDATION_WARNING' } }),
      skipped: await prisma.collectionLog.count({ where: { status: 'SKIPPED' } }),
    };

    return NextResponse.json({ success: true, logs, counts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Retry Failed action
    const failedLogs = await prisma.collectionLog.findMany({
      where: { status: 'FAILED' },
      distinct: ['rollNumber'],
    });

    return NextResponse.json({
      success: true,
      message: `Found ${failedLogs.length} failed students eligible for retry.`,
      failedRolls: failedLogs.map(l => l.rollNumber),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
