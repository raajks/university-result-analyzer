import { prisma } from '../src/lib/prisma';

async function main() {
  const students = await prisma.student.findMany({
    orderBy: { rollNumber: 'asc' },
  });
  console.log(`=== STUDENTS (${students.length}) ===`);
  students.forEach(s => {
    console.log(`${s.rollNumber} | ${s.name} | ${s.course} | Sem ${s.semester}`);
  });

  const results = await prisma.result.findMany({
    include: { student: true, subjects: true },
  });
  console.log(`\n=== RESULTS (${results.length}) ===`);
  results.forEach(r => {
    console.log(`Roll: ${r.student.rollNumber} | Name: ${r.student.name} | Status: ${r.resultStatus} | SGPA: ${r.sgpa} | MaxMarks: ${r.maxMarks} | Subjects: ${r.subjects.length}`);
    r.subjects.forEach(s => {
      console.log(`   - ${s.subjectCode}: ${s.subjectName} | Marks: ${s.totalMarks}/${s.maxMarks} | Grade: ${s.grade}`);
    });
  });
}

main().finally(async () => {
  await prisma.$disconnect();
});
