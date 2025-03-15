'use client';

import type {
  Attachment,
  ChatRequestOptions,
  CreateMessage,
  Message,
} from 'ai';
import cx from 'classnames';
import type React from 'react';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
  memo,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';

import { sanitizeUIMessages } from '@/lib/utils';
import { isAttachmentTypeSupported, getSupportedAttachmentTypesFormatted, getSupportedFileExtensions } from '@/lib/ai/models';
import {
  getFileTypeCategory,
  getSupportedFileTypeCategories
} from '@/lib/attachments/types';

import { ExtendedAttachment } from '@/lib/types/attachment';

// 10MB file size limit
const FILE_SIZE_LIMIT = 10 * 1024 * 1024;

import { ArrowUpIcon, PaperclipIcon, StopIcon } from './icons';
import { PreviewAttachment } from './preview-attachment';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { SuggestedActions } from './suggested-actions';
import SpeechRecognitionButton, { SpeechRecognitionRef } from './speech-recognition-button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Code, EllipsisVertical, FileText, Image, MenuIcon, Table } from 'lucide-react';
import equal from 'fast-deep-equal';

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  isLoading,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  append,
  reload,
  handleSubmit,
  className,
  selectedModelId,
  chatModels,
  selectedModel,
}: {
  chatId: string;
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  stop: () => void;
  attachments: ExtendedAttachment[];
  setAttachments: Dispatch<SetStateAction<ExtendedAttachment[]>>;
  messages: Array<Message>;
  setMessages: Dispatch<SetStateAction<Array<Message>>>;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
  reload?: () => void;
  handleSubmit: (
    event?: {
      preventDefault?: () => void;
    },
    chatRequestOptions?: ChatRequestOptions,
  ) => void;
  className?: string;
  selectedModelId: string;
  chatModels: any;
  selectedModel: any;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();
  const speechRecognitionRef = useRef<SpeechRecognitionRef>(null);

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';

      // Calculate the new height based on content
      const newHeight = Math.min(textareaRef.current.scrollHeight + 2, 300);
      textareaRef.current.style.height = `${newHeight}px`;

      // Enable scrolling if content exceeds max height
      if (textareaRef.current.scrollHeight > 300) {
        textareaRef.current.style.overflowY = 'auto';
      } else {
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  };

  const resetHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '98px';
      textareaRef.current.style.overflowY = 'hidden';
    }
  };

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    'input',
    '',
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || '';
      setInput(finalValue);
      adjustHeight();
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    adjustHeight();
    // Stop speech recognition if it's active when the user types
    if (speechRecognitionRef.current?.isRecording()) {
      console.log('Stopping speech recognition due to manual text input');
      speechRecognitionRef.current.stopRecording();
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);

  const submitForm = useCallback(() => {
    window.history.replaceState({}, '', `/chat/${chatId}`);

    // Stop speech recognition if it's active
    if (speechRecognitionRef.current?.isRecording()) {
      console.log('Stopping speech recognition before submitting message');
      speechRecognitionRef.current.stopRecording();
    }

    handleSubmit(undefined, {
      experimental_attachments: attachments,
    });

    setAttachments([]);
    setLocalStorageInput('');
    resetHeight();

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    attachments,
    handleSubmit,
    setAttachments,
    setLocalStorageInput,
    width,
    chatId,
  ]);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log(`Uploading file ${file.name} to API...`);
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Upload response data:', {
          ...data,
          url: data.url?.substring(0, 30) + '...'
        });

        // Extract all relevant fields from the response, including objectName and name
        const { url, contentType, objectName, name } = data;

        return {
          url,
          objectName, // Include the unique S3 object key
          name: name || objectName, // Use original filename if available, fall back to objectName
          contentType,
        };
      }
      const { error } = await response.json();
      toast.error(error);
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Failed to upload file, please try again!');
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);

    // Validate file size
    const oversizedFiles = files.filter((file) => file.size > FILE_SIZE_LIMIT);
    if (oversizedFiles.length > 0) {
      toast.error(
        `File size exceeds the ${FILE_SIZE_LIMIT / (1024 * 1024)}MB limit: ${oversizedFiles
          .map((file) => file.name)
          .join(', ')}`,
      );

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      return;
    }

    // Get the current model information - always fetch fresh to ensure we have the latest
    const currentModelId = selectedModelId;
    const currentModel = chatModels && chatModels.length > 0 ?
      chatModels.find((model: any) => model.id === currentModelId) : null;
    const currentModelName = currentModel?.name || 'the selected model';

    // Get the supported MIME types and extensions for the current model
    const supportedMimeTypes = currentModel?.supportedAttachmentTypes || [];
    const supportedExtensions = getSupportedFileExtensions(currentModelId);

    // Check if any files are unsupported
    const unsupportedFiles = files.filter(file => {
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';

      // First check by extension (more reliable for markdown files)
      if (supportedExtensions.includes(fileExtension)) {
        return false; // File is supported
      }

      // Then fall back to MIME type check
      return !isAttachmentTypeSupported(currentModelId, file.type);
    });

    if (unsupportedFiles.length > 0) {
      // Collect categories of unsupported files
      const unsupportedCategories = new Set<string>();
      unsupportedFiles.forEach(file => {
        const category = getFileTypeCategory(file.type, file.name);
        if (category !== 'Unknown' && category !== 'Other') {
          unsupportedCategories.add(category);
        }
      });

      // Get supported categories for the selected model
      const supportedCategories = getSupportedFileTypeCategories(supportedMimeTypes);

      // Format the list of supported categories as a bulleted list
      const supportedCategoriesList = supportedCategories
        .map(category => `- ${category}`)
        .join('\n');

      // Format the unsupported categories with bold
      const unsupportedCategoriesBold = Array.from(unsupportedCategories)
        .map(category => `**${category}**`)
        .join(', ');

      toast.error(
        (
          <div className="whitespace-pre-line">
            {`${unsupportedCategoriesBold} file types are not supported by ${currentModelName}.

Supported types:
${supportedCategoriesList}`}
          </div>
        ),
        {
          duration: 5000,
        }
      );
    }

    // Filter out unsupported files
    const supportedFiles = files.filter(file => {
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';

      // First check by extension (more reliable for markdown files)
      if (supportedExtensions.includes(fileExtension)) {
        return true; // File is supported
      }

      // Then fall back to MIME type check
      return isAttachmentTypeSupported(currentModelId, file.type);
    });

    if (supportedFiles.length === 0) {
      return;
    }

    // Continue with supported files only
    setUploadQueue(supportedFiles.map((file) => file.name));

    try {
      const uploadPromises = supportedFiles.map((file) => uploadFile(file));
      const uploadedAttachments = await Promise.all(uploadPromises);
      const successfullyUploadedAttachments = uploadedAttachments.filter(
        (attachment) => attachment !== undefined
      );

      setAttachments((currentAttachments) => [
        ...currentAttachments,
        ...successfullyUploadedAttachments,
      ]);
    } catch (error) {
      console.error('Error uploading files!', error);
    } finally {
      setUploadQueue([]);
    }
  };

  return (
    <div className="relative w-full flex flex-col gap-4">
      {messages.length === 0 &&
        attachments.length === 0 &&
        uploadQueue.length === 0 && (
          <SuggestedActions
            append={append}
            chatId={chatId}
            visible={false}
          />
        )}

      <input
        type="file"
        className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        tabIndex={-1}
      />

      {(attachments.length > 0 || uploadQueue.length > 0) && (
        <div data-testid="attachments-preview" className="flex flex-wrap gap-2">
          {uploadQueue.map((filename) => (
            <div
              key={filename}
              className="flex items-center gap-2 rounded-md bg-muted px-2 py-1"
            >
              <div className="text-xs text-muted-foreground">
                Uploading {filename}...
              </div>
            </div>
          ))}
          {attachments.map((attachment) => (
            <PreviewAttachment
              key={attachment.url}
              attachment={attachment}
              onRemove={() => {
                setAttachments(
                  attachments.filter(
                    (a) =>
                      a.url !== attachment.url,
                  ),
                );
              }}
            />
          ))}
        </div>
      )}

      <div className="relative">
        <div className="relative min-h-[24px] max-h-[344px] overflow-hidden rounded-2xl bg-muted dark:border-zinc-700">
          <Textarea
            data-testid="multimodal-input"
            ref={textareaRef}
            placeholder="Send a message..."
            value={input}
            onChange={handleInput}
            className={cx(
              'min-h-[24px] max-h-[300px] overflow-y-auto resize-none rounded-t-2xl !text-base bg-muted border-none dark:border-zinc-700',
              className,
            )}
            style={{ marginBottom: '44px' }}
            rows={2}
            autoFocus
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();

                if (isLoading) {
                  toast.error('Please wait for the model to finish its response!');
                } else {
                  submitForm();
                }
              }
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 p-2 flex flex-row justify-between bg-muted rounded-b-2xl">
            <div className="flex flex-row">
              <AttachmentsButton fileInputRef={fileInputRef} isLoading={isLoading} />
              <SpeechRecognitionButton
                ref={speechRecognitionRef}
                onTranscript={(text) => {
                  // Update the input value with the new transcript
                  setInput(input + (input ? ' ' : '') + text);

                  // Force a layout update by using setTimeout
                  setTimeout(() => {
                    if (textareaRef.current) {
                      // Ensure the height adjusts properly
                      adjustHeight();

                      // Force focus on the textarea to ensure proper layout
                      textareaRef.current.focus();
                    }
                  }, 0);
                }}
                isLoading={isLoading}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-md rounded-bl-lg p-[7px] w-[30px] h-fit dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200"
                    disabled={isLoading}
                    aria-disabled={isLoading}
                  >
                    <EllipsisVertical size={18} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <div className="px-2 py-1.5 text-sm font-semibold">Generate:</div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Code className="mr-2 h-4 w-4" />
                    Code
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Image className="mr-2 h-4 w-4" />
                    Images
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Table className="mr-2 h-4 w-4" />
                    Sheets
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <FileText className="mr-2 h-4 w-4" />
                    Docs
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-row">
              {isLoading ? (
                <StopButton stop={stop} setMessages={setMessages} />
              ) : (
                <SendButton
                  input={input}
                  submitForm={submitForm}
                  uploadQueue={uploadQueue}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    // Check if model changed and there are incompatible attachments
    if (prevProps.selectedModelId !== nextProps.selectedModelId && nextProps.attachments.length > 0) {
      const incompatibleAttachments = nextProps.attachments.filter(
        attachment => !isAttachmentTypeSupported(nextProps.selectedModelId, attachment.contentType || '')
      );

      if (incompatibleAttachments.length > 0) {
        const supportedTypes = getSupportedAttachmentTypesFormatted(nextProps.selectedModelId);

        // Get the model name
        const modelName = nextProps.selectedModel?.name ||
          (nextProps.chatModels && nextProps.chatModels.length > 0 ?
            nextProps.chatModels.find((model: any) => model.id === nextProps.selectedModelId)?.name : null) ||
          'the selected model';

        // Get supported categories for the selected model
        const supportedMimeTypes = (nextProps.chatModels && nextProps.chatModels.length > 0 ?
          nextProps.chatModels.find((model: any) => model.id === nextProps.selectedModelId)?.supportedAttachmentTypes : null) || [];
        const supportedCategories = getSupportedFileTypeCategories(supportedMimeTypes);

        // Format the list of supported categories as a bulleted list
        const supportedCategoriesList = supportedCategories
          .map(category => `- ${category}`)
          .join('\n');

        toast.error(
          (
            <div className="whitespace-pre-line">
              {`Some attachments are not supported by ${modelName}.

Supported types:
${supportedCategoriesList}`}
            </div>
          ),
          {
            duration: 10000,
          }
        );

        // Remove incompatible attachments
        nextProps.setAttachments(
          nextProps.attachments.filter(
            attachment => isAttachmentTypeSupported(nextProps.selectedModelId, attachment.contentType || '')
          )
        );
      }
    }

    if (prevProps.input !== nextProps.input) return false;
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.attachments.length !== nextProps.attachments.length) return false;
    return true;
  },
);

