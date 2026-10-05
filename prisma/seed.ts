import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding University Result Analyzer Database...');

  // 1. Universities
  const ccsu = await prisma.university.upsert({
    where: { code: 'CCSU' },
    update: {},
    create: {
      code: 'CCSU',
      name: 'Chaudhary Charan Singh University, Meerut',
      portalUrl: 'https://result.ccsuniversityweb.in/',
      adapterKey: 'ccsu',
      isActive: true,
      configJson: JSON.stringify({
        defaultMarksheetType: 'NEP',
        timeoutMs: 45000,
        pauseForCaptcha: true,
      }),
    },
  });

  const aktu = await prisma.university.upsert({
    where: { code: 'AKTU' },
    update: {},
    create: {
      code: 'AKTU',
      name: 'Dr. A.P.J. Abdul Kalam Technical University, Lucknow',
      portalUrl: 'https://erp.aktu.ac.in/WebPages/OneView/OneView.aspx',
      adapterKey: 'aktu',
      isActive: true,
      configJson: JSON.stringify({
        defaultMarksheetType: 'REGULAR',
        pauseForCaptcha: true,
      }),
    },
  });

  // 2. Sample Students for BCA Sem IV
  const studentData = [
    { rollNumber: '210052010001', name: 'Aarav Sharma', enrollmentNumber: 'M21098401', course: 'B.C.A.', semester: 'IV', section: 'A' },
    { rollNumber: '210052010002', name: 'Ananya Gupta', enrollmentNumber: 'M21098402', course: 'B.C.A.', semester: 'IV', section: 'A' },
    { rollNumber: '210052010003', name: 'Rohan Verma', enrollmentNumber: 'M21098403', course: 'B.C.A.', semester: 'IV', section: 'A' },
    { rollNumber: '210052010004', name: 'Ishaan Patel', enrollmentNumber: 'M21098404', course: 'B.C.A.', semester: 'IV', section: 'A' },
    { rollNumber: '210052010005', name: 'Sneha Singh', enrollmentNumber: 'M21098405', course: 'B.C.A.', semester: 'IV', section: 'B' },
    { rollNumber: '210052010006', name: 'Kabir Malhotra', enrollmentNumber: 'M21098406', course: 'B.C.A.', semester: 'IV', section: 'B' },
    { rollNumber: '210052010007', name: 'Diya Choudhary', enrollmentNumber: 'M21098407', course: 'B.C.A.', semester: 'IV', section: 'B' },
    { rollNumber: '210052010008', name: 'Aditya Rao', enrollmentNumber: 'M21098408', course: 'B.C.A.', semester: 'IV', section: 'B' },
    { rollNumber: '210052010009', name: 'Meera Nair', enrollmentNumber: 'M21098409', course: 'B.C.A.', semester: 'IV', section: 'A' },
    { rollNumber: '210052010010', name: 'Yash Vardhan', enrollmentNumber: 'M21098410', course: 'B.C.A.', semester: 'IV', section: 'A' },
  ];

  for (const s of studentData) {
    await prisma.student.upsert({
      where: { rollNumber: s.rollNumber },
      update: {},
      create: s,
    });
  }

  // 3. Sample Result Session
  const session = await prisma.resultSession.create({
    data: {
      universityId: ccsu.id,
      name: 'BCA Semester IV Regular Batch 2024',
      course: 'B.C.A.',
      semester: 'IV',
      marksheetType: 'NEP',
      academicYear: '2023-2024',
      status: 'COMPLETED',
      totalStudents: 10,
      completedCount: 8,
      failedCount: 0,
    },
  });

  // 4. Sample Results with Subject Marks
  const subjectsConfig = [
    { code: 'BCA-401', name: 'Computer Graphics & Multimedia' },
    { code: 'BCA-402', name: 'Operating System' },
    { code: 'BCA-403', name: 'Software Engineering' },
    { code: 'BCA-404', name: 'Optimization Techniques' },
    { code: 'BCA-405P', name: 'Computer Graphics Lab' },
  ];

  const students = await prisma.student.findMany({ take: 8 });

  for (let i = 0; i < students.length; i++) {
    const st = students[i];
    const isBack = i === 2; // Rohan Verma has back paper
    const isDistinction = i === 1 || i === 4; // Ananya, Sneha distinction

    const baseMarks = isDistinction ? 82 : isBack ? 42 : 68;
    let studentTotal = 0;

    const res = await prisma.result.create({
      data: {
        studentId: st.id,
        universityId: ccsu.id,
        sessionId: session.id,
        examType: 'REGULAR',
        semester: 'IV',
        academicYear: '2023-2024',
        resultStatus: isBack ? 'BACK' : 'PASSED',
        totalMarks: 0, // updated below
        maxMarks: 500,
        percentage: 0,
        sgpa: isDistinction ? 8.6 : isBack ? 5.2 : 7.4,
        cgpa: isDistinction ? 8.4 : isBack ? 5.8 : 7.2,
        validationStatus: isBack ? 'WARNING' : 'VALID',
        rawDataJson: JSON.stringify({ seeded: true }),
      },
    });

    for (let j = 0; j < subjectsConfig.length; j++) {
      const sub = subjectsConfig[j];
      let marks = baseMarks + (j * 3) - (i * 2);
      if (isBack && (j === 1 || j === 3)) marks = 28; // Back in OS and Optimization
      if (marks > 98) marks = 95;
      if (marks < 20) marks = 28;

      studentTotal += marks;
      const subStatus = marks >= 40 ? 'PASS' : 'BACK';

      await prisma.subjectResult.create({
        data: {
          resultId: res.id,
          subjectCode: sub.code,
          subjectName: sub.name,
          internalMarks: Math.round(marks * 0.25),
          externalMarks: Math.round(marks * 0.75),
          totalMarks: marks,
          maxMarks: 100,
          grade: marks >= 85 ? 'O' : marks >= 75 ? 'A+' : marks >= 65 ? 'A' : marks >= 50 ? 'B' : marks >= 40 ? 'P' : 'F',
          gradePoint: marks >= 85 ? 10 : marks >= 75 ? 9 : marks >= 65 ? 8 : marks >= 50 ? 6 : marks >= 40 ? 4 : 0,
          status: subStatus,
        },
      });
    }

    await prisma.result.update({
      where: { id: res.id },
      data: {
        totalMarks: studentTotal,
        percentage: parseFloat(((studentTotal / 500) * 100).toFixed(2)),
      },
    });

    // Collection Log
    await prisma.collectionLog.create({
      data: {
        sessionId: session.id,
        studentId: st.id,
        rollNumber: st.rollNumber,
        status: isBack ? 'VALIDATION_WARNING' : 'COMPLETED',
        message: isBack ? 'Collected with back paper notice in BCA-402, BCA-404' : 'Result successfully collected and verified',
        startedAt: new Date(Date.now() - (10 - i) * 60000),
        completedAt: new Date(Date.now() - (10 - i) * 60000 + 4000),
      },
    });
  }

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
