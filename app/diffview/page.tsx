'use client';

import React, { useState, useEffect } from 'react';
import { DiffView } from '@/components/diffview';

export default function TextComparisonPage() {
  const [originalText, setOriginalText] = useState('');
  const [modifiedText, setModifiedText] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  
  // Reset showDiff when either text changes
  useEffect(() => {
    setShowDiff(false);
  }, [originalText, modifiedText]);

  const handleCompare = () => {
    setShowDiff(true);
  };

  const handleReset = () => {
    setOriginalText('');
    setModifiedText('');
    setShowDiff(false);
  };

  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold mb-6">Text Comparison</h1>
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Original Text */}
        <div className="flex-1">
          <label htmlFor="original-text" className="block text-sm font-medium mb-2">
            Original Text
          </label>
          <textarea
            id="original-text"
            className="w-full h-64 p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            placeholder="Paste original text here..."
          />
        </div>
        
        {/* Modified Text */}
        <div className="flex-1">
          <label htmlFor="modified-text" className="block text-sm font-medium mb-2">
            Modified Text
          </label>
          <textarea
            id="modified-text"
            className="w-full h-64 p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={modifiedText}
            onChange={(e) => setModifiedText(e.target.value)}
            placeholder="Paste modified text here..."
          />
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={handleCompare}
          disabled={!originalText || !modifiedText}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Compare Texts
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Reset
        </button>
      </div>
      
      {/* Diff View */}
      {showDiff && (
        <div className="mt-8 border rounded-md p-4">
          <h2 className="text-xl font-semibold mb-4">Comparison Result</h2>
          <div className="prose max-w-none dark:prose-invert">
            <DiffView oldContent={originalText} newContent={modifiedText} />
          </div>
        </div>
      )}
    </div>
  );
}
