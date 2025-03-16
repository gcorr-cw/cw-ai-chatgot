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
  const DEBUG = false;
  
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
  
  // Tooltip detection
  const isTooltipActive = useRef<boolean>(false);
  const pendingScroll = useRef<boolean>(false);
  
  // ======= LOGGING HELPER =======
  const log = useCallback((type: string, message: string, data?: any) => {
    if (!DEBUG) return;
    const timestamp = new Date().toISOString().substring(11, 19);
    console.log(`[${timestamp}][${type}] ${message}`, data !== undefined ? data : '');
  }, []);
  
  // Function to check if a tooltip is currently visible
  const checkForActiveTooltips = useCallback((): boolean => {
    // Look for common tooltip elements that are open
    // This includes both Radix UI tooltips and other common tooltip implementations
    const tooltips = document.querySelectorAll(
      '[data-state="open"], ' +          // Radix UI and similar libraries
      '[role="tooltip"], ' +             // Standard tooltip role
      '[data-tooltip-open="true"], ' +   // Custom tooltip attribute
      '.tooltip[style*="display: block"]' // CSS-based tooltips
    );
    return tooltips.length > 0;
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
    
    // Don't scroll if tooltips are active, unless it's a forced scroll
    if (isTooltipActive.current && !forceResetRequested.current) {
      log('SCROLL', '⚠️ Tooltip active - deferring scroll');
      pendingScroll.current = true;
      return;
    }
    
    // Check if we're near the bottom - only auto-scroll if we are
    // BUT ignore this check for forced scrolls or initial load
    const container = containerRef.current;
    const isNearBottom = 
      Math.abs(container.scrollHeight - container.scrollTop - container.clientHeight) < 200;
    
    // For non-forced scrolls, only scroll if we're near the bottom
    // EXCEPT for initial load or explicit force reset
    if (!forceResetRequested.current && !initialLoad.current && !isNearBottom) {
      log('SCROLL', '⚠️ Not near bottom - skipping non-forced scroll');
      return;
    }
    
    // Mark that we're doing a programmatic scroll to avoid triggering scroll handlers
    programmaticScrolling.current = true;
    
    try {
      log('SCROLL', `⬇️ Scrolling to bottom (${behavior})`, {
        forced: forceResetRequested.current,
        initialLoad: initialLoad.current
      });
      
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
    
    pendingScroll.current = false;
  }, [log]);
  
  // ======= PUBLIC API =======
  
  // Scroll to bottom (called externally by UI elements)
  const scrollToBottom = useCallback((immediate: boolean = false) => {
    log('API', '📌 scrollToBottom called', { 
      immediate, 
      wasAutoScrollDisabled: !autoScrollEnabled.current,
      currentResponseId: currentResponseId.current,
      initialLoad: initialLoad.current,
      isInDisabledList: isAutoScrollDisabledForCurrentResponse(),
      isTooltipActive: isTooltipActive.current,
      forceRequested: forceResetRequested.current
    });
    
    // If force reset was requested (from UI button or manual user action)
    if (forceResetRequested.current) {
      log('API', '🔄 Force reset requested - clearing all disabled responses');
      disabledResponseIds.current.clear();
      autoScrollEnabled.current = true; // Ensure this is true
      setIsScrollPaused(false);         // Update UI state
      userScrolledManually.current = false;
      
      // Always use 'auto' behavior for force resets to ensure it happens immediately
      performScrollToBottom('auto');
      
      // Reset the force request flag AFTER we've done the scroll
      forceResetRequested.current = false;
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
    scrollToBottom(true); // Pass true for immediate scroll
  }, [scrollToBottom, log]);
  
  // ======= EFFECTS =======
  
  // Handle user scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    log('SETUP', 'Setting up scroll event listener');
    
    // Track scroll state
    const scrollState = {
      lastDirection: null as 'up' | 'down' | null,
      previousScrollTop: container.scrollTop,
      directionChangeTime: 0,
      userInitiatedScroll: false
    };
    
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
      
      // On first user scroll after page load, mark as user-initiated
      if (!scrollState.userInitiatedScroll) {
        scrollState.userInitiatedScroll = true;
        log('SCROLL', '🖱️ First user-initiated scroll detected');
        
        // If user is scrolling up initially, immediately disable auto-scroll
        if (scrollTop < scrollState.previousScrollTop) {
          log('SCROLL', '👆 Initial scroll is upward - disabling auto-scroll');
          disableAutoScrollForCurrentResponse();
          // Update state and exit early
          scrollState.previousScrollTop = scrollTop;
          return;
        }
      }
      
      // Determine scroll direction
      const currentDirection = scrollTop < scrollState.previousScrollTop ? 'up' : 'down';
      
      // If direction changed, record the time
      if (scrollState.lastDirection !== currentDirection) {
        scrollState.lastDirection = currentDirection;
        scrollState.directionChangeTime = now;
        log('SCROLL', `Direction changed to ${currentDirection}`);
      }
      
      // Update previous scroll position for next comparison
      scrollState.previousScrollTop = scrollTop;
      
      // Don't change auto-scroll state immediately after direction change (prevent stuttering)
      // Give a 300ms buffer after direction change
      if (now - scrollState.directionChangeTime < 300) {
        return;
      }
      
      // Case 1: User scrolled up - disable auto-scroll for current response
      if (scrollTop > 5 && currentDirection === 'up') {
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
      
      // Skip if tooltips are active
      if (isTooltipActive.current) {
        log('MUTATION', '⚠️ Tooltip active - skipping mutation handling');
        return;
      }
      
      // Filter out tooltip-related mutations and other UI interactions
      const significantMutations = mutations.filter(mutation => {
        // Skip tooltip-related mutations
        const target = mutation.target as Element;
        if (!(target instanceof Element)) return true;
        
        const isTooltipRelated = 
          target.hasAttribute('data-state') || 
          target.closest('[data-state]') !== null ||
          target.hasAttribute('role') && target.getAttribute('role') === 'tooltip' ||
          target.closest('[role="tooltip"]') !== null;
        
        return !isTooltipRelated;
      });
      
      if (significantMutations.length === 0) {
        log('MUTATION', 'Filtered out all mutations as UI-related');
        return;
      }
      
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
        mutations: significantMutations.length,
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
      attributes: false  // Reduce noise by not watching attributes
    });
    
    return () => {
      observer.disconnect();
      log('CLEANUP', 'Disconnected mutation observer');
    };
  }, [generateNewResponseId, isAutoScrollDisabledForCurrentResponse, log, performScrollToBottom, checkForActiveTooltips]);
  
  // Monitor tooltip state to prevent scrolling during tooltip interactions
  useEffect(() => {
    log('SETUP', 'Setting up tooltip detection');
    
    const checkTooltipInterval = setInterval(() => {
      const tooltipActive = checkForActiveTooltips();
      
      // If tooltip state changed, log it
      if (tooltipActive !== isTooltipActive.current) {
        log('TOOLTIP', tooltipActive ? '🔍 Tooltip became active' : '🔍 Tooltip became inactive');
      }
      
      // If tooltip state changed from active to inactive, and we have a pending scroll
      if (isTooltipActive.current && !tooltipActive && pendingScroll.current) {
        log('TOOLTIP', '⏩ Processing pending scroll after tooltip closed');
        setTimeout(() => performScrollToBottom('auto'), 50); // Small delay to ensure tooltip is fully gone
      }
      
      isTooltipActive.current = tooltipActive;
    }, 100);
    
    return () => {
      clearInterval(checkTooltipInterval);
      log('CLEANUP', 'Removed tooltip detection');
    };
  }, [log, checkForActiveTooltips, performScrollToBottom]);
  
  // Initial setup
  useEffect(() => {
    log('INIT', 'useScrollToBottom initialized');
    initialLoad.current = true;
    
    // Track if we've successfully scrolled on initial load
    let initialScrollComplete = false;
    
    // More robust initial scroll handling with multiple attempts
    const attemptInitialScroll = () => {
      if (!initialLoad.current || initialScrollComplete) return;
      
      const container = containerRef.current;
      const end = endRef.current;
      
      if (container && end) {
        log('INIT', '⬇️ Attempting initial scroll to bottom');
        
        // Check if container has any meaningful content to scroll
        if (container.scrollHeight > window.innerHeight) {
          initialScrollComplete = true;
          // Don't force auto-scroll on initial load to prevent stuttering
          // when user tries to scroll up immediately after page load
          container.scrollTop = container.scrollHeight;
        } else {
          log('INIT', '⚠️ Container not ready for scroll yet, will retry');
        }
      }
    };
    
    // Try immediately if DOM is already loaded
    if (document.readyState === 'complete') {
      attemptInitialScroll();
    }
    
    // Listen for DOM content loaded event
    const handleDOMContentLoaded = () => {
      log('INIT', '📄 DOM Content Loaded - attempting scroll');
      attemptInitialScroll();
    };
    
    // Listen for load event (all resources loaded)
    const handleWindowLoad = () => {
      log('INIT', '🌐 Window Load - attempting scroll');
      attemptInitialScroll();
    };
    
    // Multiple attempts with increasing delays
    const scrollAttempts = [100, 500];
    const scrollTimers: number[] = [];
    
    scrollAttempts.forEach(delay => {
      const timer = window.setTimeout(() => {
        log('INIT', `⏱️ Timed attempt (${delay}ms) to scroll to bottom`);
        attemptInitialScroll();
      }, delay);
      scrollTimers.push(timer);
    });
    
    // Set up event listeners
    document.addEventListener('DOMContentLoaded', handleDOMContentLoaded);
    window.addEventListener('load', handleWindowLoad);
    
    // Cleanup all timers and event listeners
    return () => {
      log('CLEANUP', 'useScrollToBottom unmounting');
      
      scrollTimers.forEach(timer => clearTimeout(timer));
      document.removeEventListener('DOMContentLoaded', handleDOMContentLoaded);
      window.removeEventListener('load', handleWindowLoad);
    };
  }, [log, scrollToBottom]);
  
  return [containerRef, endRef, isScrollPaused, scrollToBottom, forceEnableAutoScroll];
}