function PureAttachmentsButton({
  fileInputRef,
  isLoading,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  isLoading: boolean;
}) {
  return (
    <Button
      data-testid="attachments-button"
      className="rounded-md rounded-bl-lg p-[7px] h-fit dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200"
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      disabled={isLoading}
      aria-disabled={isLoading}
      variant="ghost"
    >
      <PaperclipIcon size={18} />
    </Button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton);

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: Dispatch<SetStateAction<Array<Message>>>;
}) {
  return (
    <Button
      data-testid="stop-button"
      variant="sendButton"
      size="sendLarge"
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => sanitizeUIMessages(messages));
      }}
      aria-disabled={false}
    >
      <StopIcon size={18} />
    </Button>
  );
}

const StopButton = memo(PureStopButton);

function PureSendButton({
  submitForm,
  input,
  uploadQueue,
}: {
  submitForm: () => void;
  input: string;
  uploadQueue: Array<string>;
}) {
  return (
    <Button
      data-testid="send-button"
      variant="sendButton"
      size="sendLarge"
      onClick={(event) => {
        event.preventDefault();
        submitForm();
      }}
      disabled={input.length === 0 || uploadQueue.length > 0}
      aria-disabled={input.length === 0 || uploadQueue.length > 0}
    >
      <ArrowUpIcon size={12} />
    </Button>
  );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.uploadQueue.length !== nextProps.uploadQueue.length)
    return false;
  if (prevProps.input !== nextProps.input) return false;
  return true;
});
