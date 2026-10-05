import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { SidebarProvider } from '@/components/layout/sidebar-context';
import { Sidebar } from '@/components/layout/sidebar';
import { Footer } from '@/components/layout/footer';

export const metadata: Metadata = {
  title: 'University Result Analyzer - CCSU & Multi-University ERP',
  description: 'Automated student result collection, validation, subject analysis, backlog tracking, and multi-sheet Excel reporting.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
        <ThemeProvider>
          <SidebarProvider>
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen">
              <div className="flex-1">
                {children}
              </div>
              <Footer />
            </main>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
