'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import {
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Award,
  BarChart3,
  PlayCircle,
  FileSpreadsheet,
  ArrowUpRight,
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/stats');
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error('Failed to load stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const cohort = data?.cohort || {
    totalStudents: 10,
    resultsCollected: 8,
    pendingCount: 2,
    passedCount: 7,
    backCount: 1,
    failedCount: 0,
    passPercentage: 87.5,
    averageMarks: 67.4,
    averageSgpa: 7.3,
  };

  const charts = data?.charts || {
    passFailChart: [
      { name: 'Passed', value: 7, fill: '#10b981' },
      { name: 'Back Paper', value: 1, fill: '#f59e0b' },
    ],
    subjectPassChart: [],
    subjectAvgMarksChart: [],
    gradeChart: [],
    sgpaChart: [],
    marksChart: [],
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Executive Examination Dashboard"
        subtitle="Chaudhary Charan Singh University (CCSU) - Odd/Even Semester Analytics"
      />

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
        {/* Top Banner Action Strip */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-4 sm:p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-indigo-700/50">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 text-amber-300" />
              Automated Operations Console
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              CCSU Batch 2024 Collection Session
            </h2>
            <p className="text-xs text-indigo-200 mt-0.5 max-w-xl">
              Upload student master lists, trigger browser-assisted lookup with human CAPTCHA solving, and generate 5-sheet consolidated performance workbooks.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <Link
              href="/collection"
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02]"
            >
              <PlayCircle className="w-4 h-4" />
              Start Collection
            </Link>
            <Link
              href="/exports"
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/20 backdrop-blur-sm transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Export Excel
            </Link>
            <button
              onClick={fetchData}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 8 Metric KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Students</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{cohort.totalStudents}</span>
              <span className="text-[11px] text-slate-400">Enrolled</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Results Collected</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{cohort.resultsCollected}</span>
              <span className="text-[11px] text-slate-400 font-medium">({Math.round((cohort.resultsCollected / (cohort.totalStudents || 1)) * 100)}%)</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Passed Students</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{cohort.passedCount}</span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">{cohort.passPercentage}%</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Back Paper / Failed</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{cohort.backCount} Back</span>
              <span className="text-[11px] text-rose-500">{cohort.failedCount} Fail</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pass Percentage</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950 flex items-center justify-center text-teal-600 dark:text-teal-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{cohort.passPercentage}%</span>
              <span className="text-[11px] text-slate-400">Of appeared</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Average Score</span>
              <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950 flex items-center justify-center text-violet-600 dark:text-violet-400">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{cohort.averageMarks}%</span>
              <span className="text-[11px] text-slate-400">Mean</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Average SGPA</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{cohort.averageSgpa || 'N/A'}</span>
              <span className="text-[11px] text-slate-400">Scale of 10</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Lookups</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-700 dark:text-slate-300">{cohort.pendingCount}</span>
              <span className="text-[11px] text-slate-400">In queue</span>
            </div>
          </div>
        </div>

        {/* 6 Recharts Interactive Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Chart 1: Pass vs Fail Donut */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">1. Pass vs Fail Distribution</h3>
                <p className="text-[11px] text-slate-500">Cohort completion outcome</p>
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.passFailChart}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                  >
                    {charts.passFailChart.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 text-xs mt-2">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Passed ({cohort.passedCount})</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Back Paper ({cohort.backCount})</div>
            </div>
          </div>

          {/* Chart 2: Subject-wise Pass Percentage */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">2. Subject-wise Pass %</h3>
                <p className="text-[11px] text-slate-500">Pass rate by individual paper</p>
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.subjectPassChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }} />
                  <Bar dataKey="passPercentage" fill="#6366f1" radius={[4, 4, 0, 0]} name="Pass %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Subject-wise Average Marks */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">3. Subject Average Marks</h3>
                <p className="text-[11px] text-slate-500">Class mean score per subject</p>
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.subjectAvgMarksChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }} />
                  <Bar dataKey="averageMarks" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Avg Marks" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Grade Distribution */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">4. Grade Distribution</h3>
                <p className="text-[11px] text-slate-500">Total grades awarded across subjects</p>
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.gradeChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="grade" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={40} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Students" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 5: SGPA Distribution */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">5. SGPA Distribution Curve</h3>
                <p className="text-[11px] text-slate-500">Student grade point frequencies</p>
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.sgpaChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Students" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 6: Marks Distribution */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">6. Percentage Score Ranges</h3>
                <p className="text-[11px] text-slate-500">Overall score histogram</p>
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.marksChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="range" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }} />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Students" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/results"
            className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors flex items-center justify-between group"
          >
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Dynamic Results Table
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Explore individual marks across dynamically detected subject columns</p>
            </div>
          </Link>

          <Link
            href="/backlog"
            className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 transition-colors flex items-center justify-between group"
          >
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Backlog Management
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 transition-colors" />
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Track students needing carry-over papers, fail papers, and marks required</p>
            </div>
          </Link>

          <Link
            href="/subjects"
            className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors flex items-center justify-between group"
          >
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Subject Statistical Analysis
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Mean, median, standard deviation, and pass % for all examination papers</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
