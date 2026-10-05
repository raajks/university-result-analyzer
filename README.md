# University Result Analyzer (CCSU Module & Multi-University Architecture)

> A production-ready, extensible academic operations platform for collecting, validating, analyzing, and reporting student university examination marks.

---

## 📌 Compliance & Security Mandates

- **Zero CAPTCHA Automation**: This application strictly adheres to anti-abuse guidelines. CAPTCHAs are **never** solved, OCR'd, bypassed, or stored. The browser runner automatically navigates to the university portal, populates permitted fields (Roll Number, Marksheet Type), and pauses for manual human solving and form submission.
- **Privacy First**: No public result exposure, role-based access control, parameterized Prisma ORM queries, and clean structured snapshot hashing.
- **Dual Automation Modes**:
  - **Headful Playwright Browser Mode**: Launches Chromium on the user's screen, prepares the input fields, and allows the operator to manually complete CAPTCHA in the official portal window.
  - **High-Fidelity Mock Simulator**: Generates realistic university result scenarios (Passed, Distinction, Back Paper, Failed) for zero-network testing and development without burdening university infrastructure.

---

## 🏛️ System Architecture

### 1. Decoupled University Adapter Pattern
The application does not hard-code university-specific logic. Each university implements `UniversityResultAdapter`:

```text
src/universities/
├── base/
│   ├── adapter.interface.ts    # Core UniversityResultAdapter interface
│   ├── types.ts                # ExtractedResult, ExtractedSubject, ValidationResult
│   └── validator.ts            # 10-Point Data Validation Engine
├── ccsu/
│   ├── ccsu.adapter.ts         # Chaudhary Charan Singh University adapter
│   ├── ccsu.parser.ts          # HTML marksheet parser
│   ├── ccsu.config.ts          # Selectors & Marksheet types
│   └── ccsu.mock.ts            # Mock generator for offline testing
├── aktu/
│   └── aktu.adapter.ts         # AKTU Lucknow adapter template (Plug-and-play)
└── registry.ts                 # Adapter registry & dynamic resolver
```

### 2. The 10-Point Data Validation Pipeline
Before any extracted result is saved to the database, it undergoes rigorous validation:
1. **Roll Number Verification**: Result page roll number matches requested roll number.
2. **Student Identity**: Student name must be captured and non-empty.
3. **Reasonable Subject Count**: Ensures subject count matches semester criteria (typically 3 to 10 subjects).
4. **Numeric Mark Integrity**: Ensures marks are valid numbers or designated absent ('AB') codes.
5. **Maximum Range Check**: Verifies `obtainedMarks <= maxMarks` for each component (internal, external, total).
6. **Component Summation**: Checks that `internal + external + practical == totalMarks` within tolerance.
7. **Duplicate Subject Detection**: Rejects results having duplicate paper codes in the same semester.
8. **Missing Subject Detection**: Flags if paper codes are empty or corrupted.
9. **Structure Integrity**: Detects broken DOM or missing marksheet tables.
10. **Validation Severity Tagging**: Assigns `VALID`, `WARNING`, or `FAILED_TO_PARSE` with itemized audit logs.

---

## 📊 Core Features

1. **Executive Dashboard**:
   - 8 KPI cards: Total Students, Collected, Passed, Failed, Back Students, Pass %, Mean Score, Average SGPA.
   - 6 Recharts Visualizations: Pass vs Fail Donut, Subject-wise Pass %, Subject Average Marks, Grade Distribution, SGPA Curve, and Score Range Histogram.

2. **Student Master & Intelligent Importer**:
   - Uploads `.xlsx`, `.xls`, `.csv` files.
   - Intelligent column mapper automatically recognizing synonyms (`Roll No`, `RollNumber`, `University Roll` -> `rollNumber`).
   - Pre-validation report displaying valid rows, duplicates, and format errors.

3. **Result Collection Console**:
   - Dynamic selection of University, Semester, Course, and Marksheet Type.
   - Live progress indicator (`12 / 74 Students`).
   - Active student card with manual CAPTCHA callout modal.
   - Operator actions: **Continue / Submit**, **Skip Student**, **Retry**, and **Stop**.

4. **Dynamic Results Matrix Table**:
   - **Auto-Discovered Subject Columns**: Dynamically scans semester results and renders dedicated columns for each paper code.
   - Filter by status (Passed, Back Paper, Failed), search by name or roll number, and modal scorecard view.

5. **Subject Performance Analysis**:
   - Calculates Mean, Median, Highest, Lowest, Standard Deviation, Appeared, Passed, Failed, and Pass % for every paper.

6. **Dedicated Backlog Analysis**:
   - Tracks carry-over papers, marks obtained vs minimum passing score needed (40%), and filterable by subject code.

7. **Multi-Sheet Formatted Excel Workbook**:
   - **Sheet 1**: Student Summary
   - **Sheet 2**: Subject-wise Marks Matrix
   - **Sheet 3**: Back Students List
   - **Sheet 4**: Subject Statistical Analysis
   - **Sheet 5**: Overall Cohort Summary

8. **Audit & Activity Logs**:
   - Timestamped trace of every lookup request and validation check with **Retry Failed** capability.

---

## 🚀 Quick Start & Development Setup

### Prerequisites:
- Node.js v18+ (tested on Node v24.21.0)
- npm or pnpm

### Installation:
```bash
# Navigate to project directory
cd university-result-analyzer

# Install dependencies
npm install

# Initialize database schema (SQLite out-of-the-box local development)
npm run db:push

# Seed initial university configs and sample student cohort
npm run db:seed

# Run automated parser & validation unit test suite
npm run test:parser

# Start development server on port 3001
npm run dev
```

Visit **`http://localhost:3001`** in your browser.

---

## 🐘 PostgreSQL Production Deployment

To connect to a production PostgreSQL database (local PostgreSQL, Docker, Neon, or Supabase):

1. Update `.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/university_result_analyzer?schema=public"
```

2. Point Prisma to PostgreSQL schema:
```bash
npx prisma db push --schema=prisma/schema.postgresql.prisma
```

3. Build and launch for production:
```bash
npm run build
npm run start
```

---

## 🔌 Adding Subsequent Universities (e.g., AKTU)

Adding a new university requires **zero modifications** to the database or UI components:

1. Create adapter in `src/universities/aktu/aktu.adapter.ts`:
```typescript
import { UniversityResultAdapter } from '../base/adapter.interface';

export class AKTUAdapter implements UniversityResultAdapter {
  readonly universityCode = 'AKTU';
  readonly universityName = 'Dr. A.P.J. Abdul Kalam Technical University, Lucknow';
  readonly defaultPortalUrl = 'https://erp.aktu.ac.in/...';

  getMarksheetTypes() { ... }
  requiresCaptcha() { return true; }
  async extractResult(html, expected) { ... }
  async validateResult(extracted, expected) { return validateResultData(extracted, expected); }
  normalizeResult(extracted) { return extracted; }
}
```

2. Register in `src/universities/registry.ts`:
```typescript
this.register(new AKTUAdapter());
```

The new university will immediately appear in the university dropdown and result collection workflow!
