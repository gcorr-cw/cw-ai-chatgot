import { auth } from '@/app/(auth)/auth';
import { getChatsByUserId, getMessagesByChatId } from '@/lib/db/queries';
import { type Chat, type Message } from '@/lib/db/schema';

export async function GET(request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json('Unauthorized!', { status: 401 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.toLowerCase() || '';

  if (!query) {
    // If no query, return all chats (same as history endpoint)
    // biome-ignore lint: Forbidden non-null assertion.
    const chats = await getChatsByUserId({ id: session.user.id! });
    return Response.json(chats);
  }

  try {
    // Get all chats for the user
    // biome-ignore lint: Forbidden non-null assertion.
    const chats = await getChatsByUserId({ id: session.user.id! });
    
    // Array to store search results
    const searchResults: Chat[] = [];
    
    // First, find chats with matching titles
    const titleMatchChats = chats.filter(chat => 
      chat.title.toLowerCase().includes(query)
    );
    
    // Add title matches to results
    searchResults.push(...titleMatchChats);
    
    // For chats that didn't match by title, check their messages
    const nonMatchingChats = chats.filter(chat => 
      !titleMatchChats.some(matchChat => matchChat.id === chat.id)
    );
    
    // For each non-matching chat, fetch and check its messages
    for (const chat of nonMatchingChats) {
      const messages = await getMessagesByChatId({ id: chat.id });
      
      // Check if any message content includes the search query
      const hasMatchingMessage = messages.some(message => {
        // Since content is stored as JSON, we need to handle different content formats
        try {
          if (typeof message.content === 'string') {
            return message.content.toLowerCase().includes(query);
          } else if (typeof message.content === 'object') {
            // Convert the content object to a string for searching
            const contentStr = JSON.stringify(message.content);
            return contentStr.toLowerCase().includes(query);
          }
          return false;
        } catch (e) {
          console.error('Error parsing message content', e);
          return false;
        }
      });
      
      // If any message matched, add this chat to results
      if (hasMatchingMessage) {
        searchResults.push(chat);
      }
    }
    
    return Response.json(searchResults);
  } catch (error) {
    console.error('Search error:', error);
    return Response.json({ error: 'Failed to search chats' }, { status: 500 });
  }
}
