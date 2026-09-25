import type { Metadata } from 'next';

import { MainNav } from '@/components/main-nav';
import { ToastProvider } from '@/components/toast-provider';
import './globals.css';

// Deliberately not using next/font/google here: it requires a network
// fetch to fonts.googleapis.com at build time, which is an unnecessary
// external dependency for an internal HR tool's placeholder shell. Using
// the system font stack (via Tailwind's default `font-sans`) instead keeps
// the build fully offline-capable; a real font can be added later with
// next/font/local if desired.

export const metadata: Metadata = {
  title: 'ACME Salary Management',
  description: 'Internal HR tool for managing employee salary data.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <ToastProvider>
          <header className="border-b border-border">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
              <span className="font-semibold">ACME Salary Management</span>
              <MainNav />
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
