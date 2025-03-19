'use client';

import { useEffect, useState, useRef } from 'react';
import Script from 'next/script';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { CopyIcon } from '@/components/icons';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Markdown } from '@/components/markdown';
import { UserNavWrapper } from '@/components/user-nav-wrapper';
import { useSession } from 'next-auth/react';
import { X, Clipboard } from 'lucide-react';

// Add typings for the window methods from our markdown scripts
declare global {
  interface Window {
    toMarkdown: any;
    convert: (html: string) => string;
  }
}

// Sample for testing code blocks
const sampleMarkdown = `
## Code Blocks Example

\`\`\`javascript
import OpenAI from "openai";
const openai = new OpenAI();
const embedding = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: "Your text string goes here",
  encoding_format: "float",
});
console.log(embedding);
\`\`\`

Inline code: \`const x = 10;\`

HTML example:

\`\`\`html
<div style="color: red;">This is red text using HTML.</div>
\`\`\`
`;

interface MarkdownConverterProps {}

export default function MarkdownConverter({}: MarkdownConverterProps) {
  const [markdown, setMarkdown] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [showInputInstructions, setShowInputInstructions] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [standardPasteEnabled, setStandardPasteEnabled] = useState(false);
  const { theme } = useTheme();
  const pastebinRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const { data: session } = useSession();
  const isPastingRef = useRef(false);

  // Function to handle markdown changes in the textarea
  const handleMarkdownChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMarkdown(e.target.value);
  };

  // Function to copy markdown to clipboard
  const copyMarkdown = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(markdown);
    }
  };

  // Function to clear the markdown content
  const clearMarkdown = () => {
    setMarkdown('');
    setShowInputInstructions(true);
  };

  // Function to paste from clipboard
  const pasteFromClipboard = async () => {
    // Hide instructions when pasting
    setShowInputInstructions(false);
    
    // If standard paste is enabled, just get text and paste it directly
    if (standardPasteEnabled) {
      try {
        const text = await navigator.clipboard.readText();
        setMarkdown(text);
      } catch (err) {
        console.error('Failed to read clipboard contents:', err);
      }
      return;
    }
    
    // For paste-to-markdown, we need to manually get HTML from clipboard
    // and trigger the conversion process
    try {
      // Try to get HTML content from clipboard
      const clipboardItems = await navigator.clipboard.read();
      
      for (const item of clipboardItems) {
        // Check if HTML format is available
        if (item.types.includes('text/html')) {
          const blob = await item.getType('text/html');
          const html = await blob.text();
          
          // Put the HTML into the pastebin
          if (pastebinRef.current) {
            pastebinRef.current.innerHTML = html;
            
            // Manually trigger the handleRichTextPaste function
            // which will convert the HTML to markdown
            setTimeout(() => {
              if (window.toMarkdown && pastebinRef.current) {
                const html = pastebinRef.current.innerHTML;
                const markdown = window.convert(html);
                setShowInputInstructions(false);
                setMarkdown(markdown);
              }
            }, 0);
            
            return;
          }
        }
      }
      
      // Fallback to plain text if HTML is not available
      const text = await navigator.clipboard.readText();
      setMarkdown(text);
      
    } catch (error) {
      console.error('Error accessing clipboard:', error);
      
      // Fallback to the original paste method
      if (pastebinRef.current) {
        pastebinRef.current.innerHTML = '';
        pastebinRef.current.focus();
        document.execCommand('paste');
      }
    }
  };

  // Handle focus on textarea to hide instructions
  const handleTextareaFocus = () => {
    setShowInputInstructions(false);
  };

  // Handle paste to maintain scroll position at top and hide instructions
  const handleTextareaPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Hide instructions when pasting
    setShowInputInstructions(false);
    
    // If standard paste is enabled, let the default paste behavior happen
    if (standardPasteEnabled) {
      return;
    }
    
    // Otherwise prevent default and let the pastebin handle it
    e.preventDefault();
    
    // Clear the pastebin and focus it to receive the paste event
    if (pastebinRef.current) {
      pastebinRef.current.innerHTML = '';
      pastebinRef.current.focus();
      
      // Trigger a paste event programmatically
      document.execCommand('paste');
    }
  };

  // Function to handle rich text paste and convert to markdown
  const handleRichTextPaste = () => {
    // Only process if standard paste is NOT enabled
    if (standardPasteEnabled) return;
    
    setTimeout(() => {
      if (window.toMarkdown && pastebinRef.current) {
        const html = pastebinRef.current.innerHTML;
        const markdown = (window as any).convert(html);
        setShowInputInstructions(false);
        setMarkdown(markdown);
        
        // Scroll to top after paste
        if (outputRef.current) {
          outputRef.current.scrollTop = 0;
        }
      }
    }, 200);
  };

  // Set up event handlers for paste events
  useEffect(() => {
    // Function to handle paste events
    const handlePasteEvent = (e: ClipboardEvent) => {
      // Skip processing if standard paste is enabled
      if (standardPasteEnabled) return;
      
      // When content is pasted, we need to ensure the textarea scrolls to top
      if (outputRef.current) {
        // Use a slightly longer timeout to ensure the scroll happens after the paste is processed
        setTimeout(() => {
          if (outputRef.current) {
            outputRef.current.scrollTop = 0;
          }
        }, 100);
      }
    };

    // Add event listeners
    window.addEventListener('paste', handlePasteEvent);
    
    // Set up the pastebin event listener only when standard paste is NOT enabled
    const pastebinElement = pastebinRef.current;
    if (pastebinElement) {
      pastebinElement.addEventListener('paste', handleRichTextPaste);
    }
    
    return () => {
      window.removeEventListener('paste', handlePasteEvent);
      if (pastebinElement) {
        pastebinElement.removeEventListener('paste', handleRichTextPaste);
      }
    };
  }, [standardPasteEnabled]);

  // Set up the clipboard-to-markdown conversion
  useEffect(() => {
    // Set up the clipboard-to-markdown conversion
    if (window && !window.toMarkdown && typeof window.toMarkdown !== 'function') {
      window.toMarkdown = window.toMarkdown || {};
      window.convert = (html: string) => {
        return window.toMarkdown.convert(html);
      };
    }
  }, []);

  // Set mounted to true once the component has mounted on the client side
  useEffect(() => {
    setMounted(true);
    
    // For testing purposes, uncomment to show sample markdown
    // setMarkdown(sampleMarkdown);
    // setShowInstructions(false);
  }, []);

  useEffect(() => {
    // Initialize event listeners after the component is mounted
    const pastebin = pastebinRef.current;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only intercept keyboard shortcuts if standard paste is NOT enabled
      if (standardPasteEnabled) return;
      
      if (event.ctrlKey || event.metaKey) {
        if (String.fromCharCode(event.which).toLowerCase() === 'v') {
          if (pastebin) {
            pastebin.innerHTML = '';
            pastebin.focus();
            setShowInstructions(false);
          }
        }
      }
    };

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);

    // Clean up event listeners
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [standardPasteEnabled]);

  // Custom function to process markdown and add line numbers to code blocks
  const processMarkdownWithLineNumbers = (content: string) => {
    // Basic processing to add line numbers to code blocks
    return content.replace(/```(.+?)\n([\s\S]+?)```/g, (match: string, language: string, code: string) => {
      const lines = code.trim().split('\n');
      const numberedLines = lines.map((line: string, index: number) => 
        `<span class="code-line" data-line-number="${index + 1}">${line}</span>`
      ).join('\n');
      
      return `\`\`\`${language}\n${numberedLines}\n\`\`\``;
    });
  };

  // Auto-resize textarea based on content
  useEffect(() => {
    const resizeTextarea = () => {
      if (outputRef.current) {
        // Reset height to auto to get the correct scrollHeight
        outputRef.current.style.height = 'auto';
        // Set the height to scrollHeight to expand the textarea
        outputRef.current.style.height = `${outputRef.current.scrollHeight}px`;
      }
    };
    
    // Call resize when markdown changes
    if (markdown) {
      resizeTextarea();
    }
  }, [markdown]);

  return (
    <>
      <Script src="/markdown/to-markdown.js" strategy="beforeInteractive" />
      <Script src="/markdown/clipboard2markdown.js" strategy="afterInteractive" />
      
      <div className="w-full min-h-screen px-4 py-4 relative">
        {mounted && (
          <div className="absolute top-4 right-4">
            <UserNavWrapper user={session?.user} />
          </div>
        )}
        
        <div className="flex items-center justify-center mb-4 pt-2">
          {mounted && (
            <div className="w-10 h-10 mr-3">
              <img 
                src={theme === 'dark' ? '/markdown/background-dark.svg' : '/markdown/background.svg'} 
                alt="Markdown icon" 
                width={40} 
                height={40}
              />
            </div>
          )}
          <h1 className="text-3xl font-bold">Markdown Utility</h1>
        </div>
        
        <section id="info" className={`my-4 ${showInstructions ? '' : 'hidden'}`}>
          <h2 className="text-3xl font-bold mb-4">Paste to Markdown</h2>
          <h3 className="text-xl mb-4 italic">Instructions</h3>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>Find the text to convert to Markdown (<i>e.g.</i>, in another browser tab)</li>
            <li>Copy it to the clipboard (<code className="bg-zinc-100 dark:bg-zinc-800 py-0.5 px-1 rounded-md text-sm">Ctrl+C</code>)</li>
            <li>Paste it into this window (<code className="bg-zinc-100 dark:bg-zinc-800 py-0.5 px-1 rounded-md text-sm">Ctrl+V</code>)</li>
            <li>The converted Markdown will appear!</li>
          </ol>
          <p className="text-muted-foreground">
            The conversion is carried out by <a href="https://github.com/domchristie/to-markdown" className="text-blue-600 dark:text-blue-400 hover:underline">to-markdown</a>, a Markdown converter written in JavaScript and running locally in the browser.
          </p>
        </section>
        
        <div 
          contentEditable="true" 
          id="pastebin" 
          ref={pastebinRef} 
          className="opacity-[0.01] w-full h-px overflow-hidden"
        ></div>
        
        <section className="h-[calc(100vh-120px)] mt-4" id="wrapper">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            <div className="border border-border rounded-md h-full flex flex-col shadow-sm">
              <div className="border-b border-border px-4 py-2 font-medium bg-muted/20">
                <div className="grid grid-cols-3 items-center w-full">
                  <div className="flex justify-start">
                    <span>Paste-to-Markdown</span>
                  </div>
                  
                  <div className="flex justify-center items-center">
                    <div className="flex items-center gap-2" title={standardPasteEnabled ? "Disable standard paste" : "Enable standard paste"}>
                      <Switch
                        id="standard-paste"
                        checked={standardPasteEnabled}
                        onCheckedChange={setStandardPasteEnabled}
                        size="sm"
                        className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-600"
                      />
                      <Label 
                        htmlFor="standard-paste" 
                        className="text-xs cursor-pointer"
                        onClick={() => setStandardPasteEnabled(!standardPasteEnabled)}
                      >
                        <span className="text-xs">Standard Paste</span>
                      </Label>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearMarkdown}
                        className="h-7 text-xs"
                        title="Clear content"
                      >
                        <X size={16} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={pasteFromClipboard}
                        className="h-7 text-xs"
                        title="Paste from clipboard"
                      >
                        <Clipboard size={16} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyMarkdown}
                        className="h-7 text-xs"
                        title="Copy to clipboard"
                      >
                        <CopyIcon size={18} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative flex-grow">
                {showInputInstructions && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center p-6 bg-background/90 z-10 cursor-text"
                    onClick={handleTextareaFocus}
                  >
                    <div className="text-center max-w-md">
                      <h2 className="text-lg font-bold mb-4">Options:</h2>
                      <ol className="text-left space-y-4 mb-6">
                        <li>
                          <strong>Paste to Markdown:</strong>
                          <p className="text-muted-foreground">Paste content from documents or web pages to have it converted to Markdown.</p>
                        </li>
                        <li>
                          <strong>Edit Markdown:</strong> 
                          <p className="text-muted-foreground">Enter and edit Markdown here and see it rendered in the Preview pane.</p>
                        </li>
                      </ol>
                      <p className="text-sm text-muted-foreground">Click anywhere to begin</p>
                    </div>
                  </div>
                )}
                <textarea
                  value={markdown}
                  onChange={handleMarkdownChange}
                  onClick={handleTextareaFocus}
                  onFocus={handleTextareaFocus}
                  onPaste={handleTextareaPaste}
                  className="w-full h-full p-4 font-mono text-sm resize-none focus:outline-none bg-background"
                  placeholder="Type or paste Markdown here..."
                  ref={outputRef}
                ></textarea>
              </div>
            </div>
            
            <div className="border border-border rounded-md h-full flex flex-col shadow-sm">
              <div className="border-b border-border px-4 py-2 font-medium bg-muted/20">
                Preview
              </div>
              <div className="p-4 flex-1 overflow-auto">
                <div className="not-prose">
                  <Markdown>{processMarkdownWithLineNumbers(markdown)}</Markdown>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Add custom CSS to handle textarea expansion */}
      <style jsx global>{`
        /* Base styling for code blocks */
        .not-prose pre {
          background-color: #18181b !important;
          color: #e4e4e7 !important;
          border: 1px solid #3f3f46 !important;
          border-radius: 0.75rem !important;
          padding: 1rem !important;
          margin-bottom: 1.5rem !important;
          overflow-x: auto !important;
          position: relative !important;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
          font-size: 0.875rem !important;
          line-height: 1.5 !important;
          display: block !important;
        }
        
        /* Code content styling */
        .not-prose pre code {
          counter-reset: line;
          display: grid;
          padding: 0 !important;
          background-color: transparent !important;
          border-radius: 0 !important;
          white-space: pre !important;
          color: inherit !important;
        }
        
        /* Create line numbers for each line */
        .not-prose pre code > span,
        .not-prose pre code > div {
          position: relative;
          padding-left: 1.5rem !important;
          counter-increment: line;
          min-height: 1.5rem;
        }
        
        /* Line number styling */
        .not-prose pre code > span::before,
        .not-prose pre code > div::before {
          content: counter(line);
          position: absolute;
          left: 0;
          top: 0;
          width: 1rem;
          color: #71717a;
          text-align: right;
          user-select: none;
        }
        
        /* Styling for inline code */
        .not-prose :not(pre) > code {
          background-color: #27272a;
          color: #e4e4e7;
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 0.85em;
          white-space: normal;
        }
      `}</style>
    </>
  );
}
