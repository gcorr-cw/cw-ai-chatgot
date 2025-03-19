import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import { and, asc, desc, eq, gt, gte, inArray, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  chat,
  document,
  message,
  suggestion,
  user,
  vote,
} from './schema';

// Define rawSql as an alias for sql
const rawSql = sql;

import {
  type User,
  type Suggestion,
  type Message,
} from './schema';

import { type ArtifactKind } from '@/components/artifact';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

/**
 * Search Chat rows (by title), their associated Message rows (by content),
 * and Document rows (by title and content) for the given userId,
 * matching the provided query string using full-text search.
 *
 * Assumes you have GIN indexes on the "search_tsv" column of Chat, Message, and Document tables.
 */
export async function searchChatsByUser({
  userId,
  query,
}: {
  userId: string;
  query: string;
}): Promise<(typeof chat.$inferSelect & { matchType?: 'title' | 'message' | 'both' | 'document' })[]> {
  try {
    if (!query.trim()) {
      return [];
    }

    // First, get all matching chats from chat titles and message content in a single query
    // This is more efficient than separate queries
    const combinedResults = await db
      .select({
        chat: chat,
        matchInTitle: rawSql`${chat.search_tsv} @@ plainto_tsquery('english', ${query})`,
        matchInMessage: rawSql`EXISTS (
          SELECT 1 FROM "Message" m 
          WHERE m."chatId" = ${chat.id} 
          AND m.search_tsv @@ plainto_tsquery('english', ${query})
        )`
      })
      .from(chat)
      .where(
        and(
          eq(chat.userId, userId),
          or(
            rawSql`${chat.search_tsv} @@ plainto_tsquery('english', ${query})`,
            rawSql`EXISTS (
              SELECT 1 FROM "Message" m 
              WHERE m."chatId" = ${chat.id} 
              AND m.search_tsv @@ plainto_tsquery('english', ${query})
            )`
          )
        )
      )
      .orderBy(desc(chat.createdAt));

    // Process results to add matchType
    const chatResults = combinedResults.map(result => {
      let matchType: 'title' | 'message' | 'both' = 'message';
      
      if (result.matchInTitle && result.matchInMessage) {
        matchType = 'both';
      } else if (result.matchInTitle) {
        matchType = 'title';
      }
      
      return {
        ...result.chat,
        matchType
      };
    });

    // Track all chat IDs we've already found to avoid duplicates
    const chatIdSet = new Set(chatResults.map(chat => chat.id));

    // Now search documents and find their associated chats
    // This is a more efficient approach that avoids the "always truthy" lint error
    
    // First, find matching documents
    const matchingDocuments = await db
      .select({
        id: document.id
      })
      .from(document)
      .where(
        and(
          eq(document.userId, userId),
          // Use the SQL template literal for the full-text search
          sql`${document.search_tsv} @@ plainto_tsquery('english', ${query})`
        )
      );
    
    // Extract document IDs
    const matchingDocIds = matchingDocuments.map(doc => doc.id);
    
    // If we found matching documents, find chats that reference them
    let documentChatIds: string[] = [];
    
    if (matchingDocIds.length > 0) {
      // Find messages that reference these document IDs
      const documentChatMatches = await db
        .select({
          chatId: message.chatId
        })
        .from(message)
        .innerJoin(
          chat,
          eq(message.chatId, chat.id)
        )
        .where(
          and(
            eq(chat.userId, userId),
            // For each document ID, check if it's referenced in the message content
            or(...matchingDocIds.map(docId => 
              sql`${message.content}::text LIKE ${'%' + docId + '%'}`
            ))
          )
        );
      
      // Extract unique chat IDs that we haven't seen yet
      documentChatIds = Array.from(new Set(
        documentChatMatches
          .map(match => match.chatId)
          .filter(chatId => chatId && !chatIdSet.has(chatId))
      ));
    }
    
    // Fetch the full chat objects for these IDs
    let documentChatResults: (typeof chat.$inferSelect & { matchType: 'document' })[] = [];
    
    if (documentChatIds.length > 0) {
      const documentChats = await db
        .select()
        .from(chat)
        .where(
          inArray(chat.id, documentChatIds)
        );
      
      documentChatResults = documentChats.map(chatResult => ({
        ...chatResult,
        matchType: 'document' as const
      }));
    }

    // Combine all results
    const allResults = [...chatResults, ...documentChatResults];

    // Sort by creation date (newest first)
    allResults.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    console.log(`Search found ${allResults.length} results`);
    return allResults;
  } catch (error) {
    console.error('Failed to search chats in database', error);
    throw error;
  }
}

// --------------------------------------------------------------------
// The remainder of your existing queries below remains unchanged.
// --------------------------------------------------------------------

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error('Failed to get user from database');
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    return await db.insert(user).values({ email, password: hash });
  } catch (error) {
    console.error('Failed to create user in database');
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
    });
  } catch (error) {
    console.error('Failed to save chat in database');
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));

    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error('Failed to delete chat by id from database');
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error('Failed to get chats by user from database');
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error('Failed to get chat by id from database');
    throw error;
  }
}

export async function saveMessages({ messages }: { messages: Array<Message> }) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    console.error('Failed to save messages in database', error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error('Failed to get messages by chat id from database', error);
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    console.error('Failed to upvote message in database', error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error('Failed to get votes by chat id from database', error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db.insert(document).values({
      id,
      title,
      kind,
      content,
      userId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to save document in database');
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
  } catch (error) {
    console.error(
      'Failed to delete documents by id after timestamp from database',
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error('Failed to save suggestions in database');
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error('Failed to get suggestions by document version from database');
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error('Failed to get message by id from database');
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((m) => m.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)));

      return await db
        .delete(message)
        .where(and(eq(message.chatId, chatId), inArray(message.id, messageIds)));
    }
  } catch (error) {
    console.error(
      'Failed to delete messages by id after timestamp from database',
      error,
    );
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error('Failed to update chat visibility in database', error);
    throw error;
  }
}

export async function updateChatTitle({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  try {
    return await db.update(chat).set({ title }).where(eq(chat.id, id));
  } catch (error) {
    console.error('Failed to update chat title in database', error);
    throw error;
  }
}
