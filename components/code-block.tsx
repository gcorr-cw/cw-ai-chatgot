'use client';
import { useCallback, useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism, tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  node: any;
  inline: boolean;
  className: string;
  children: any;
}

export function CodeBlock({
  node,
  inline,
  className,
  children,
  ...props
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Parse language from className (format: language-xxx)
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  // Check for dark mode and handle mounting
  useEffect(() => {
    setMounted(true);
    // Initial check
    setIsDarkMode(document.documentElement.classList.contains('dark'));
    
    // Set up observer for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.attributeName === 'class' &&
          mutation.target === document.documentElement
        ) {
          setIsDarkMode(document.documentElement.classList.contains('dark'));
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    
    return () => observer.disconnect();
  }, []);

  const handleCopy = useCallback(() => {
    const code = String(children).replace(/\n$/, '');
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  // Get the background color from CSS variables
  const getBackgroundColor = () => {
    if (typeof window === 'undefined') return 'transparent';
    
    const style = getComputedStyle(document.documentElement);
    return isDarkMode 
      ? style.getPropertyValue('--sidebar-background').trim() 
      : style.getPropertyValue('--sidebar-background').trim();
  };

  if (!inline) {
    return (
      <div className="not-prose flex flex-col relative group mb-6">
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 z-10"
          aria-label="Copy code"
        >
          {copied ? (
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="text-green-500"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="text-zinc-500 dark:text-zinc-400"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
        <div className="w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
          {mounted ? (
            <SyntaxHighlighter
              {...props}
              language={language}
              style={isDarkMode ? tomorrow : prism}
              customStyle={{
                margin: 0,
                padding: '1rem',
                fontSize: '0.875rem',
                backgroundColor: isDarkMode ? 'hsl(0 0% 10%)' : 'hsl(0 0% 98%)',
                borderRadius: 0,
              }}
              wrapLines={true}
              wrapLongLines={true}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <pre
              className="text-sm w-full overflow-x-auto p-4 border border-zinc-200 dark:border-zinc-700 rounded-xl dark:text-zinc-50 text-zinc-900"
              style={{ 
                backgroundColor: isDarkMode ? 'hsl(0 0% 10%)' : 'hsl(0 0% 98%)',
              }}
            >
              <code className="whitespace-pre-wrap break-words">{children}</code>
            </pre>
          )}
        </div>
      </div>
    );
  } else {
    return (
      <code
        className={`${className} text-sm bg-zinc-100 dark:bg-zinc-800 py-0.5 px-1 rounded-md whitespace-normal break-words inline-block`}
        {...props}
      >
        {children}
      </code>
    );
  }
}
