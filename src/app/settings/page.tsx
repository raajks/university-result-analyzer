'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import {
  ShieldCheck,
  Database,
  Mail,
  Lock,
  CheckCircle2,
  KeyRound,
  Moon
} from 'lucide-react';

export default function SettingsPage() {
  const [adminEmail, setAdminEmail] = useState('rajkumarsharma705214@gmail.com');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.email) {
          setAdminEmail(data.user.email);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="System & Security Settings"
        subtitle="Manage administrator access, authentication policies, and database diagnostics."
      />

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto w-full">
        {/* Administrator & Security Profile */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Administrator Authentication & Access Control
              </h3>
              <p className="text-xs text-slate-400">
                Protected by One-Time Password (OTP) verification sent to authorized administrator email.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                Primary Admin Email
              </span>
              <div className="text-sm font-bold text-white font-mono">
                {adminEmail}
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                <CheckCircle2 className="w-3 h-3" /> Authorized & Verified
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                Authentication Method
              </span>
              <div className="text-sm font-bold text-white">
                Email OTP Verification (6 Digits)
              </div>
              <span className="text-[11px] text-slate-400">
                Valid for 10 minutes per request
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-200 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-indigo-300">
              <Lock className="w-4 h-4 text-indigo-400" />
              Route Protection Active
            </div>
            <p className="text-indigo-300/80 leading-relaxed">
              All routes, student records, mark sheets, and scrapers are strictly guarded. Any unauthorized visitor is automatically redirected to the login verification gate.
            </p>
          </div>
        </div>

        {/* Database & Runtime Information */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Database & Runtime Diagnostics
              </h3>
              <p className="text-xs text-slate-400">
                Prisma ORM connected with full relational integrity
              </p>
            </div>
          </div>

          <div className="space-y-2 font-mono text-[11px] text-slate-400">
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span>Environment</span>
              <span className="font-bold text-slate-200">Production-Ready (Secured)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span>ORM Provider</span>
              <span className="font-bold text-indigo-400">Prisma Client v6 (SQLite / PostgreSQL)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span>Automation Engine</span>
              <span className="font-bold text-slate-200">Playwright Headful + Zero-Network Mock</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span>Theme Mode</span>
              <span className="font-bold text-indigo-300 inline-flex items-center gap-1">
                <Moon className="w-3 h-3" /> Permanent Dark Theme
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span>CAPTCHA Policy</span>
              <span className="font-bold text-emerald-400">Strict Human-in-the-Loop Enforced</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
