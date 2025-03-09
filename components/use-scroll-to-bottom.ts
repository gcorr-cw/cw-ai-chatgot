import { useEffect, useRef, useState, useCallback } from 'react';

export function useScrollToBottom<T extends HTMLElement>(): [
  React.RefObject<T>,
  React.RefObject<T>,
  boolean,
  (immediate?: boolean) => void,
  () => void
] {
  const containerRef = useRef<T>(null);
  const endRef = useRef<T>(null);
  const [isScrollPaused, setIsScrollPaused] = useState(false);
  
  // Enable debug logging to browser console
  const DEBUG = true;
  
  // ======= SIMPLIFIED AUTOSCROLL STATE MANAGEMENT =======
  // We track all essential state in these simple variables
  const autoScrollEnabled = useRef<boolean>(true);
  const currentResponseId = useRef<string>('');
  const disabledResponseIds = useRef<Set<string>>(new Set());
  const userScrolledManually = useRef<boolean>(false);
  const programmaticScrolling = useRef<boolean>(false);
  const lastScrollEvent = useRef<number>(0);
  const forceResetRequested = useRef<boolean>(false);
  const initialLoad = useRef<boolean>(true);
  
  // ======= LOGGING HELPER =======
  const log = useCallback((type: string, message: string, data?: any) => {
    if (!DEBUG) return;
    const timestamp = new Date().toISOString().substring(11, 19);
    console.log(`[${timestamp}][${type}] ${message}`, data !== undefined ? data : '');
  }, []);
  
  // ======= CORE AUTO-SCROLL FUNCTIONS =======
  
  // Completely disable auto-scroll for the current response
  const disableAutoScrollForCurrentResponse = useCallback(() => {
    if (!autoScrollEnabled.current) return; // Already disabled
    
    // Get and store current response ID
    const responseId = currentResponseId.current;
    if (responseId) {
      log('DISABLE', `🔒 Disabling auto-scroll for response: ${responseId}`);
      disabledResponseIds.current.add(responseId);
    } else {
      log('DISABLE', '🔒 Disabling auto-scroll (no response ID)');
    }
    
    autoScrollEnabled.current = false;
    setIsScrollPaused(true);
    userScrolledManually.current = true;
  }, [log]);
  
  // Enable auto-scroll
  const enableAutoScroll = useCallback(() => {
    if (autoScrollEnabled.current) return; // Already enabled
    
    // Get the current response ID and remove it from the disabled set
    const responseId = currentResponseId.current;
    if (responseId && disabledResponseIds.current.has(responseId)) {
      log('ENABLE', `✅ Re-enabling auto-scroll and removing response ${responseId} from disabled list`);
      disabledResponseIds.current.delete(responseId);
    } else {
      log('ENABLE', '✅ Re-enabling auto-scroll');
    }
    
    autoScrollEnabled.current = true;
    userScrolledManually.current = false;
    setIsScrollPaused(false);
  }, [log]);
  
  // Generate a new response ID when a new message stream starts
  const generateNewResponseId = useCallback(() => {
    const randomId = Math.random().toString(36).substring(2, 10);
    currentResponseId.current = randomId;
    log('RESPONSE', `🆕 New response started with ID: ${randomId}`);
    
    // Auto-scroll should be enabled for new responses
    enableAutoScroll();
    
    return randomId;
  }, [enableAutoScroll, log]);
  
  // Check if auto-scroll is disabled for the current response
  const isAutoScrollDisabledForCurrentResponse = useCallback(() => {
    const responseId = currentResponseId.current;
    const isDisabled = responseId && disabledResponseIds.current.has(responseId);
    if (isDisabled) {
      log('CHECK', `🔒 Response ${responseId} is in disabled list`);
    }
    return isDisabled;
  }, [log]);
  
  // Perform the actual scroll operation
  const performScrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    if (!endRef.current || !containerRef.current) {
      log('SCROLL', '❌ Cannot scroll - missing references');
      return;
    }
    
    // Mark that we're doing a programmatic scroll to avoid triggering scroll handlers
    programmaticScrolling.current = true;
    
    try {
      log('SCROLL', `⬇️ Scrolling to bottom (${behavior})`);
      endRef.current.scrollIntoView({
        behavior,
        block: 'end',
      });
      
      // Clear the flag after scrolling animation would be complete
      setTimeout(() => {
        programmaticScrolling.current = false;
      }, behavior === 'smooth' ? 300 : 50);
    } catch (error) {
      log('ERROR', 'Error during scroll', error);
      programmaticScrolling.current = false;
    }
  }, [log]);
  
  // ======= PUBLIC API =======
  
  // Scroll to bottom (called externally by UI elements)
  const scrollToBottom = useCallback((immediate: boolean = false) => {
    log('API', '📌 scrollToBottom called', { 
      immediate, 
      wasAutoScrollDisabled: !autoScrollEnabled.current,
      currentResponseId: currentResponseId.current,
      initialLoad: initialLoad.current,
      isInDisabledList: isAutoScrollDisabledForCurrentResponse()
    });
    
    // If force reset was requested (from UI button or manual user action)
    if (forceResetRequested.current) {
      log('API', '🔄 Force reset requested - clearing all disabled responses');
      disabledResponseIds.current.clear();
      forceResetRequested.current = false;
      enableAutoScroll();
      performScrollToBottom(immediate ? 'auto' : 'smooth');
      return;
    }
    
    // CASE 1: Initial page load - always scroll
    if (initialLoad.current && immediate === true) {
      log('API', '🔄 Initial page load - scrolling regardless of auto-scroll state');
      initialLoad.current = false; // No longer the initial load
      performScrollToBottom('auto');
      return;
    }
    
    // CASE 2: For any other case, respect auto-scroll disabled state, even for immediate calls
    if (isAutoScrollDisabledForCurrentResponse()) {
      log('API', '🔒 Auto-scroll disabled for current response - skipping scroll even though immediate=' + immediate);
      return;
    }
    
    // In all other cases, perform the scroll as requested
    performScrollToBottom(immediate ? 'auto' : 'smooth');
  }, [enableAutoScroll, isAutoScrollDisabledForCurrentResponse, performScrollToBottom, log]);
  
  // Force enable auto-scroll (should be called by UI button)
  const forceEnableAutoScroll = useCallback(() => {
    log('FORCE', '🔓 Force enabling auto-scroll');
    forceResetRequested.current = true;
    disabledResponseIds.current.clear();
    scrollToBottom(true);
  }, [scrollToBottom, log]);
  
  // ======= EFFECTS =======
  
  // Handle user scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    log('SETUP', 'Setting up scroll event listener');
    
    const handleScroll = () => {
      // Skip if this is our own programmatic scrolling
      if (programmaticScrolling.current) {
        log('SCROLL', 'Ignoring programmatic scroll event');
        return;
      }
      
      // Throttle scroll events (process max once per 50ms)
      const now = Date.now();
      if (now - lastScrollEvent.current < 50) return;
      lastScrollEvent.current = now;
      
      const { scrollTop, scrollHeight, clientHeight } = container;
      
      // Case 1: User scrolled up (any amount) - disable auto-scroll for current response
      if (scrollTop > 5) {
        const scrollBuffer = 30; // Allow some wiggle room for determining if at bottom
        const isAtBottom = Math.abs((scrollTop + clientHeight) - scrollHeight) < scrollBuffer;
        
        if (!isAtBottom) {
          log('SCROLL', '👆 User scrolled up', { scrollTop });
          disableAutoScrollForCurrentResponse();
        }
      }
      
      // Case 2: User scrolled all the way to bottom - re-enable auto-scroll
      const isAtBottom = Math.abs((scrollTop + clientHeight) - scrollHeight) < 20;
      if (isAtBottom && !autoScrollEnabled.current) {
        log('SCROLL', '👇 User scrolled to bottom - re-enabling auto-scroll');
        enableAutoScroll();
      }
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      log('CLEANUP', 'Removed scroll event listener');
    };
  }, [disableAutoScrollForCurrentResponse, enableAutoScroll, log]);
  
  // Handle DOM mutations (when messages are added/changed)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    log('SETUP', 'Setting up mutation observer');
    
    let messageChangeCount = 0;
    let lastMessageChangeTime = 0;
    let isFirstMutation = true;
    
    const observer = new MutationObserver((mutations) => {
      // Skip empty mutation batches
      if (mutations.length === 0) return;
      
      const now = Date.now();
      
      // First mutation after a while indicates a new message stream
      if (now - lastMessageChangeTime > 2000 || isFirstMutation) {
        log('STREAM', '🆕 Detected start of a new message stream');
        messageChangeCount = 0;
        isFirstMutation = false;
        generateNewResponseId();
      }
      
      // Update counters
      messageChangeCount++;
      lastMessageChangeTime = now;
      
      log('MUTATION', 'Content changed', { 
        mutations: mutations.length,
        messageChangeCount,
        autoScrollEnabled: autoScrollEnabled.current,
        currentResponseId: currentResponseId.current,
        isInDisabledList: isAutoScrollDisabledForCurrentResponse()
      });
      
      // For content updates, only skip auto-scroll if specifically disabled for this response
      if (isAutoScrollDisabledForCurrentResponse()) {
        log('STREAM', '⛔ Auto-scroll specifically disabled for this response - skipping scroll');
        return;
      }
      
      // Otherwise, scroll to bottom with each update
      log('STREAM', '✅ Auto-scrolling after content change');
      requestAnimationFrame(() => {
        performScrollToBottom('auto');
      });
    });
    
    // Start observing with all relevant observation types
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true
    });
    
    return () => {
      observer.disconnect();
      log('CLEANUP', 'Disconnected mutation observer');
    };
  }, [generateNewResponseId, isAutoScrollDisabledForCurrentResponse, log, performScrollToBottom]);
  
  // Initial setup
  useEffect(() => {
    log('INIT', 'useScrollToBottom initialized');
    initialLoad.current = true;
    
    // Do an initial scroll to the bottom
    setTimeout(() => {
      performScrollToBottom('auto');
    }, 100);
    
    return () => {
      log('CLEANUP', 'useScrollToBottom unmounting');
    };
  }, [log, performScrollToBottom]);
  
  return [containerRef, endRef, isScrollPaused, scrollToBottom, forceEnableAutoScroll];
}