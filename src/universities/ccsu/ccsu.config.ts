import { MarksheetTypeOption } from '../base/types';

export const CCSU_CONFIG = {
  code: 'CCSU',
  name: 'Chaudhary Charan Singh University, Meerut',
  portalUrl: 'https://result.ccsuniversityweb.in/',
  backupPortalUrl: 'https://result.ccsuniversity.ac.in/',
  
  // Standard CSS / Form selectors on the CCSU result form
  selectors: {
    rollNumberInput: [
      '#roll',
      'input[name="roll"]',
      'input[name="RollNo"]',
      'input[name="roll_no"]',
      'input[name="txtRollNo"]',
      'input[name="rollno"]',
      '#RollNo',
      '#txtRollNo'
    ],
    marksheetTypeSelect: [
      '#buttonClicked',
      'select[name="buttonClicked"]',
      'select[name="MarksheetType"]',
      'select[name="course_type"]',
      'select[name="ExamType"]',
      '#MarksheetType'
    ],
    captchaInput: [
      '#CaptchaInputText',
      'input[name="CaptchaInputText"]',
      'input[name="Captcha"]',
      'input[name="txtCaptcha"]',
      'input[name="code"]',
      '#Captcha'
    ],
    submitButton: [
      'input[type="submit"]',
      'button[type="submit"]',
      '#btnSearch',
      '#btnSubmit',
      'input[value="Search"]',
      'input[value="Result View"]'
    ],
    resultContainer: [
      'table.marksheet',
      'table[border="1"]',
      '#marksheet_table',
      '.table-marksheet',
      'table:has(th:has-text("Paper Code"))',
      'table:has(td:has-text("Roll No"))',
      'table:has(th:has-text("Subject Code"))',
      'table:has(th:has-text("Course Title"))'
    ],
    courseResultLink: [
      'a:has-text("COURSE-")',
      'a:has-text("SEM-")',
      'a[href*="result"]',
      'a[href*="marksheet"]',
      'a[href*="Result"]',
      'a[target="_blank"]',
      'table a',
      '.result-link a'
    ]
  },

  marksheetTypes: [
    {
      id: 'NEP_ODD_EVEN',
      label: 'NEP Odd/Even Semester (Traditional/Professional)',
      value: 'NEP',
      description: 'Courses under NEP 2020 (BA, BSc, BCom, BCA, BBA etc.)'
    },
    {
      id: 'NON_NEP_ODD_EVEN',
      label: 'Non-NEP Odd/Even Semester',
      value: 'NON-NEP',
      description: 'Traditional courses prior to NEP curriculum'
    },
    {
      id: 'BACK_PAPER',
      label: 'Back Paper / Improvement / Ex-Student',
      value: 'BACK',
      description: 'Special/Back paper examinations'
    },
    {
      id: 'PROFESSIONAL',
      label: 'Professional Courses (Medical/Law/Engineering)',
      value: 'PROF',
      description: 'Professional programs'
    }
  ] as MarksheetTypeOption[]
};
