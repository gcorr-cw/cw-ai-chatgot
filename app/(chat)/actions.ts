'use server';

import { generateText, Message } from 'ai';
import { cookies } from 'next/headers';

import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
  getMessagesByChatId,
  updateChatTitle,
} from '@/lib/db/queries';
import { VisibilityType } from '@/components/visibility-selector';
import { myProvider } from '@/lib/ai/providers';

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set('chat-model', model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: Message;
}) {
  const { text: title } = await generateText({
    model: myProvider.languageModel('title-model'),
    system: `\n
    - Generate a short title based on the first message from the user
    - Ensure it is not more than 30 characters long, about 3-4 words
    - The title should be a summary of the user's message
    - Do not use quotes or colons`,
    prompt: JSON.stringify(message),
  });

  return title;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisiblityById({ chatId, visibility });
}

export async function generateTitleFromChatHistory({
  chatId,
}: {
  chatId: string;
}) {
  try {
    // Get all messages for this chat
    const messages = await getMessagesByChatId({ id: chatId });
    
    if (!messages || messages.length === 0) {
      return null;
    }

    // Generate a new title based on the entire conversation
    const { text: title } = await generateText({
      model: myProvider.languageModel('title-model'),
      system: `\n
    - Generate a short title based on the the conversation
    - Ensure it is not more than 30 characters long, about 3-4 words
    - The title should be a summary of the conversation
    - Do not use quotes or colons`,
      prompt: JSON.stringify(messages),
    });

    // Update the chat title in the database
    await updateChatTitle({ id: chatId, title });

    return title;
  } catch (error) {
    console.error('Failed to generate title from chat history:', error);
    return null;
  }
}
