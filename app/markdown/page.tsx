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
import { X, Clipboard, Link, Link2Off } from 'lucide-react';

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
  const [markdown, setMarkdown] = useState<string>('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [showInputInstructions, setShowInputInstructions] = useState(true);
  const [standardPasteEnabled, setStandardPasteEnabled] = useState(false);
  const [syncScrolling, setSyncScrolling] = useState(true); // Default to synchronized scrolling
  const [mounted, setMounted] = useState(false);
  const [leftPaneWidth, setLeftPaneWidth] = useState(50); // percentage width of left pane
  const [isDragging, setIsDragging] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false); // To prevent infinite scroll loops
  const [isNearCenter, setIsNearCenter] = useState(false); // Track if handle is near center for snapping
  
  const { theme } = useTheme();
  const { data: session } = useSession();
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const pastebinRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null); // Reference to the preview pane for scrolling
  const isPastingRef = useRef<boolean>(false);
  const wrapperRef = useRef<HTMLElement>(null);
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    // Add event listener for mousemove and mouseup for resizing
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !wrapperRef.current) return;
      
      // Prevent text selection during resize
      e.preventDefault();
      
      const wrapperRect = wrapperRef.current.getBoundingClientRect();
      const containerWidth = wrapperRect.width;
      const newPosition = e.clientX - wrapperRect.left;
      const centerPosition = containerWidth / 2;
      
      // Calculate the new width percentage
      let newLeftPaneWidth = Math.max(20, Math.min(80, (newPosition / containerWidth) * 100));
      
      // Check if we're near center for snapping (within 40px)
      const nearCenter = Math.abs(newPosition - centerPosition) < 40;
      setIsNearCenter(nearCenter);
      
      // Snap to center when within 40px of the center
      if (nearCenter) {
        newLeftPaneWidth = 50;
      }
      
      // Update state with the new width
      setLeftPaneWidth(newLeftPaneWidth);
      
      // Apply the new widths directly to the panes
      if (leftPaneRef.current && rightPaneRef.current) {
        leftPaneRef.current.style.width = `${newLeftPaneWidth}%`;
        rightPaneRef.current.style.width = `${100 - newLeftPaneWidth}%`;
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setIsNearCenter(false); // Reset near center state when done dragging
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Add effect to disable text selection when dragging
  useEffect(() => {
    const handleSelectStart = (e: Event) => {
      if (isDragging) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('selectstart', handleSelectStart);
    
    return () => {
      document.removeEventListener('selectstart', handleSelectStart);
    };
  }, [isDragging]);

  // Synchronized scrolling between editor and preview
  useEffect(() => {
    if (!syncScrolling || !outputRef.current || !previewRef.current) return;

    const handleEditorScroll = () => {
      if (isScrolling || !syncScrolling) return;
      
      const editor = outputRef.current;
      const preview = previewRef.current;
      
      if (editor && preview) {
        // Calculate relative scroll position
        const editorScrollRatio = editor.scrollTop / (editor.scrollHeight - editor.clientHeight || 1);
        
        // Set the preview scroll position
        setIsScrolling(true);
        preview.scrollTop = editorScrollRatio * (preview.scrollHeight - preview.clientHeight || 1);
        
        // Reset the scrolling flag after a short delay
        setTimeout(() => setIsScrolling(false), 50);
      }
    };
    
    const handlePreviewScroll = () => {
      if (isScrolling || !syncScrolling) return;
      
      const editor = outputRef.current;
      const preview = previewRef.current;
      
      if (editor && preview) {
        // Calculate relative scroll position
        const previewScrollRatio = preview.scrollTop / (preview.scrollHeight - preview.clientHeight || 1);
        
        // Set the editor scroll position
        setIsScrolling(true);
        editor.scrollTop = previewScrollRatio * (editor.scrollHeight - editor.clientHeight || 1);
        
        // Reset the scrolling flag after a short delay
        setTimeout(() => setIsScrolling(false), 50);
      }
    };
    
    // Add scroll event listeners
    const editor = outputRef.current;
    const preview = previewRef.current;
    
    if (editor && preview) {
      editor.addEventListener('scroll', handleEditorScroll);
      preview.addEventListener('scroll', handlePreviewScroll);
    }
    
    return () => {
      if (editor && preview) {
        editor.removeEventListener('scroll', handleEditorScroll);
        preview.removeEventListener('scroll', handlePreviewScroll);
      }
    };
  }, [syncScrolling, isScrolling]);

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
      
      <div className="w-full min-h-screen px-4 py-4 relative overflow-x-hidden">
        <div className="flex items-center justify-center mb-4 pt-2 relative">
          {mounted && (
            <div className="absolute right-[16px] -top-1">
              <UserNavWrapper user={session?.user} />
            </div>
          )}
          
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
          <h1 className="text-3xl font-bold translate-y-1">Markdown Utility</h1>
        </div>
            
        <div 
          contentEditable="true" 
          id="pastebin" 
          ref={pastebinRef} 
          className="opacity-[0.01] w-full h-px overflow-hidden absolute"
          style={{ position: 'absolute', zIndex: -1 }}
        ></div>
        
        <section 
          className="flex h-[calc(100vh-120px)] mt-4 relative overflow-hidden" 
          id="wrapper" 
          ref={wrapperRef}
        >
          <div 
            className="border border-border rounded-md h-full flex flex-col shadow-sm overflow-hidden"
            style={{ width: `${leftPaneWidth}%` }}
            ref={leftPaneRef}
          >
            <div className="border-b border-border px-4 py-2.5 font-medium bg-muted/50">
              <div className="grid grid-cols-3 items-center w-full">
                <div className="flex justify-start">
                  <span>Paste-to-Markdown</span>
                </div>
                
                <div className="flex justify-center items-center">
                  <div className="flex items-center gap-2" title={standardPasteEnabled ? "Disable standard paste to use Paste-to-Markdown converter" : "Enable standard paste to use clipboard while editing Markdown"}>
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
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearMarkdown}
                      className="h-7 w-7 p-0 text-xs"
                      title="Clear content"
                    >
                      <X size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={pasteFromClipboard}
                      className="h-7 w-7 p-0 text-xs"
                      title="Paste from clipboard"
                    >
                      <Clipboard size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyMarkdown}
                      className="h-7 w-7 p-0 text-xs"
                      title="Copy to clipboard"
                    >
                      <CopyIcon size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative flex-grow overflow-auto">
              {showInputInstructions && (
                <div 
                  className="absolute inset-0 flex items-top justify-center p-6 bg-background/90 z-10 cursor-text"
                  onClick={handleTextareaFocus}
                >
                  <div className="text-center max-w-md">
                    <br />
                    <br />
                    <h2 className="text-lg font-bold mb-4">Options:</h2>
                    <ol className="text-left space-y-4 mb-6">
                      <li>
                        <strong>Paste to Markdown:</strong>
                        <p className="text-muted-foreground">Converts text from documents or web pages into Markdown.</p>
                      </li>
                      <li>
                        <strong>Edit Markdown:</strong> 
                        <p className="text-muted-foreground">Edit Markdown and view the rendered output.</p>
                      </li>
                    </ol>
                    <p className="text-sm text-muted-foreground"></p>
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
                style={{ 
                  minHeight: '100%',
                  border: 'none',
                  outline: 'none'
                }}
              ></textarea>
            </div>
          </div>
          
          {/* Resizable handle */}
          <div 
            className="flex items-center justify-center mx-3 z-10" 
            style={{ userSelect: 'none' }}
          >
            <div 
              className={`cursor-col-resize h-8 flex items-center justify-center relative ${isNearCenter ? 'snap-indicator' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              style={{ userSelect: 'none' }}
            >
              <div className="flex space-x-1">
                <div className="h-6 w-0.5 bg-muted-foreground/40"></div>
                <div className="h-6 w-0.5 bg-muted-foreground/40"></div>
              </div>
              
              {/* Center snap indicator */}
              {isNearCenter && (
                <div className="absolute -top-6 whitespace-nowrap text-xs px-2 py-1 bg-background border border-border rounded-md shadow-sm">
                  Snap to center
                </div>
              )}
            </div>
          </div>
          
          <div 
            className="border border-border rounded-md h-full flex flex-col shadow-sm overflow-hidden"
            style={{ width: `${100 - leftPaneWidth}%` }}
            ref={rightPaneRef}
          >
            <div className="border-b border-border px-4 py-3 font-medium bg-muted/50 flex justify-between items-center">
              <span>Preview</span>
              <div className="flex items-center gap-2" title={syncScrolling ? "Disable synchronized scrolling" : "Enable synchronized scrolling"}>
                <Switch
                  id="sync-scrolling"
                  checked={syncScrolling}
                  onCheckedChange={setSyncScrolling}
                  size="sm"
                  className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-600"
                />
                <Label 
                  htmlFor="sync-scrolling" 
                  className="text-xs cursor-pointer flex items-center gap-1"
                  onClick={() => setSyncScrolling(!syncScrolling)}
                >
                  {syncScrolling ? (
                    <>
                      <Link size={12} />
                      <span className="text-xs">Linked Scroll</span>
                    </>
                  ) : (
                    <>
                      <Link2Off size={12} />
                      <span className="text-xs">Independent Scroll</span>
                    </>
                  )}
                </Label>
              </div>
            </div>
            <div className="p-4 overflow-auto h-full" ref={previewRef}>
              <div className="not-prose">
                <Markdown>{markdown}</Markdown>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Add custom CSS to handle textarea expansion */}
      <style jsx global>{`
        /* Base styling for code blocks */
        .not-prose pre {
          margin-bottom: 1.5rem !important;
          overflow-x: auto !important;
          position: relative !important;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
          line-height: 1.5 !important;
          display: block !important;
        }
        
        /* Remove double borders from syntax highlighter in markdown utility only */
        .not-prose > div > div.w-full.overflow-hidden {
          border: none !important;
          box-shadow: none !important;
        }
        
        /* Ensure the syntax highlighter container fits properly */
        .not-prose pre > div {
          margin: 0 !important;
          border-radius: 0.75rem !important;
        }
        
        /* Code content styling */
        .not-prose pre code {
          padding: 0 !important;
          background-color: transparent !important;
          border-radius: 0 !important;
          white-space: pre !important;
          color: inherit !important;
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

        /* Fix for scrollbar issues */
        html, body {
          overflow-x: hidden;
          max-width: 100vw;
        }

        /* Ensure containers don't show unwanted scrollbars */
        .overflow-hidden {
          overflow: hidden !important;
        }
        
        /* Fix for editor container */
        .flex-grow.overflow-auto {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        /* Ensure textarea fills container and shows scrollbar */
        textarea {
          flex: 1;
          overflow: auto;
        }
        
        /* Snap indicator styling */
        .snap-indicator .h-6 {
          background-color: #3b82f6 !important; /* Blue color for the handle lines when near center */
          height: 24px !important; /* Make the lines slightly taller */
          transition: all 0.15s ease;
        }
      `}</style>
    </>
  );
}
