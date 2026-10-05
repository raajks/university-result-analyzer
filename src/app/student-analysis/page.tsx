'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import {
  GraduationCap,
  Search,
  Award,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  BookOpen
} from 'lucide-react';

export default function StudentAnalysisPage() {
  const [results, setResults] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/results');
        const json = await res.json();
        if (json.success) {
          setResults(json.results || []);
          setColumns(json.columns || []);
          if (json.results?.length > 0) {
            setSelectedStudent(json.results[0]);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadData();
  }, []);

  const filtered = results.filter(
    r =>
      r.rollNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.studentName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Student Performance Scorecard Analysis"
        subtitle="Detailed individual examination transcript & score breakdown."
      />

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Student Selector List */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Find student..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden max-h-[600px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.map(st => (
                <div
                  key={st.id}
                  onClick={() => setSelectedStudent(st)}
                  className={`p-3.5 cursor-pointer transition-colors text-xs ${
                    selectedStudent?.id === st.id
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-l-4 border-indigo-600'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
                      {st.rollNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        st.resultStatus === 'PASSED'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                      }`}
                    >
                      {st.resultStatus}
                    </span>
                  </div>
                  <div className="font-medium text-slate-900 dark:text-white">
                    {st.studentName}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Score: {st.totalMarks} / {st.maxMarks} ({st.percentage}%) | SGPA: {st.sgpa ?? '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Detailed Marksheet Card */}
          {selectedStudent ? (
            <div className="md:col-span-2 space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
                {/* Header Banner */}
                <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Official Provisional Statement
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedStudent.studentName}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Chaudhary Charan Singh University, Meerut
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-bold ${
                        selectedStudent.resultStatus === 'PASSED'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                      }`}
                    >
                      {selectedStudent.resultStatus}
                    </span>
                  </div>
                </div>

                {/* Information Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Roll Number</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{selectedStudent.rollNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Enrollment No</span>
                    <span className="font-mono">{selectedStudent.enrollmentNumber || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Course</span>
                    <span className="font-medium">{selectedStudent.course}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Semester</span>
                    <span className="font-semibold">Sem {selectedStudent.semester}</span>
                  </div>
                </div>

                {/* Marks Breakdown Table */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2.5">
                    Subject-wise Scores & Grades
                  </h4>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                          <th className="py-2.5 px-3">Paper Code</th>
                          <th className="py-2.5 px-3">Paper Name</th>
                          <th className="py-2.5 px-3 text-center">Internal (25)</th>
                          <th className="py-2.5 px-3 text-center">External (75)</th>
                          <th className="py-2.5 px-3 text-center">Total (100)</th>
                          <th className="py-2.5 px-3 text-center">Grade</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {columns.map(col => {
                          const sub = selectedStudent.subjects[col.code];
                          if (!sub) return null;
                          return (
                            <tr key={col.code} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{col.code}</td>
                              <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{col.name}</td>
                              <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-400">{sub.internal ?? '—'}</td>
                              <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-400">{sub.external ?? '—'}</td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">{sub.marks}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-700 dark:text-slate-300">{sub.grade || '—'}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    sub.status === 'PASS'
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                                  }`}
                                >
                                  {sub.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Score Summary Footprint */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Total Marks Obtained</span>
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedStudent.totalMarks} / {selectedStudent.maxMarks}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Overall Percentage</span>
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                      {selectedStudent.percentage}%
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Semester Grade Point (SGPA)</span>
                    <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                      {selectedStudent.sgpa ?? 'N/A'}
                    </span>
                  </div>
                </div>

                {selectedStudent.backSubjects.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Eligible for Carry-Over Examination in: <strong>{selectedStudent.backSubjects.join(', ')}</strong></span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-xs text-slate-400">
              Select a student from the left panel to inspect scorecard transcript.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
