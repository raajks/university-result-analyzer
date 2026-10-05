'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import {
  BarChart3,
  TrendingUp,
  Award,
  AlertTriangle,
  ArrowUpDown,
  BookOpen,
  Calculator,
  Search
} from 'lucide-react';
import { SubjectStats } from '@/lib/stats-engine';

export default function SubjectAnalysisPage() {
  const [subjects, setSubjects] = useState<SubjectStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const res = await fetch('/api/stats');
        const json = await res.json();
        if (json.success) {
          setSubjects(json.subjectStats || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const filtered = subjects.filter(
    s =>
      s.subjectCode.toLowerCase().includes(search.toLowerCase()) ||
      s.subjectName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Subject Performance & Statistical Analysis"
        subtitle="Calculated metrics including mean, median, standard deviation, and pass ratios."
      />

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
        {/* Header Search & Summary */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search paper code or name..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Analyzing {subjects.length} Examination Subjects
          </div>
        </div>

        {/* Statistical Summary Cards per Subject */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? (
            <div className="col-span-3 py-16 text-center text-xs text-slate-400">
              Calculating statistical distributions...
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-3 py-16 text-center text-xs text-slate-400">
              No subjects found.
            </div>
          ) : (
            filtered.map(sub => (
              <div
                key={sub.subjectCode}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {sub.subjectCode}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        sub.passPercentage >= 90
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                          : sub.passPercentage >= 75
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                      }`}
                    >
                      {sub.passPercentage}% Pass
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {sub.subjectName}
                  </h3>

                  {/* Metrics 3x2 Matrix */}
                  <div className="grid grid-cols-3 gap-2.5 mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Appeared</span>
                      <span className="font-bold text-slate-900 dark:text-white">{sub.appeared}</span>
                      <span className="text-[9px] text-slate-400 block">/ {sub.totalStudents}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Passed</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{sub.passed}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Failed</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">{sub.failed}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Mean (Avg)</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{sub.averageMarks}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Highest</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{sub.highestMarks}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Lowest</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{sub.lowestMarks}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Stats Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Median Score: <strong className="text-slate-800 dark:text-slate-200">{sub.medianMarks}</strong></span>
                  <span>Std Deviation: <strong className="text-slate-800 dark:text-slate-200">{sub.standardDeviation}</strong></span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
