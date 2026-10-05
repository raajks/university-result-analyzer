'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Layers,
  FileText,
  Clock,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export default function ExportsPage() {
  const [exportLogs, setExportLogs] = useState<any[]>([]);
  const [semester, setSemester] = useState('IV');
  const [course, setCourse] = useState('B.C.A.');

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Institutional Examination Reports & Multi-Sheet Exports"
        subtitle="Generate formatted multi-sheet Excel workbooks and CSV files for academic archiving."
      />

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
        {/* Main 5-Sheet Excel Card */}
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 rounded-3xl p-5 sm:p-8 text-white border border-indigo-700/50 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-indigo-800/80 pb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                SheetJS Professional Engine
              </div>
              <h2 className="text-xl font-bold tracking-tight">
                CCSU Comprehensive 5-Sheet Excel Workbook (.xlsx)
              </h2>
              <p className="text-xs text-indigo-200 mt-1 max-w-2xl">
                One-click consolidated institutional grade sheet meeting official university examination committee audit guidelines.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
              <a
                href={`/api/exports/excel?course=${course}&semester=${semester}`}
                className="px-5 sm:px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all hover:scale-105"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Generate & Download Excel (.xlsx)</span>
              </a>
              <a
                href={`/api/exports/csv?course=${course}&semester=${semester}`}
                className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs border border-white/20 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-slate-300" />
                <span>CSV Format</span>
              </a>
            </div>
          </div>

          {/* Breakdown of 5 Sheets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center font-mono font-bold text-indigo-300">
                1
              </div>
              <h4 className="font-bold text-white">Sheet 1: Student Summary</h4>
              <p className="text-[11px] text-indigo-200/80 leading-relaxed">
                Roll No, Name, Enrollment No, Total Marks, Max Marks, SGPA, and Official Result Status.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center font-mono font-bold text-indigo-300">
                2
              </div>
              <h4 className="font-bold text-white">Sheet 2: Subject-wise Marks</h4>
              <p className="text-[11px] text-indigo-200/80 leading-relaxed">
                Full matrix view across all auto-discovered subject columns with individual marks and totals.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center font-mono font-bold text-indigo-300">
                3
              </div>
              <h4 className="font-bold text-white">Sheet 3: Back Students</h4>
              <p className="text-[11px] text-indigo-200/80 leading-relaxed">
                Dedicated list of students failing or carrying back papers with specific subject codes.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center font-mono font-bold text-indigo-300">
                4
              </div>
              <h4 className="font-bold text-white">Sheet 4: Subject Analysis</h4>
              <p className="text-[11px] text-indigo-200/80 leading-relaxed">
                Appeared, Passed, Failed, Pass %, Mean, Median, Highest, Lowest, and Standard Deviation.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center font-mono font-bold text-indigo-300">
                5
              </div>
              <h4 className="font-bold text-white">Sheet 5: Overall Summary</h4>
              <p className="text-[11px] text-indigo-200/80 leading-relaxed">
                High-level cohort KPIs, total passes, overall pass percentage, mean score, and audit timestamps.
              </p>
            </div>
          </div>
        </div>

        {/* Security & Audit Notice */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Audit-ready compliance: No CAPTCHAs, sensitive credentials, or unvalidated results are ever exported.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
