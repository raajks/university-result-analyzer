'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSidebar } from './sidebar-context';
import {
  LayoutDashboard,
  Users,
  PlayCircle,
  TableProperties,
  BarChart3,
  GraduationCap,
  AlertTriangle,
  FileSpreadsheet,
  Building2,
  ScrollText,
  Settings,
  Sparkles,
  ChevronRight,
  X,
  LogOut
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/students', label: 'Students', icon: Users, badge: 'Master' },
  { href: '/collection', label: 'Result Collection', icon: PlayCircle, highlight: true },
  { href: '/results', label: 'Results Table', icon: TableProperties },
  { href: '/subjects', label: 'Subject Analysis', icon: BarChart3 },
  { href: '/student-analysis', label: 'Student Analysis', icon: GraduationCap },
  { href: '/backlog', label: 'Backlog Analysis', icon: AlertTriangle },
  { href: '/exports', label: 'Reports & Exports', icon: FileSpreadsheet },
  { href: '/settings/university', label: 'University Settings', icon: Building2 },
  { href: '/logs', label: 'Collection Logs', icon: ScrollText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function SidebarContent({ isMobile = false }: { isMobile?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { closeMobile } = useSidebar();
  const [userEmail, setUserEmail] = React.useState('rajkumarsharma705214@gmail.com');

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.email) setUserEmail(data.user.email);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    if (confirm('Log out of University Result Analyzer?')) {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col h-full w-full select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
        <Link
          href="/"
          onClick={() => { if (isMobile) closeMobile(); }}
          className="flex items-center gap-2.5"
        >
          <div className="w-9 h-9 rounded-lg bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white block leading-tight">
              Result Analyzer
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase">
              University ERP Edition
            </span>
          </div>
        </Link>

        {isMobile && (
          <button
            type="button"
            onClick={closeMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* University Active Profile Pill */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-950/40 shrink-0">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Active University</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            CCSU Meerut
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => { if (isMobile) closeMobile(); }}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-semibold shadow-xs'
                  : item.highlight
                  ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : item.highlight
                      ? 'text-indigo-500'
                      : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {item.badge}
                </span>
              )}

              {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
            </Link>
          );
        })}
      </nav>

      {/* User Session & Logout */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 shrink-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-200 truncate" title={userEmail}>
              {userEmail}
            </div>
            <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Verified Admin
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 transition-colors shrink-0 cursor-pointer"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Footer Compliance Notice */}
      <div className="px-4 py-2.5 border-t border-slate-800/80 text-[10px] text-slate-400 shrink-0">
        <div className="flex items-center gap-1.5 font-medium text-slate-300 mb-0.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
          Human CAPTCHA Control
        </div>
        <p className="text-[10px] leading-relaxed text-slate-500">
          Strict compliance with university portal terms.
        </p>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { isMobileOpen, closeMobile } = useSidebar();

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 h-screen sticky top-0 select-none z-30 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={closeMobile}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Mobile Off-Canvas Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col md:hidden transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Mobile Navigation"
      >
        <SidebarContent isMobile />
      </aside>
    </>
  );
}
