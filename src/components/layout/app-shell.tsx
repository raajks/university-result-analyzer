'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { SidebarProvider } from '@/components/layout/sidebar-context';
import { Sidebar } from '@/components/layout/sidebar';
import { Footer } from '@/components/layout/footer';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <main className="min-h-screen w-full bg-slate-950 text-slate-100">{children}</main>;
  }

  return (
    <SidebarProvider>
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen bg-slate-950 text-slate-100">
        <div className="flex-1">{children}</div>
        <Footer />
      </main>
    </SidebarProvider>
  );
}
