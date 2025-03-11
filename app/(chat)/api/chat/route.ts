import {
  type Message,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from 'ai';
import { auth } from '@/app/(auth)/auth';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { isProductionEnvironment } from '@/lib/constants';
import { NextResponse } from 'next/server';
import { myProvider } from '@/lib/ai/providers';
import { ExtendedAttachment } from '@/lib/types/attachment';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const {
      id,
      messages,
      selectedChatModel,
    }: {
      id: string;
      messages: Array<Message>;
      selectedChatModel: string;
    } = await request.json();

    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userMessage = getMostRecentUserMessage(messages);

    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      });

      await saveChat({ id, userId: session.user.id, title });
    } else {
      if (chat.userId !== session.user.id) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    // Create a copy of the user message with attachments properly serialized for database storage
    const messageForDb = {
      ...userMessage,
      createdAt: new Date(),
      chatId: id,
      // Ensure content includes the attachment metadata so it's stored in the JSON field
      content: typeof userMessage.content === 'string' 
        ? { 
            text: userMessage.content, 
            experimental_attachments: userMessage.experimental_attachments 
              ? userMessage.experimental_attachments.map(attachment => {
                  const extAttachment = attachment as ExtendedAttachment;
                  // Log incoming attachment data
                  console.log('Processing attachment for storage:', {
                    name: attachment.name,
                    objectName: extAttachment.objectName,
                    pathname: extAttachment.pathname,
                    contentType: attachment.contentType,
                    url: attachment.url?.substring(0, 30) + '...'
                  });
                  
                  return {
                    ...attachment,
                    // Explicitly include objectName if it exists
                    ...(extAttachment.objectName && { objectName: extAttachment.objectName }),
                    // Ensure original name is preserved
                    name: attachment.name || (extAttachment.pathname ? extAttachment.pathname.split('/').pop() : 'File')
                  };
                })
              : []
          } 
        : Array.isArray(userMessage.content)
          ? [
              ...userMessage.content, 
              { 
                type: 'attachments', 
                experimental_attachments: userMessage.experimental_attachments 
                  ? userMessage.experimental_attachments.map(attachment => {
                      const extAttachment = attachment as ExtendedAttachment;
                      return {
                        ...attachment,
                        ...(extAttachment.objectName && { objectName: extAttachment.objectName }),
                        name: attachment.name || (extAttachment.pathname ? extAttachment.pathname.split('/').pop() : 'File')
                      };
                    })
                  : []
              }
            ]
          : { 
              text: String(userMessage.content), 
              experimental_attachments: userMessage.experimental_attachments 
                ? userMessage.experimental_attachments.map(attachment => {
                    const extAttachment = attachment as ExtendedAttachment;
                    return {
                      ...attachment,
                      ...(extAttachment.objectName && { objectName: extAttachment.objectName }),
                      name: attachment.name || (extAttachment.pathname ? extAttachment.pathname.split('/').pop() : 'File')
                    };
                  })
                : []
            }
    };

    await saveMessages({
      messages: [messageForDb],
    });
 
    // Process messages to ensure attachments are properly formatted
    const processedMessages = await Promise.all(messages.map(async message => {
      if (message.experimental_attachments && message.experimental_attachments.length > 0) {
        // Log all attachments for debugging
        console.log('Processing attachments:', message.experimental_attachments.map(a => ({
          name: a.name,
          objectName: (a as ExtendedAttachment).objectName,
          contentType: a.contentType,
          url: a.url.substring(0, 50) + '...' // Truncate URL for readability
        })));
        
        // Handle different types of attachments
        const imageAttachments = message.experimental_attachments.filter(
          attachment => attachment.contentType?.startsWith('image/')
        );
        
        // Text attachments should be fetched and included directly
        // Include both text/ types and markdown with various MIME types
        const textAttachments = message.experimental_attachments.filter(
          attachment => {
            const contentType = attachment.contentType?.toLowerCase() || '';
            const fileName = attachment.name?.toLowerCase() || '';
            const fileExtension = fileName.split('.').pop() || '';
            
            // Check if it's a text file by MIME type or extension
            const isTextByMimeType = contentType.startsWith('text/') || 
                                     contentType.includes('markdown') || 
                                     contentType.includes('/md') ||
                                     (contentType === 'application/rtf');
                                     
            // For octet-stream files, check the extension
            const isTextByExtension = contentType === 'application/octet-stream' && 
                                     ['md', 'markdown', 'txt', 'csv', 'json', 'html', 'htm', 'rtf', 'log'].includes(fileExtension);
            
            return isTextByMimeType || isTextByExtension;
          }
        );
        
        console.log('Identified text attachments:', textAttachments.length);
        
        // Other non-image, non-text attachments
        const otherAttachments = message.experimental_attachments.filter(
          attachment => {
            const contentType = attachment.contentType?.toLowerCase() || '';
            const fileName = attachment.name?.toLowerCase() || '';
            const fileExtension = fileName.split('.').pop() || '';
            
            // Check if it's an image file
            const isImageFile = contentType.startsWith('image/');
            
            // Check if it's a text file by MIME type or extension
            const isTextByMimeType = contentType.startsWith('text/') || 
                                    contentType.includes('markdown') || 
                                    contentType.includes('/md') ||
                                    (contentType === 'application/rtf');
                                    
            // For octet-stream files, check the extension
            const isTextByExtension = contentType === 'application/octet-stream' && 
                                    ['md', 'markdown', 'txt', 'csv', 'json', 'html', 'htm', 'rtf', 'log'].includes(fileExtension);
            
            // Return true if this is neither an image nor a text file
            return !isImageFile && !(isTextByMimeType || isTextByExtension);
          }
        );
        
        let processedContent = message.content;
        
        // Process text file attachments - fetch their content and include it directly
        if (textAttachments.length > 0) {
          console.log(`Processing ${textAttachments.length} text attachments`);
          
          // Prepare to fetch content from each text attachment
          const textContentsPromises = textAttachments.map(async (attachment) => {
            try {
              // Use attachment.url to fetch the content
              const response = await fetch(attachment.url);
              
              if (!response.ok) {
                console.error(`Failed to fetch text content: ${response.status} ${response.statusText}`);
                throw new Error(`Failed to fetch text content from ${attachment.url}`);
              }
              
              const textContent = await response.text();
              console.log(`Successfully fetched ${textContent.length} characters of text content`);
              // Use the original filename for display
              const extAttachment = attachment as ExtendedAttachment;
              const fileName = attachment.name || (extAttachment.pathname ? extAttachment.pathname.split('/').pop() : 'file.txt');
              
              return `\n\nContent of ${fileName}:\n\`\`\`\n${textContent}\n\`\`\``;
            } catch (error) {
              console.error('Error fetching text file content:', error);
              return `\n\n[Failed to fetch content of ${attachment.name || 'text file'}]`;
            }
          });
          
          const textContents = await Promise.all(textContentsPromises);
          
          // Add text file contents to the message
          if (typeof processedContent === 'string') {
            processedContent = `${processedContent}${textContents.join('')}`;
            console.log('Updated message content with text attachments.');
          }
        }
        
        // If there are other non-image, non-text attachments, add them as text references
        if (otherAttachments.length > 0) {
          const attachmentText = otherAttachments.map(attachment => {
            // Handle potentially undefined name
            if (!attachment.name) {
              return `[File: Unknown (${attachment.contentType || 'unknown'})]`;
            }
            const fileName = attachment.name;
            return `[File: ${fileName} (${attachment.contentType || 'unknown'})]`;
          }).join('\n');
          
          if (typeof processedContent === 'string') {
            processedContent = `${processedContent}\n\nAttached files:\n${attachmentText}`;
          }
        }
        
        return {
          ...message,
          content: processedContent,
          experimental_attachments: imageAttachments.length > 0 ? imageAttachments : undefined
        };
      }
      return message;
    }));

    // Build our final messages array for the AI
    const finalMessages = [...processedMessages];
    
    // Log the final messages being sent to OpenAI (truncated for readability)
    console.log('Sending to OpenAI:', finalMessages.map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string' 
        ? (msg.content.length > 100 ? msg.content.substring(0, 100) + '...' : msg.content)
        : Array.isArray(msg.content) ? 'Complex content with attachments' : msg.content,
      hasAttachments: msg.experimental_attachments && msg.experimental_attachments.length > 0
    })));

    return createDataStreamResponse({
      execute: (dataStream) => {
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel }),
          messages: finalMessages,
          maxSteps: 5,
          experimental_activeTools:
            selectedChatModel === 'chat-model-reasoning'
              ? []
              : [
                  'getWeather',
                  'createDocument',
                  'updateDocument',
                  'requestSuggestions',
                ],
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          tools: {
            getWeather,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
          },
          onFinish: async ({ response, reasoning }) => {
            if (session.user?.id) {
              try {
                const sanitizedResponseMessages = sanitizeResponseMessages({
                  messages: response.messages,
                  reasoning,
                });

                await saveMessages({
                  messages: sanitizedResponseMessages.map((message) => {
                    return {
                      id: message.id,
                      chatId: id,
                      role: message.role,
                      content: message.content,
                      createdAt: new Date(),
                    };
                  }),
                });
              } catch (error) {
                console.error('Failed to save chat');
              }
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        result.consumeStream();

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: () => {
        return 'Oops, an error occured!';
      },
    });
  } catch (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}
