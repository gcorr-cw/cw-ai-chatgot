import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';

import { generateTitleFromChatHistory } from '@/app/(chat)/actions';
import { getChatById, updateChatTitle } from '@/lib/db/queries';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await req.json();
    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    // Verify the chat belongs to the user
    const chat = await getChatById({ id: chatId });
    if (!chat || chat.userId !== session.user.id) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Generate new title based on chat history
    const title = await generateTitleFromChatHistory({ chatId });
    if (!title) {
      return NextResponse.json({ error: 'Failed to generate title' }, { status: 500 });
    }

    // Update the chat title in the database
    await updateChatTitle({ id: chatId, title });

    return NextResponse.json({ title });
  } catch (error) {
    console.error('Error in auto-rename API route:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}
