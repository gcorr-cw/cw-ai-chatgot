import { ChatRequestOptions, Message } from 'ai';
import { PreviewMessage, ThinkingMessage } from './message';
import { useScrollToBottom } from './use-scroll-to-bottom';
import { Overview } from './overview';
import { memo, useRef, useEffect, useState } from 'react';
import { Vote } from '@/lib/db/schema';
import equal from 'fast-deep-equal';

interface MessagesProps {
  chatId: string;
  isLoading: boolean;
  votes: Array<Vote> | undefined;
  messages: Array<Message>;
  setMessages: (
    messages: Message[] | ((messages: Message[]) => Message[]),
  ) => void;
  reload: (
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
  isReadonly: boolean;
  isArtifactVisible: boolean;
  user?: any;
}

function PureMessages({
  chatId,
  isLoading,
  votes,
  messages,
  setMessages,
  reload,
  isReadonly,
  user,
}: MessagesProps) {
  const [messagesContainerRef, messagesEndRef, isScrollPaused, scrollToBottom, forceEnableAutoScroll] =
    useScrollToBottom<HTMLDivElement>();
  const [messagesRect, setMessagesRect] = useState<DOMRect | null>(null);
  const scrollButtonRef = useRef<HTMLDivElement>(null);
  const resizeObserver = useRef<ResizeObserver | null>(null);

  // Compute the index of the last user message in the list
  const lastUserMessageIndex = messages.reduce((acc, m, idx) => {
    return m.role === 'user' ? idx : acc;
  }, -1);

  // Force initial scroll to bottom when messages are loaded
  useEffect(() => {
    // Only run on initial load when messages exist
    if (messages.length > 0) {
      //console.log('[MESSAGES] Initial load with messages, forcing scroll to bottom');
      
      // Use multiple attempts for reliability
      const scrollTimes = [50, 200, 500, 1000];
      scrollTimes.forEach(time => {
        setTimeout(() => {
          if (messagesContainerRef.current) {
            // Force scroll to the very bottom of the container directly
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            forceEnableAutoScroll(); // Also reset the auto-scroll state
          }
        }, time);
      });
    }
  }, []);  // Empty dependency array = only run once on mount

  // This useEffect handles detecting when a new user message is added
  // and forces auto-scroll to be enabled (fixing the primary bug)
  useEffect(() => {
    // Find the latest user message
    const latestMessage = messages[messages.length - 1];
    
    // If the latest message is from the user, we should force auto-scroll
    if (latestMessage && latestMessage.role === 'user') {
      //console.log('[MESSAGES] User message detected, forcing auto-scroll');
      
      // Force auto-scroll to be enabled
      forceEnableAutoScroll();
      
      // Use direct scrollTop method for the most immediate effect
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }
  }, [messages.length]); // Only run when the number of messages changes

  // Update the messages container position when it changes
  useEffect(() => {
    if (!messagesContainerRef.current) return;

    const updateRect = () => {
      if (messagesContainerRef.current) {
        setMessagesRect(messagesContainerRef.current.getBoundingClientRect());
      }
      if (scrollButtonRef.current) {
        // (Optional: update button position if needed)
      }
    };

    updateRect();
    resizeObserver.current = new ResizeObserver(updateRect);
    resizeObserver.current.observe(messagesContainerRef.current);
    window.addEventListener('scroll', updateRect);

    return () => {
      if (messagesContainerRef.current && resizeObserver.current) {
        resizeObserver.current.unobserve(messagesContainerRef.current);
      }
      window.removeEventListener('scroll', updateRect);
    };
  }, []);

  // Immediately jump to the bottom when messages load (chat history)
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(true); // immediate jump without smooth scroll or auto-scroll state
    }
  }, [messages, scrollToBottom]);

  return (
    <div
      ref={messagesContainerRef}
      className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4 relative"
    >
      {messages.length === 0 && <Overview user={user} />}

      {messages.map((message, index) => (
        <PreviewMessage
          key={message.id}
          index={index}
          chatId={chatId}
          message={message}
          isLoading={isLoading && messages.length - 1 === index}
          vote={
            votes
              ? votes.find((vote) => vote.messageId === message.id)
              : undefined
          }
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          // Mark the last user message so the hook can detect when it scrolls off
          isLastUserMessage={
            message.role === 'user' && index === lastUserMessageIndex
          }
        />
      ))}

      {isLoading &&
        messages.length > 0 &&
        messages[messages.length - 1].role === 'user' && <ThinkingMessage />}

      <div
        ref={messagesEndRef}
        className="shrink-0 min-w-[24px] min-h-[24px]"
      />
      {/* Resume auto-scroll button appears only when auto-scroll is paused */}
      {isScrollPaused && messagesRect && (
        <div
          ref={scrollButtonRef}
          style={{
            position: 'fixed',
            bottom: '140px',
            left: messagesRect.left + messagesRect.width / 2,
            transform: 'translateX(-50%)',
            zIndex: 50,
          }}
          onClick={() => {
            forceEnableAutoScroll(); // Use the new function to force auto-scroll
          }}
          aria-label="Scroll to bottom"
          className="cursor-pointer"
        >
          <div className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-2 shadow-md flex items-center justify-center transition-all duration-200">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.isArtifactVisible && nextProps.isArtifactVisible) return true;
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (prevProps.isLoading && nextProps.isLoading) return false;
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  if (!equal(prevProps.messages, nextProps.messages)) return false;
  if (!equal(prevProps.votes, nextProps.votes)) return false;
  return true;
});