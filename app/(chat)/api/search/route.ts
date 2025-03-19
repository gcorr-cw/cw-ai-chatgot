import { auth } from '@/app/(auth)/auth';
import { getChatsByUserId, searchChatsByUser } from '@/lib/db/queries';

export async function GET(request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json('Unauthorized!', { status: 401 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim() || '';

  console.log(`Search API called with query: "${query}"`);

  // If no query, return all chats (same as history endpoint)
  if (!query) {
    const chats = await getChatsByUserId({ id: session.user.id! });
    console.log(`No query provided, returning all ${chats.length} chats`);
    return Response.json(chats);
  }

  // Otherwise, do a single indexed full-text search for matches
  try {
    console.log(`Performing search for user ${session.user.id} with query: "${query}"`);
    const searchResults = await searchChatsByUser({
      userId: session.user.id!,
      query,
    });

    console.log(`Search returned ${searchResults.length} results`);
    return Response.json(searchResults);
  } catch (error) {
    console.error('Search error:', error);
    return Response.json({ error: 'Failed to search chats' }, { status: 500 });
  }
}
