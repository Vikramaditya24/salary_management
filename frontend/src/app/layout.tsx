import type { Metadata } from 'next';

import { AuthProvider } from '@/components/auth/auth-provider';
import { ToastProvider } from '@/components/toast-provider';
import './globals.css';

// Deliberately not using next/font/google here: it requires a network
// fetch to fonts.googleapis.com at build time, which is an unnecessary
// external dependency for an internal HR tool. Using
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
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
