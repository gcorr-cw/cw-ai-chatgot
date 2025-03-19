import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Paste to Markdown',
  description: 'Convert HTML to Markdown by pasting content',
  icons: {
    icon: '/markdown/favicon.ico',
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};
