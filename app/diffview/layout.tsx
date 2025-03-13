import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Text Comparison',
  description: 'Compare two versions of text and see the differences',
};

export default function DiffViewLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}