'use client';

import type { Attachment, Message, ChatRequestOptions } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, generateUUID } from '@/lib/utils';
import { Artifact } from './artifact';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { isAttachmentTypeSupported, getSupportedFileExtensions } from '@/lib/ai/models';
import { getFileTypeCategory, getSupportedFileTypeCategories, ATTACHMENT_TYPES } from '@/lib/attachments/types';
import { toast } from 'sonner';

export function Chat({
  id,
  initialMessages,
  selectedChatModel,
  chatModels,
  selectedVisibilityType,
  isReadonly,
}: {
  id: string;
  initialMessages: Array<Message>;
  selectedChatModel: string;
  chatModels: Array<{ id: string; name?: string; supportedAttachmentTypes?: string[] }>;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const { mutate } = useSWRConfig();

  const previousModelRef = useRef(selectedChatModel);

  const {
    messages,
    setMessages,
    handleSubmit: originalHandleSubmit,
    input,
    setInput,
    append,
    isLoading,
    stop,
    reload,
  } = useChat({
    id,
    body: { id, selectedChatModel: selectedChatModel },
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onFinish: () => {
      mutate('/api/history');
    },
    onError: () => {
      toast.error('An error occured, please try again!');
    },
  });

  const { data: votes } = useSWR<Array<Vote>>(
    `/api/vote?chatId=${id}`,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  // Enhanced attachment compatibility check function
  const isAttachmentCompatibleWithModel = (attachment: Attachment, modelId: string): boolean => {
    if (!attachment.contentType) return true;

    // Use the existing function from lib/ai/models.ts
    return isAttachmentTypeSupported(modelId, attachment.contentType);
  };

  // Function to check if all attachments are compatible with the selected model
  const checkAttachmentCompatibility = useCallback(() => {
    // Collect all attachments
    const allAttachments: Attachment[] = [];

    // Add current attachments
    allAttachments.push(...attachments);

    // Add attachments from previous messages
    messages.forEach(message => {
      if (message.experimental_attachments && message.experimental_attachments.length > 0) {
        allAttachments.push(...message.experimental_attachments);
      }
    });

    // Find incompatible attachments
    const incompatibleAttachments = allAttachments.filter(
      attachment => !isAttachmentTypeSupported(selectedChatModel, attachment.contentType || '')
    );

    if (incompatibleAttachments.length > 0) {
      // Get categories of incompatible attachments
      const incompatibleCategories = new Set<string>();
      incompatibleAttachments.forEach(attachment => {
        const category = getFileTypeCategory(attachment.contentType || '', attachment.name || '');
        if (category !== 'Unknown' && category !== 'Other') {
          incompatibleCategories.add(category);
        }
      });

      // Get the model name
      const selectedModel = chatModels && chatModels.length > 0 ?
        chatModels.find(model => model.id === selectedChatModel) : null;
      const modelName = selectedModel?.name || 'the selected model';

      // Format the incompatible categories with bold
      const incompatibleCategoriesBold = Array.from(incompatibleCategories)
        .map(category => `**${category}**`)
        .join(', ');

      // Show the error message
      toast.error(
        (
          <div className="whitespace-pre-line">
            {`This conversation contains ${incompatibleCategoriesBold} attachments which are not supported by ${modelName}.

Please choose another model or start a new chat.`}
          </div>
        ),
        {
          duration: 5000,
        }
      );

      return false;
    }

    return true;
  }, [selectedChatModel, messages, attachments, chatModels]);

  // Custom submit handler to check for incompatible attachments
  const handleSubmit = useCallback(
    (
      event?: { preventDefault?: () => void } | undefined,
      chatRequestOptions?: ChatRequestOptions | undefined
    ) => {
      if (event?.preventDefault) {
        event.preventDefault();
      }

      // Check for incompatible attachments before submitting
      if (!checkAttachmentCompatibility()) {
        return;
      }

      // If all attachments are compatible, proceed with the original submit handler
      return originalHandleSubmit(event, chatRequestOptions);
    },
    [checkAttachmentCompatibility, originalHandleSubmit]
  );

  // Create a wrapper for the form submission
  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Check for incompatible attachments before submitting
    if (!checkAttachmentCompatibility()) {
      return;
    }

    // If all attachments are compatible, call the handleSubmit function
    handleSubmit();
  };

  // Create a compatible version of the form submission handler for MultimodalInput
  const handleSubmitForMultimodal = useCallback(
    (
      event?: { preventDefault?: () => void } | undefined,
      chatRequestOptions?: ChatRequestOptions | undefined
    ) => {
      if (event?.preventDefault) {
        event.preventDefault();
      }

      // Check for incompatible attachments
      if (!checkAttachmentCompatibility()) {
        return;
      }

      // If all attachments are compatible, call the original submit handler
      return originalHandleSubmit(event, chatRequestOptions);
    },
    [checkAttachmentCompatibility, originalHandleSubmit]
  );

  // Create a wrapper for the form submission that's compatible with the Artifact component
  const handleSubmitForArtifact = useCallback(
    (
      event?: { preventDefault?: () => void } | undefined,
      chatRequestOptions?: ChatRequestOptions | undefined
    ) => {
      if (event?.preventDefault) {
        event.preventDefault();
      }

      // Check for incompatible attachments
      if (!checkAttachmentCompatibility()) {
        return;
      }

      // If all attachments are compatible, call the original submit handler
      return originalHandleSubmit(event, chatRequestOptions);
    },
    [checkAttachmentCompatibility, originalHandleSubmit]
  );

  // Check for incompatible attachments in messages when model changes
  useEffect(() => {
    // Skip if it's the initial render or if the model hasn't changed
    if (previousModelRef.current === selectedChatModel) {
      previousModelRef.current = selectedChatModel;
      return;
    }

    // Store the new model ID for the next comparison
    previousModelRef.current = selectedChatModel;

    // Collect all attachments from all messages
    const allAttachments: Attachment[] = [];
    messages.forEach(message => {
      if (message.experimental_attachments && message.experimental_attachments.length > 0) {
        allAttachments.push(...message.experimental_attachments);
      }
    });

    // If there are no attachments, no need to check
    if (allAttachments.length === 0) return;

    // Find incompatible attachments
    const incompatibleAttachments = allAttachments.filter(
      attachment => !isAttachmentTypeSupported(selectedChatModel, attachment.contentType || '')
    );

    if (incompatibleAttachments.length > 0) {
      // Get categories of incompatible attachments
      const incompatibleCategories = new Set<string>();
      incompatibleAttachments.forEach(attachment => {
        const category = getFileTypeCategory(attachment.contentType || '', attachment.name || '');
        if (category !== 'Unknown' && category !== 'Other') {
          incompatibleCategories.add(category);
        }
      });

      // Get the model name
      const selectedModel = chatModels && chatModels.length > 0 ?
        chatModels.find(model => model.id === selectedChatModel) : null;
      const modelName = selectedModel?.name || 'the selected model';

      // Format the incompatible categories with bold
      const incompatibleCategoriesBold = Array.from(incompatibleCategories)
        .map(category => `**${category}**`)
        .join(', ');

      // Show the warning message
      toast.warning(
        (
          <div className="whitespace-pre-line">
            {`This conversation contains ${incompatibleCategoriesBold} attachments which are not supported by ${modelName}.

Please choose another model or start a new chat.`}
          </div>
        ),
        {
          duration: 5000,
        }
      );
    }
  }, [selectedChatModel, messages, chatModels]);

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <ChatHeader
          chatId={id}
          selectedModelId={selectedChatModel}
          selectedVisibilityType={selectedVisibilityType}
          isReadonly={isReadonly}
        />

        <Messages
          chatId={id}
          isLoading={isLoading}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
        />

        <form className="flex mx-auto bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl" onSubmit={onFormSubmit}>
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              isLoading={isLoading}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              append={append}
              reload={reload}
              handleSubmit={handleSubmitForMultimodal}
              //className="pb-4 md:pb-6"
              selectedModelId={selectedChatModel}
              chatModels={chatModels}
              selectedModel={chatModels && chatModels.length > 0 ? chatModels.find(model => model.id === selectedChatModel) || chatModels[0] : undefined}
            />
          )}
        </form>
      </div>

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmitForArtifact}
        isLoading={isLoading}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        messages={messages}
        setMessages={setMessages}
        append={append}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
        selectedModelId={selectedChatModel}
        chatModels={chatModels}
      />
    </>
  );
}
