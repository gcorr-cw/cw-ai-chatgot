export const metadata = {
  title: 'Paste to Markdown',
  description: 'Convert HTML to Markdown by pasting content',
  icons: {
    icon: '/markdown/favicon.ico',
  }
};

export default function MarkdownLayout({ children }) {
  return (
    <div className="markdown-container">
      {children}
    </div>
  );
}
