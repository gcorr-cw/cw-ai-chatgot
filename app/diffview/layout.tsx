'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { SessionProvider } from 'next-auth/react';

export default function DiffViewLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="antialiased">
      <SessionProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </SessionProvider>
    </div>
  );
}