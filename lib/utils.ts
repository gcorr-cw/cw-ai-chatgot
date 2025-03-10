import type {
  CoreAssistantMessage,
  CoreToolMessage,
  Message,
  TextStreamPart,
  ToolInvocation,
  ToolSet,
} from 'ai';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import type { Message as DBMessage, Document } from '@/lib/db/schema';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ApplicationError extends Error {
  info: string;
  status: number;
}

export const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error(
      'An error occurred while fetching the data.',
    ) as ApplicationError;

    error.info = await res.json();
    error.status = res.status;

    throw error;
  }

  return res.json();
};

export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  return [];
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function addToolMessageToChat({
  toolMessage,
  messages,
}: {
  toolMessage: CoreToolMessage;
  messages: Array<Message>;
}): Array<Message> {
  return messages.map((message) => {
    if (message.toolInvocations) {
      return {
        ...message,
        toolInvocations: message.toolInvocations.map((toolInvocation) => {
          const toolResult = toolMessage.content.find(
            (tool) => tool.toolCallId === toolInvocation.toolCallId,
          );

          if (toolResult) {
            return {
              ...toolInvocation,
              state: 'result',
              result: toolResult.result,
            };
          }

          return toolInvocation;
        }),
      };
    }

    return message;
  });
}

export function convertToUIMessages(
  messages: Array<DBMessage>,
): Array<Message> {
  return messages.reduce((chatMessages: Array<Message>, message) => {
    if (message.role === 'tool') {
      return addToolMessageToChat({
        toolMessage: message as CoreToolMessage,
        messages: chatMessages,
      });
    }

    let textContent = '';
    let reasoning: string | undefined = undefined;
    let experimental_attachments = undefined;
    const toolInvocations: Array<ToolInvocation> = [];

    // Simple string content
    if (typeof message.content === 'string') {
      textContent = message.content;
    } 
    // Object content that might contain text and attachments
    else if (typeof message.content === 'object' && message.content !== null) {
      // Check if content has text property (our custom format)
      if ('text' in message.content) {
        textContent = message.content.text as string;
      }
      
      // Extract experimental_attachments from the content object
      if ('experimental_attachments' in message.content && message.content.experimental_attachments) {
        experimental_attachments = message.content.experimental_attachments;
      }
      
      // Handle array content for tool calls or multi-part messages
      if (Array.isArray(message.content)) {
        for (const content of message.content) {
          if (typeof content === 'object' && content !== null) {
            // Extract attachments from our custom type
            if (content.type === 'attachments' && 'experimental_attachments' in content) {
              experimental_attachments = content.experimental_attachments;
            }
            // Handle regular AI message parts
            else if ('type' in content) {
              if (content.type === 'text') {
                textContent += content.text;
              } else if (content.type === 'tool-call') {
                toolInvocations.push({
                  state: 'call',
                  toolCallId: content.toolCallId,
                  toolName: content.toolName,
                  args: content.args,
                });
              } else if (content.type === 'reasoning') {
                reasoning = content.reasoning;
              }
            }
          }
        }
      }
    }

    // Create the UI message
    const uiMessage: Message = {
      id: message.id,
      role: message.role as Message['role'],
      content: textContent,
      reasoning,
      toolInvocations,
    };
    
    // Add the experimental_attachments to the message
    if (experimental_attachments) {
      (uiMessage as any).experimental_attachments = experimental_attachments;
    }
    // Fallback: Check if message has top-level experimental_attachments (for backward compatibility)
    else if ('experimental_attachments' in message && message.experimental_attachments) {
      (uiMessage as any).experimental_attachments = message.experimental_attachments;
    }

    chatMessages.push(uiMessage);
    
    return chatMessages;
  }, []);
}

export function sanitizeResponseMessages({
  messages,
  reasoning,
}: {
  messages: Array<ResponseMessage>;
  reasoning: string | undefined;
}) {
  const toolResultIds: Array<string> = [];

  for (const message of messages) {
    if (message.role === 'tool') {
      for (const content of message.content) {
        if (content.type === 'tool-result') {
          toolResultIds.push(content.toolCallId);
        }
      }
    }
  }

  const messagesBySanitizedContent = messages.map((message) => {
    if (message.role !== 'assistant') return message;

    if (typeof message.content === 'string') return message;

    const sanitizedContent = message.content.filter((content) =>
      content.type === 'tool-call'
        ? toolResultIds.includes(content.toolCallId)
        : content.type === 'text'
          ? content.text.length > 0
          : true,
    );

    if (reasoning) {
      // This is intentional - reasoning message parts are a work in progress in the SDK
      // Adding type assertion to prevent TypeScript error
      sanitizedContent.push({ type: 'reasoning', reasoning } as any);
    }

    return {
      ...message,
      content: sanitizedContent,
    };
  });

  return messagesBySanitizedContent.filter(
    (message) => message.content.length > 0,
  );
}

export function sanitizeUIMessages(messages: Array<Message>): Array<Message> {
  const messagesBySanitizedToolInvocations = messages.map((message) => {
    if (message.role !== 'assistant') return message;

    if (!message.toolInvocations) return message;

    const toolResultIds: Array<string> = [];

    for (const toolInvocation of message.toolInvocations) {
      if (toolInvocation.state === 'result') {
        toolResultIds.push(toolInvocation.toolCallId);
      }
    }

    const sanitizedToolInvocations = message.toolInvocations.filter(
      (toolInvocation) =>
        toolInvocation.state === 'result' ||
        toolResultIds.includes(toolInvocation.toolCallId),
    );

    return {
      ...message,
      toolInvocations: sanitizedToolInvocations,
    };
  });

  return messagesBySanitizedToolInvocations.filter(
    (message) =>
      message.content.length > 0 ||
      (message.toolInvocations && message.toolInvocations.length > 0),
  );
}

export function getMostRecentUserMessage(messages: Array<Message>) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: Array<Document>,
  index: number,
) {
  if (!documents) return new Date();
  if (index > documents.length) return new Date();

  return documents[index].createdAt;
}

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };
