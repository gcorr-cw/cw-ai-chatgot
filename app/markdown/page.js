'use client';

import { useEffect, useState, useRef } from 'react';
import Script from 'next/script';
import styles from './markdown.module.css';
import './globals.css';

export default function MarkdownConverter() {
  const [markdown, setMarkdown] = useState('');
  const [showInstructions, setShowInstructions] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const pastebinRef = useRef(null);
  const outputRef = useRef(null);

  useEffect(() => {
    // Check user's preferred color scheme
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDarkMode);
    
    // Apply the initial theme class to the body
    document.body.classList.add(prefersDarkMode ? 'dark-mode' : 'light-mode');
    
    // Load the bootstrap CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/markdown/bootstrap.css';
    document.head.appendChild(link);
    
    // Initialize event listeners after the component is mounted
    const pastebin = pastebinRef.current;
    const output = outputRef.current;

    const handleKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey) {
        if (String.fromCharCode(event.which).toLowerCase() === 'v') {
          pastebin.innerHTML = '';
          pastebin.focus();
          setShowInstructions(false);
        }
      }
    };

    const handlePaste = () => {
      setTimeout(() => {
        if (window.toMarkdown && pastebin) {
          const html = pastebin.innerHTML;
          // Use the convert function from clipboard2markdown.js
          const markdown = window.convert(html);
          setMarkdown(markdown);
          setShowInstructions(false);
          
          // Use a longer timeout to ensure React has fully updated the DOM
          setTimeout(() => {
            if (outputRef.current) {
              // Focus the textarea
              outputRef.current.focus();
              
              // Select all text in the textarea
              outputRef.current.setSelectionRange(0, markdown.length);
              
              // Force selection in case the above doesn't work
              try {
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(outputRef.current);
                selection.removeAllRanges();
                selection.addRange(range);
              } catch (e) {
                // Fallback for older browsers
                outputRef.current.select();
              }
            }
          }, 100);
        }
      }, 200);
    };

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    pastebin?.addEventListener('paste', handlePaste);

    // Clean up event listeners
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      pastebin?.removeEventListener('paste', handlePaste);
      document.head.removeChild(link);
      document.body.classList.remove('dark-mode', 'light-mode');
    };
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle('dark-mode');
    document.body.classList.toggle('light-mode');
  };

  return (
    <>
      <Script src="/markdown/to-markdown.js" strategy="beforeInteractive" />
      <Script src="/markdown/clipboard2markdown.js" strategy="afterInteractive" />
      
      <div className="container">
        <button 
          className="theme-toggle" 
          onClick={toggleDarkMode} 
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          )}
        </button>
        
        <section id="info" className={showInstructions ? '' : styles.hidden}>
          <h1>Paste to Markdown</h1>
          <h2>Instructions</h2>
          <ol>
            <li>Find the text to convert to Markdown (<i>e.g.</i>, in another browser tab)</li>
            <li>Copy it to the clipboard (<code>Ctrl+C</code>, or <code>&#8984;+C</code> on Mac)</li>
            <li>Paste it into this window (<code>Ctrl+V</code>, or <code>&#8984;+V</code> on Mac)</li>
            <li>The converted Markdown will appear!</li>
          </ol>
          <p>The conversion is carried out by <a href="https://github.com/domchristie/to-markdown">to-markdown</a>, a Markdown converter written in JavaScript and running locally in the browser.</p>
        </section>
        
        <div contentEditable="true" id="pastebin" ref={pastebinRef} className={styles.pastebin}></div>
        
        <section className={showInstructions ? styles.hidden : ''} id="wrapper">
          <textarea 
            id="output" 
            ref={outputRef} 
            value={markdown} 
            onChange={(e) => setMarkdown(e.target.value)} 
            className={styles.output}
          />
        </section>
      </div>
    </>
  );
}
