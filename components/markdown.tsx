import Link from 'next/link';
import React, { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './code-block';

// Helper function to detect inline code
const isInlineCode = (text: string) => {
  // Inline code won't have newlines and likely won't be very long
  return !text.includes('\n') && text.length < 100;
};

const components: Partial<Components> = {
  // Handle code blocks with proper detection of inline vs block code
  code: ({ node, className, children, ...props }: any) => {
    // Check if this is inline code based on content and context
    const content = String(children).replace(/\n$/, '');
    const isInline = !className && isInlineCode(content);
    
    return (
      <CodeBlock
        node={node}
        inline={isInline}
        className={className || ''}
        {...props}
      >
        {children}
      </CodeBlock>
    );
  },
  pre: ({ children }) => <>{children}</>,
  ol: ({ node, children, ...props }) => {
    return (
      <ol className="list-decimal list-outside ml-4" {...props}>
        {children}
      </ol>
    );
  },
  li: ({ node, children, ...props }) => {
    return (
      <li className="py-1" {...props}>
        {children}
      </li>
    );
  },
  ul: ({ node, children, ...props }) => {
    return (
      <ul className="list-disc list-outside ml-4" {...props}>
        {children}
      </ul>
    );
  },
  strong: ({ node, children, ...props }) => {
    return (
      <span className="font-semibold" {...props}>
        {children}
      </span>
    );
  },
  a: ({ node, children, ...props }) => {
    return (
      // @ts-expect-error
      <Link
        className="text-blue-500 hover:underline"
        target="_blank"
        rel="noreferrer"
        {...props}
      >
        {children}
      </Link>
    );
  },
  blockquote: ({ node, children, ...props }) => {
    // Process children to ensure paragraphs have proper spacing
    let processedChildren = React.Children.map(children, (child, index) => {
      // If it's a direct string or a non-paragraph element, wrap it in a paragraph
      if (typeof child === 'string' || (React.isValidElement(child) && child.type !== 'p')) {
        return <p key={index}>{child}</p>;
      }
      return child;
    });

    return (
      <blockquote className="blockquote pl-4 border-l-4 border-gray-300 dark:border-gray-600" {...props}>
        {processedChildren}
      </blockquote>
    );
  },
  h1: ({ node, children, ...props }) => {
    return (
      <h1 className="text-3xl font-semibold mt-6 mb-2" {...props}>
        {children}
      </h1>
    );
  },
  h2: ({ node, children, ...props }) => {
    return (
      <h2 className="text-2xl font-semibold mt-6 mb-2" {...props}>
        {children}
      </h2>
    );
  },
  h3: ({ node, children, ...props }) => {
    return (
      <h3 className="text-xl font-semibold mt-6 mb-2" {...props}>
        {children}
      </h3>
    );
  },
  h4: ({ node, children, ...props }) => {
    return (
      <h4 className="text-lg font-semibold mt-6 mb-2" {...props}>
        {children}
      </h4>
    );
  },
  h5: ({ node, children, ...props }) => {
    return (
      <h5 className="text-base font-semibold mt-6 mb-2" {...props}>
        {children}
      </h5>
    );
  },
  h6: ({ node, children, ...props }) => {
    return (
      <h6 className="text-sm font-semibold mt-6 mb-2" {...props}>
        {children}
      </h6>
    );
  },
  hr: () => <hr className="my-6 border-t border-gray-300 dark:border-gray-600" />,
};

const remarkPlugins = [remarkGfm];

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  return (
    <div className="markdown-content not-prose">
      <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);
