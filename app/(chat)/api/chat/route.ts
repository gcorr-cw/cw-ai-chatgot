import {
  type Message,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from 'ai'
import { auth } from '@/app/(auth)/auth'
import { systemPrompt } from '@/lib/ai/prompts'
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
} from '@/lib/db/queries'
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from '@/lib/utils'
import { generateTitleFromUserMessage } from '../../actions'
import { createDocument } from '@/lib/ai/tools/create-document'
import { updateDocument } from '@/lib/ai/tools/update-document'
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions'
import { getWeather } from '@/lib/ai/tools/get-weather'
import { isProductionEnvironment } from '@/lib/constants'
import { NextResponse } from 'next/server'
import { myProvider } from '@/lib/ai/providers'
import { ExtendedAttachment } from '@/lib/types/attachment'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const {
      id,
      messages,
      selectedChatModel,
    }: {
      id: string
      messages: Array<Message>
      selectedChatModel: string
    } = await request.json()

    const session = await auth()

    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    const userMessage = getMostRecentUserMessage(messages)

    if (!userMessage) {
      return new Response('No user message found', { status: 400 })
    }

    // Check whether the chat exists and if not, create it
    const chat = await getChatById({ id })
    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      })
      await saveChat({ id, userId: session.user.id, title })
    } else {
      if (chat.userId !== session.user.id) {
        return new Response('Unauthorized', { status: 401 })
      }
    }

    // Create a copy of the userMessage with attachments serialized for DB storage
    const messageForDb = {
      ...userMessage,
      createdAt: new Date(),
      chatId: id,
      content:
        typeof userMessage.content === 'string'
          ? {
              text: userMessage.content,
              experimental_attachments: userMessage.experimental_attachments
                ? userMessage.experimental_attachments.map((attachment) => {
                    const extAttachment = attachment as ExtendedAttachment
                    console.log('Processing attachment for storage:', {
                      name: attachment.name,
                      objectName: extAttachment.objectName,
                      contentType: attachment.contentType,
                      url: attachment.url?.substring(0, 30) + '...',
                    })
                    return {
                      ...attachment,
                      ...(extAttachment.objectName && {
                        objectName: extAttachment.objectName,
                      }),
                      // If no name is provided, fall back to "File"
                      name: attachment.name || 'File',
                    }
                  })
                : [],
            }
          : Array.isArray(userMessage.content)
          ? [
              ...userMessage.content,
              {
                type: 'attachments',
                experimental_attachments: userMessage.experimental_attachments
                  ? userMessage.experimental_attachments.map((attachment) => {
                      const extAttachment = attachment as ExtendedAttachment
                      return {
                        ...attachment,
                        ...(extAttachment.objectName && {
                          objectName: extAttachment.objectName,
                        }),
                        name: attachment.name || 'File',
                      }
                    })
                  : [],
              },
            ]
          : {
              text: String(userMessage.content),
              experimental_attachments: userMessage.experimental_attachments
                ? userMessage.experimental_attachments.map((attachment) => {
                    const extAttachment = attachment as ExtendedAttachment
                    return {
                      ...attachment,
                      ...(extAttachment.objectName && {
                        objectName: extAttachment.objectName,
                      }),
                      name: attachment.name || 'File',
                    }
                  })
                : [],
            },
    }

    // Save this new message to the DB
    await saveMessages({
      messages: [messageForDb],
    })

    // Process attachments: if text-based, fetch and inline the content for the LLM
    const processedMessages = await Promise.all(
      messages.map(async (message) => {
        if (
          message.experimental_attachments &&
          message.experimental_attachments.length > 0
        ) {
          console.log(
            'Processing attachments:',
            message.experimental_attachments.map((a) => ({
              name: a.name,
              objectName: (a as ExtendedAttachment).objectName,
              contentType: a.contentType,
              url: a.url?.substring(0, 50) + '...',
            }))
          )

          const imageAttachments = message.experimental_attachments.filter(
            (attachment) => attachment.contentType?.startsWith('image/')
          )

          // Identify text-based attachments
          const textAttachments = message.experimental_attachments.filter(
            (attachment) => {
              const contentType = attachment.contentType?.toLowerCase() || ''
              const fileName = attachment.name?.toLowerCase() || ''
              const fileExtension = fileName.split('.').pop() || ''

              const isTextByMimeType =
                contentType.startsWith('text/') ||
                contentType.includes('markdown') ||
                contentType.includes('/md') ||
                contentType === 'application/rtf'

              const isTextByExtension =
                contentType === 'application/octet-stream' &&
                [
                  'md',
                  'markdown',
                  'txt',
                  'csv',
                  'json',
                  'html',
                  'htm',
                  'rtf',
                  'log',
                ].includes(fileExtension)

              return isTextByMimeType || isTextByExtension
            }
          )
          const otherAttachments = message.experimental_attachments.filter(
            (attachment) => {
              const contentType = attachment.contentType?.toLowerCase() || ''
              const fileName = attachment.name?.toLowerCase() || ''
              const fileExtension = fileName.split('.').pop() || ''
              const isImageFile = contentType.startsWith('image/')
              const isTextByMimeType =
                contentType.startsWith('text/') ||
                contentType.includes('markdown') ||
                contentType.includes('/md') ||
                contentType === 'application/rtf'
              const isTextByExtension =
                contentType === 'application/octet-stream' &&
                [
                  'md',
                  'markdown',
                  'txt',
                  'csv',
                  'json',
                  'html',
                  'htm',
                  'rtf',
                  'log',
                ].includes(fileExtension)
              return !isImageFile && !(isTextByMimeType || isTextByExtension)
            }
          )

          let processedContent = message.content

          // If we have text attachments, fetch their content and inline it
          if (textAttachments.length > 0) {
            console.log(`Processing ${textAttachments.length} text attachments`)
            const textContentsPromises = textAttachments.map(async (attachment) => {
              try {
                const response = await fetch(attachment.url)
                if (!response.ok) {
                  console.error(
                    `Failed to fetch text content: ${response.status} ${response.statusText}`
                  )
                  throw new Error(`Failed to fetch text content from ${attachment.url}`)
                }
                const textContent = await response.text()
                console.log(
                  `Successfully fetched ${textContent.length} characters of text content`
                )

                // Use original name if present, else default
                const fileName = attachment.name || 'file.txt'
                return `\n\nContent of ${fileName}:\n\`\`\`\n${textContent}\n\`\`\``
              } catch (error) {
                console.error('Error fetching text file content:', error)
                return `\n\n[Failed to fetch content of ${attachment.name || 'text file'}]`
              }
            })

            const textContents = await Promise.all(textContentsPromises)
            if (typeof processedContent === 'string') {
              processedContent = `${processedContent}${textContents.join('')}`
            }
          }

          // For other attachments, we just list them in text form
          if (otherAttachments.length > 0) {
            const attachmentText = otherAttachments
              .map((attachment) => {
                if (!attachment.name) {
                  return `[File: Unknown (${attachment.contentType || 'unknown'})]`
                }
                return `[File: ${attachment.name} (${attachment.contentType || 'unknown'})]`
              })
              .join('\n')

            if (typeof processedContent === 'string') {
              processedContent = `${processedContent}\n\nAttached files:\n${attachmentText}`
            }
          }

          return {
            ...message,
            content: processedContent,
            experimental_attachments:
              imageAttachments.length > 0 ? imageAttachments : undefined,
          }
        }
        return message
      })
    )

    // Final messages to pass to the LLM
    const finalMessages = [...processedMessages]

    console.log(
      'Sending to OpenAI:',
      finalMessages.map((msg) => ({
        role: msg.role,
        content:
          typeof msg.content === 'string'
            ? msg.content.length > 100
              ? msg.content.substring(0, 100) + '...'
              : msg.content
            : Array.isArray(msg.content)
            ? 'Complex content with attachments'
            : msg.content,
        hasAttachments:
          msg.experimental_attachments && msg.experimental_attachments.length > 0,
      }))
    )

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
            requestSuggestions: requestSuggestions({ session, dataStream }),
          },
          onFinish: async ({ response, reasoning }) => {
            if (session.user?.id) {
              try {
                const sanitizedResponseMessages = sanitizeResponseMessages({
                  messages: response.messages,
                  reasoning,
                })

                await saveMessages({
                  messages: sanitizedResponseMessages.map((message) => {
                    return {
                      id: message.id,
                      chatId: id,
                      role: message.role,
                      content: message.content,
                      createdAt: new Date(),
                    }
                  }),
                })
              } catch (error) {
                console.error('Failed to save chat', error)
              }
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        })

        result.consumeStream()
        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        })
      },
      onError: () => {
        return 'Oops, an error occured!'
      },
    })
  } catch (error) {
    return NextResponse.json({ error }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return new Response('Not Found', { status: 404 })
  }

  const session = await auth()

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const chat = await getChatById({ id })

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    await deleteChatById({ id })

    return new Response('Chat deleted', { status: 200 })
  } catch (error) {
    return new Response('An error occurred while processing your request', {
      status: 500,
    })
  }
}
