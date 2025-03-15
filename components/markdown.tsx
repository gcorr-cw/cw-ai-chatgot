import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { CodeBlock } from './code-block';

// Create a wrapper for CodeBlock that matches ReactMarkdown's expected interface
const CodeBlockWrapper = (props: any) => {
  const { children, className, node, ...rest } = props;
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  
  return (
    <CodeBlock
      node={node}
      inline={!className}
      className={className || ''}
      {...rest}
    >
      {children}
    </CodeBlock>
  );
};

// Custom horizontal rule component with bottom margin
const HorizontalRule = () => {
  return <hr className="my-6" />;
};

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, href, children, ...props }) => (
            <Link
              href={href || '#'}
              target="_blank"
              rel="noreferrer"
              {...props}
            >
              {children}
            </Link>
          ),
          code: CodeBlockWrapper,
          hr: HorizontalRule
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);
