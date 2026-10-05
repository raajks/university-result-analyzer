'use client';

import React, { useState } from 'react';
import { Header } from '@/components/layout/header';
import {
  Building2,
  ShieldCheck,
  Globe,
  Settings2,
  CheckCircle2,
  Code2,
  BookOpen,
  ExternalLink
} from 'lucide-react';
import { CCSU_CONFIG } from '@/universities/ccsu/ccsu.config';

export default function UniversitySettingsPage() {
  const [portalUrl, setPortalUrl] = useState(CCSU_CONFIG.portalUrl);
  const [timeoutMs, setTimeoutMs] = useState(45000);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="University Adapter Settings"
        subtitle="Manage endpoint configurations, marksheet types, and view multi-university adapter registry."
      />

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
        {saved && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>CCSU Adapter settings saved successfully!</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active CCSU Configuration Form */}
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Chaudhary Charan Singh University (CCSU)
                </h3>
                <p className="text-xs text-slate-500">
                  Adapter Key: <code className="text-indigo-600 font-mono">ccsu</code>
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Official Result Portal URL
                </label>
                <input
                  type="url"
                  value={portalUrl}
                  onChange={e => setPortalUrl(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Primary target: <a href="https://result.ccsuniversityweb.in/" target="_blank" className="underline text-indigo-600 inline-flex items-center gap-0.5">result.ccsuniversityweb.in <ExternalLink className="w-2.5 h-2.5" /></a>
                </p>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Portal Navigation Timeout (ms)
                </label>
                <input
                  type="number"
                  value={timeoutMs}
                  onChange={e => setTimeoutMs(parseInt(e.target.value))}
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                  Configured Marksheet Types:
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-500 text-[11px]">
                  {CCSU_CONFIG.marksheetTypes.map(t => (
                    <li key={t.id}>
                      <strong className="text-slate-700 dark:text-slate-300">{t.label}</strong> (Value: <code className="text-indigo-600">{t.value}</code>)
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">Pause for CAPTCHA</span>
                  <span className="text-[11px] text-slate-500">Always mandatory for compliance</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                  Enforced (True)
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm"
              >
                Save Settings
              </button>
            </div>
          </form>

          {/* Extensibility & AKTU Documentation Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Adding Subsequent Universities (e.g. AKTU)
                </h3>
                <p className="text-xs text-slate-500">
                  Decoupled UniversityResultAdapter Interface Architecture
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <p>
                The system is architected to support multiple universities without modifying the database or dashboard code.
              </p>

              <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-[11px] space-y-1">
                <div className="text-slate-400">{'// To add Dr. A.P.J. Abdul Kalam Technical University:'}</div>
                <div>1. Create <span className="text-amber-300">src/universities/aktu/aktu.adapter.ts</span></div>
                <div>2. Implement <span className="text-cyan-300">UniversityResultAdapter</span></div>
                <div>3. Register in <span className="text-emerald-300">src/universities/registry.ts</span></div>
              </div>

              <p>
                The adapter template for <strong>AKTU (Dr. A.P.J. Abdul Kalam Technical University, Lucknow)</strong> is already scaffolded and registered in <code className="text-indigo-600 font-mono">src/universities/aktu/aktu.adapter.ts</code>.
              </p>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Registered University Adapters:</span>
                  <span className="text-[11px] text-slate-400">1. CCSU Meerut (Active) | 2. AKTU Lucknow (Scaffolded)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
