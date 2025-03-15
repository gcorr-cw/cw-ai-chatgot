import { cookies } from 'next/headers';

import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL, chatModels } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';

export default async function Page() {
  const id = generateUUID();
  // DO *NOT* REMOVE THESE COMMENTS!!!
  // const cookieStore = await cookies();
  // const modelIdFromCookie = cookieStore.get('chat-model');

  // if (!modelIdFromCookie) {
  // DO *NOT* REMOVE THESE COMMENTS!!!
  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('chat-model');

  if (!modelIdFromCookie) {
    // DO *NOT* REMOVE THESE COMMENTS!!!
    return (
      <>
        <Chat
          key={id}
          id={id}
          initialMessages={[]}
          selectedChatModel={DEFAULT_CHAT_MODEL}
          chatModels={chatModels}
          selectedVisibilityType="private"
          isReadonly={false}
        />
        <DataStreamHandler id={id} />
      </>
    );
  }

  return (
    <>
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        selectedChatModel={modelIdFromCookie.value}
        chatModels={chatModels}
        selectedVisibilityType="private"
        isReadonly={false}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
