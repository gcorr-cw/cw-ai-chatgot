'use client';

import React, { useState, useEffect } from 'react';
import { DiffView } from '@/components/diffview';
import { UserNavWrapper } from '@/components/user-nav-wrapper';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { X, GitCompare, Clipboard, Copy, ArrowLeftRight, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function TextComparisonPage() {
  const [originalText, setOriginalText] = useState('');
  const [modifiedText, setModifiedText] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const [textsMatch, setTextsMatch] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();
  
  // Reset showDiff when either text changes
  useEffect(() => {
    setShowDiff(false);
    setTextsMatch(false);
  }, [originalText, modifiedText]);

  // Set mounted to true once the component has mounted on the client side
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCompare = () => {
    setShowDiff(true);
    setTextsMatch(originalText === modifiedText);
  };

  const handleReset = () => {
    setOriginalText('');
    setModifiedText('');
    setShowDiff(false);
  };

  // Function to swap original and modified text
  const handleSwap = () => {
    const temp = originalText;
    setOriginalText(modifiedText);
    setModifiedText(temp);
  };

  // Function to paste from clipboard to a specific text area
  const pasteFromClipboard = async (setTextFn: React.Dispatch<React.SetStateAction<string>>) => {
    try {
      const text = await navigator.clipboard.readText();
      setTextFn(text);
    } catch (err) {
      console.error('Failed to read clipboard contents:', err);
    }
  };

  // Function to copy text to clipboard
  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  };

  // Function to count lines and characters
  const countStats = (text: string) => {
    const lines = text ? text.split('\n').length : 0;
    const chars = text ? text.length : 0;
    return { lines, chars };
  };

  const originalStats = countStats(originalText);
  const modifiedStats = countStats(modifiedText);

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 flex h-16 items-center gap-4 px-4 sm:px-6 pt-4">
        <div className="flex flex-1 items-center gap-4 md:gap-8">
          <div className="flex items-center justify-center w-full relative">
            <div className="absolute right-[8px] -top-1">
              <UserNavWrapper user={session?.user} />
            </div>
            <div className="flex items-center space-x-2 mt-3">
              <GitCompare className="h-8 w-8" />
              <h1  className="text-3xl font-bold translate-y-1">Text Compare</h1>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-[130%]">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Original Text */}
            <div className="flex-1 border border-border rounded-md shadow-sm">
              <div className="px-4 py-2.5 font-medium bg-muted/50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span>Original Text</span>
                    <span className="text-xs text-muted-foreground">
                      ({originalStats.lines} lines, {originalStats.chars} chars)
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOriginalText('')}
                      className="h-7 w-7 p-0 text-xs"
                      title="Clear content"
                    >
                      <X size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => pasteFromClipboard(setOriginalText)}
                      className="h-7 w-7 p-0 text-xs"
                      title="Paste from clipboard"
                    >
                      <Clipboard size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(originalText)}
                      className="h-7 w-7 p-0 text-xs"
                      title="Copy to clipboard"
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </div>
              </div>
              <textarea
                id="original-text"
                className="w-full h-64 p-3 bg-background focus:outline-none focus:ring-0 resize-none"
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
                placeholder="Paste original text here..."
              />
            </div>
            
            {/* Modified Text */}
            <div className="flex-1 border border-border rounded-md shadow-sm">
              <div className="px-4 py-2.5 font-medium bg-muted/50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span>Modified Text</span>
                    <span className="text-xs text-muted-foreground">
                      ({modifiedStats.lines} lines, {modifiedStats.chars} chars)
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setModifiedText('')}
                      className="h-7 w-7 p-0 text-xs"
                      title="Clear content"
                    >
                      <X size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => pasteFromClipboard(setModifiedText)}
                      className="h-7 w-7 p-0 text-xs"
                      title="Paste from clipboard"
                    >
                      <Clipboard size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(modifiedText)}
                      className="h-7 w-7 p-0 text-xs"
                      title="Copy to clipboard"
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </div>
              </div>
              <textarea
                id="modified-text"
                className="w-full h-64 p-3 bg-background focus:outline-none focus:ring-0 resize-none"
                value={modifiedText}
                onChange={(e) => setModifiedText(e.target.value)}
                placeholder="Paste modified text here..."
              />
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mt-4 mb-8">
            <Button
              variant="secondary"
              onClick={handleCompare}
              disabled={!originalText || !modifiedText}
              className="w-32"
            >
              Compare
            </Button>
            <Button
              variant="outline"
              onClick={handleSwap}
              className="w-32"
              title="Swap original and modified text"
            >
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              Swap
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              className="w-32"
            >
              Reset
            </Button>
          </div>
          
          {/* Diff View */}
          {showDiff && (
            <>
              {textsMatch && (
                <div className="flex justify-center mt-8 mb-4">
                  <Alert className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-900 max-w-md text-center">
                    <CheckCircle2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <AlertDescription className="text-orange-600 dark:text-orange-400 ml-2">
                      The texts are identical.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
              <div className="mt-8 border border-border rounded-md shadow-sm">
                <div className="px-4 py-2.5 font-medium bg-muted/50">
                  <span>Comparison Result</span>
                </div>
                <div className="p-4 prose max-w-none dark:prose-invert">
                  <DiffView oldContent={originalText} newContent={modifiedText} />
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
