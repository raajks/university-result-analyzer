import { CCSUMockGenerator } from '../universities/ccsu/ccsu.mock';
import { CCSUAdapter } from '../universities/ccsu/ccsu.adapter';
import { StudentLookupInput } from '../universities/base/types';
import { validateResultData } from '../universities/base/validator';
import {
  normalizeSemesterToNumber,
  toRomanSemester,
  textMatchesSemester,
  detectSemesterInText,
} from '../universities/base/semester-helper';

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING CCSU REAL MARKSHEET PARSER & IDENTITY VALIDATION SUITE');
  console.log('================================================================\n');

  const adapter = new CCSUAdapter();
  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, desc: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      process.exitCode = 1;
    }
  }

  // TEST 1: Parsing Real Student 250302002002 Marksheet (ABHI SHARMA, BCA SEM-I)
  console.log('--- Test Suite 1: Real CCSU Marksheet Parsing (Student 250302002002) ---');
  const student1: StudentLookupInput = {
    rollNumber: '250302002002',
    name: 'ABHI SHARMA',
    enrollmentNumber: 'M250302001',
    course: 'BCA SEM-I',
    semester: 'I',
    marksheetType: 'NEP',
  };

  const htmlReal = CCSUMockGenerator.generateMockResultHtml(student1, 'FAIL');
  const result = await adapter.extractResult(htmlReal, student1);

  assert(result.rollNumber === '250302002002', `Roll number matches requested: ${result.rollNumber}`);
  assert(result.studentName === 'Abhi Sharma', `Student name extracted: ${result.studentName}`);
  assert(result.subjects.length === 8, `Discovered exactly 8 subjects from table: ${result.subjects.length}`);
  assert(result.resultStatus === 'FAILED', `Result status parsed as FAILED: ${result.resultStatus}`);
  assert(result.sourceResult === 'FAIL', `Source result preserved as FAIL: ${result.sourceResult}`);
  assert(result.totalCredits === 19, `Total credits parsed: ${result.totalCredits}`);
  assert(result.totalGradeValue === 58, `Total grade value parsed: ${result.totalGradeValue}`);
  assert(result.sgpa === 3.05, `SGPA extracted as 3.05: ${result.sgpa}`);
  assert(result.cgpa === 3.05, `CGPA extracted as 3.05: ${result.cgpa}`);

  // TEST 2: Header-based EXT+INT and Practical Mark Parsing
  console.log('\n--- Test Suite 2: EXT+INT Splitting & Practical Non-Splitting ---');
  const sub1001 = result.subjects.find(s => s.subjectCode === '1001');
  assert(sub1001 !== undefined, 'Found subject 1001');
  assert(sub1001?.externalMarks === 18, `1001 external marks split correctly: ${sub1001?.externalMarks}`);
  assert(sub1001?.internalMarks === 17, `1001 internal marks split correctly: ${sub1001?.internalMarks}`);
  assert(sub1001?.totalMarks === 35, `1001 total marks: ${sub1001?.totalMarks}`);
  assert(sub1001?.grade === 'F', `1001 grade is F: ${sub1001?.grade}`);
  assert(sub1001?.credit === 3, `1001 credit is 3: ${sub1001?.credit}`);
  assert(sub1001?.gradeValue === 0, `1001 grade value is 0: ${sub1001?.gradeValue}`);

  const sub1002P = result.subjects.find(s => s.subjectCode === '1002P');
  assert(sub1002P !== undefined, 'Found practical subject 1002P');
  assert(sub1002P?.isPractical === true, '1002P flagged as isPractical');
  assert(sub1002P?.practicalMarks === 66, `1002P practical marks preserved without incorrect split: ${sub1002P?.practicalMarks}`);
  assert(sub1002P?.totalMarks === 66, `1002P total marks: ${sub1002P?.totalMarks}`);
  assert(sub1002P?.grade === 'B-', `1002P grade preserved as B-: ${sub1002P?.grade}`);
  assert(sub1002P?.credit === 2, `1002P credit is 2: ${sub1002P?.credit}`);
  assert(sub1002P?.gradeValue === 14, `1002P grade value extracted: ${sub1002P?.gradeValue}`);

  // TEST 3: Identity Verification Rule: Roll number ONLY (Name does NOT fail match)
  console.log('\n--- Test Suite 3: Identity Verification (Roll Number Only) ---');
  // Sub-case A: Name in uploaded roster differs from marksheet name, but Roll matches
  const rosterWithDifferentName: StudentLookupInput = {
    rollNumber: '250302002002',
    name: 'A. SHARMA', // Differs from ABHI SHARMA
    marksheetType: 'NEP',
  };
  const validCheckDifferentName = await adapter.validateResult(result, rosterWithDifferentName);
  assert(validCheckDifferentName.isValid === true, 'Matching roll number with different roster name passes identity verification');
  assert(!validCheckDifferentName.errors.some(e => e.ruleId === 'RULE_1_ROLL_MISMATCH'), 'No roll mismatch error');

  // Sub-case B: Roll Number differs
  let rollMismatchCaught = false;
  try {
    const wrongStudentInput: StudentLookupInput = {
      rollNumber: '250302002003', // Different roll!
      name: 'ADITYA SINGH',
      marksheetType: 'NEP',
    };
    await adapter.extractResult(htmlReal, wrongStudentInput);
  } catch (err: any) {
    if (err.code === 'ROLL_MISMATCH' || err.message.includes('ROLL_MISMATCH') || err.message.includes('roll number')) {
      rollMismatchCaught = true;
    }
  }
  assert(rollMismatchCaught, 'Roll number mismatch caught in parser and rejected with ROLL_MISMATCH');

  // TEST 4: Validation Engine Safety Checks
  console.log('\n--- Test Suite 4: Validation Engine Safety Checks ---');
  // Marks exceeding maximum
  const tamperedResult = {
    ...result,
    subjects: [
      {
        subjectCode: '1001',
        subjectName: 'Math',
        totalMarks: 110,
        maxMarks: 100,
        status: 'PASS' as const,
      }
    ]
  };
  const exceedCheck = validateResultData(tamperedResult, student1);
  assert(exceedCheck.isValid === false, 'Marks exceeding max marks caught');
  assert(exceedCheck.errors.some(e => e.ruleId === 'RULE_5_MARKS_EXCEED_MAX'), 'RULE_5_MARKS_EXCEED_MAX error flagged');

  // Duplicate subject
  const duplicateResult = {
    ...result,
    subjects: [
      { subjectCode: '1001', subjectName: 'Math A', totalMarks: 35, maxMarks: 100, status: 'FAIL' as const },
      { subjectCode: '1001', subjectName: 'Math B', totalMarks: 35, maxMarks: 100, status: 'FAIL' as const },
    ]
  };
  const duplicateCheck = validateResultData(duplicateResult, student1);
  assert(duplicateCheck.warnings.some(w => w.ruleId === 'RULE_7_DUPLICATE_SUBJECT'), 'Duplicate subject warning flagged');

  // TEST 5: INGWRAP Rejection & Distinct Error Codes (User Specification)
  console.log('\n--- Test Suite 5: INGWRAP Rejection & Error Code Distinction ---');
  const { CCSUParser, extractCCSURollNumber } = await import('../universities/ccsu/ccsu.parser');
  const parser = new CCSUParser();

  // 1. Dedicated standalone extractCCSURollNumber with INGWRAP must return null (NOT "INGWRAP")
  const ingwrapHtml = `
    <html>
      <body>
        <h3>STATEMENT OF MARKS</h3>
        <table>
          <tr><td><b>Roll No:</b></td><td>INGWRAP</td><td><b>Candidate Name:</b></td><td>ABHI SHARMA</td></tr>
        </table>
        <table>
          <tr><th>COURSE TITLE</th><th>CODE NO.</th><th>MAX</th><th>MIN</th><th>TOTAL</th></tr>
          <tr><td>MATH</td><td>1001</td><td>100</td><td>40</td><td>50</td></tr>
        </table>
      </body>
    </html>
  `;
  const standaloneIngwrapRoll = extractCCSURollNumber(ingwrapHtml);
  assert(standaloneIngwrapRoll === null, `standalone extractCCSURollNumber returns null when value is INGWRAP (got: ${standaloneIngwrapRoll})`);

  const ingwrapRoll = parser.extractCCSURollNumber(ingwrapHtml);
  assert(ingwrapRoll === null, `parser.extractCCSURollNumber returns null when value is INGWRAP (got: ${ingwrapRoll})`);

  // 2. DOM containing responsive layout wrapper with scrollingwrap / headingwrap
  const scrollingWrapHtml = `
    <div class="scrollingwrap" id="scrollingwrap">
      <h3>STATEMENT OF MARKS</h3>
      <table>
        <tr>
          <td><b>Roll No:</b></td>
          <td>250302002002</td>
          <td><b>Candidate Name:</b></td>
          <td>ABHI SHARMA</td>
        </tr>
      </table>
      <table>
        <tr><th>COURSE TITLE</th><th>CODE NO.</th><th>MAX</th><th>MIN</th><th>TOTAL</th></tr>
        <tr><td>MATH</td><td>1001</td><td>100</td><td>40</td><td>50</td></tr>
      </table>
    </div>
  `;
  const scrollingWrapExtracted = extractCCSURollNumber(scrollingWrapHtml);
  assert(
    scrollingWrapExtracted === '250302002002',
    `extractCCSURollNumber extracts 250302002002 and ignores scrollingwrap (got: ${scrollingWrapExtracted})`
  );

  // 3. parseHtml with INGWRAP must throw REAL_CCSU_ROLL_NUMBER_NOT_FOUND (NOT RESULT_NOT_FOUND)
  let ingwrapErrorCode = '';
  try {
    parser.parseHtml(ingwrapHtml, student1);
  } catch (err: any) {
    ingwrapErrorCode = err.code || '';
  }
  assert(
    ingwrapErrorCode === 'REAL_CCSU_ROLL_NUMBER_NOT_FOUND',
    `INGWRAP throws REAL_CCSU_ROLL_NUMBER_NOT_FOUND (got: ${ingwrapErrorCode})`
  );

  // 4. Genuine roll mismatch (e.g. roll 250302002003 vs expected 250302002002) must throw ROLL_MISMATCH (NOT RESULT_NOT_FOUND)
  const otherStudentHtml = `
    <html>
      <body>
        <h3>STATEMENT OF MARKS</h3>
        <table>
          <tr><td><b>Roll No:</b></td><td>250302002003</td><td><b>Candidate Name:</b></td><td>OTHER STUDENT</td></tr>
        </table>
        <table>
          <tr><th>COURSE TITLE</th><th>CODE NO.</th><th>MAX</th><th>MIN</th><th>TOTAL</th></tr>
          <tr><td>MATH</td><td>1001</td><td>100</td><td>40</td><td>50</td></tr>
        </table>
      </body>
    </html>
  `;
  let mismatchErrorCode = '';
  try {
    parser.parseHtml(otherStudentHtml, student1);
  } catch (err: any) {
    mismatchErrorCode = err.code || '';
  }
  assert(
    mismatchErrorCode === 'ROLL_MISMATCH',
    `Genuine roll mismatch throws ROLL_MISMATCH (got: ${mismatchErrorCode})`
  );

  // 5. Debug information is properly populated via extractCCSURollNumberWithDebug
  const extractionWithDebug = parser.extractCCSURollNumberWithDebug(htmlReal, '250302002002');
  assert(extractionWithDebug.rollNumber === '250302002002', 'Debug extractor found correct roll');
  assert(extractionWithDebug.debug.requestedRollNumber === '250302002002', 'Debug info contains requestedRollNumber');
  assert(extractionWithDebug.debug.selectedElement.length > 0, 'Debug info contains selectedElement');
  assert(extractionWithDebug.debug.rollExtractionCandidates.length > 0, 'Debug info contains rollExtractionCandidates');
  assert(
    extractionWithDebug.debug.rollExtractionCandidates.some(c => c.value === '250302002002' && c.isValid),
    'Debug candidates contains valid 250302002002'
  );

  // TEST 6: Cloudflare Security Challenge Detection
  console.log('\n--- Test Suite 6: Cloudflare Security Challenge Detection ---');
  const cloudflarePages = [
    '<html><head><title>Just a moment...</title></head><body>Checking your browser before accessing result.ccsuniversityweb.in</body></html>',
    '<html><body><div>Verify you are human</div><div class="cf-turnstile"></div></body></html>',
    '<html><body><div>Performing security verification to protect against malicious bots</div></body></html>',
    '<html><head><title>Cloudflare</title></head><body>Just a moment...</body></html>'
  ];

  for (const cfHtml of cloudflarePages) {
    let cfCode = '';
    let cfState = '';
    try {
      parser.parseHtml(cfHtml, student1);
    } catch (err: any) {
      cfCode = err.code || '';
      cfState = err.state || '';
    }
    assert(
      cfCode === 'CLOUDFLARE_CHALLENGE_ACTIVE' && cfState === 'CLOUDFLARE_CHALLENGE_ACTIVE',
      `Cloudflare page returns CLOUDFLARE_CHALLENGE_ACTIVE (code: ${cfCode}, state: ${cfState})`
    );
  }

  // TEST 7: Semester Normalization & Verification Engine
  console.log('\n--- Test Suite 7: Semester Normalization & Verification ---');

  assert(normalizeSemesterToNumber('1') === 1, 'normalizeSemesterToNumber 1');
  assert(normalizeSemesterToNumber('I') === 1, 'normalizeSemesterToNumber I');
  assert(normalizeSemesterToNumber('2') === 2, 'normalizeSemesterToNumber 2');
  assert(normalizeSemesterToNumber('II') === 2, 'normalizeSemesterToNumber II');
  assert(normalizeSemesterToNumber('2nd') === 2, 'normalizeSemesterToNumber 2nd');
  assert(normalizeSemesterToNumber('Sem 2') === 2, 'normalizeSemesterToNumber Sem 2');
  assert(toRomanSemester(2) === 'II', 'toRomanSemester 2 -> II');

  // Verify link text & href matching for Sem 1 vs Sem 2
  const sem1LinkText = 'COURSE-BCA SEM-I - (DEC-2025)';
  const sem1Href = '/Result/PrintMarksheet/250302002003-I-NEP';
  const sem2LinkText = 'COURSE-BCA SEM-II - (JUN-2026)';
  const sem2Href = '/Result/PrintMarksheet/250302002003-II-NEP';

  assert(textMatchesSemester(sem1LinkText, 1), 'sem1 link text matches Sem 1');
  assert(!textMatchesSemester(sem1LinkText, 2), 'sem1 link text does NOT match Sem 2');
  assert(textMatchesSemester(sem1Href, 1), 'sem1 href matches Sem 1');
  assert(!textMatchesSemester(sem1Href, 2), 'sem1 href does NOT match Sem 2');

  assert(textMatchesSemester(sem2LinkText, 2), 'sem2 link text matches Sem 2');
  assert(!textMatchesSemester(sem2LinkText, 1), 'sem2 link text does NOT match Sem 1');
  assert(textMatchesSemester(sem2Href, 2), 'sem2 href matches Sem 2');
  assert(!textMatchesSemester(sem2Href, 1), 'sem2 href does NOT match Sem 1');

  assert(detectSemesterInText(sem1LinkText) === 1, 'detectSemesterInText detects Sem 1');
  assert(detectSemesterInText(sem2LinkText) === 2, 'detectSemesterInText detects Sem 2');

  // Verify CCSUMockGenerator generates Sem 2 subjects when semester is II
  const mockHtmlSem2 = CCSUMockGenerator.generateMockResultHtml({ rollNumber: '250302002002', marksheetType: 'NEP', semester: 'II' });
  const parsedSem2 = parser.parseHtml(mockHtmlSem2, { rollNumber: '250302002002', marksheetType: 'NEP', semester: 'II' });
  assert(parsedSem2.semester === 'II', `Parsed Sem 2 semester is II (got: ${parsedSem2.semester})`);
  assert(parsedSem2.subjects[0].subjectCode === '2001', `Parsed Sem 2 first subject is 2001 (got: ${parsedSem2.subjects[0].subjectCode})`);

  // Verify validator catches semester mismatch
  const semMismatchValidation = await adapter.validateResult(parsedSem2, { rollNumber: '250302002002', marksheetType: 'NEP', semester: 'I' });
  assert(!semMismatchValidation.isValid, 'Validation fails when expected semester I does not match extracted semester II');
  assert(
    semMismatchValidation.errors.some(e => e.ruleId === 'RULE_1B_SEMESTER_MISMATCH'),
    'RULE_1B_SEMESTER_MISMATCH is flagged in validation errors'
  );

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passedTests} / ${totalTests} tests passed.`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
