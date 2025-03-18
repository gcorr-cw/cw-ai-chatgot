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
  type DragEvent,
  memo,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';

import { sanitizeUIMessages, generateUUID } from '@/lib/utils';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from './ui/dropdown-menu';
import { Code, CornerDownLeft, EllipsisVertical, FileText, Image, Table, WrapText, Check, Search } from 'lucide-react';
import equal from 'fast-deep-equal';

export function PureMultimodalInput({
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionRef>(null);
  const { width } = useWindowSize();
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Function to adjust textarea height based on content
  const adjustHeight = () => {
    if (textareaRef.current) {
      // Reset height first to get accurate scrollHeight
      textareaRef.current.style.height = 'auto';
      
      // Calculate and set the new height
      const newHeight = Math.min(textareaRef.current.scrollHeight + 2, 300);
      textareaRef.current.style.height = `${newHeight}px`;
      
      // Set overflow based on content height
      textareaRef.current.style.overflowY = 
        textareaRef.current.scrollHeight > 300 ? 'auto' : 'hidden';
    }
  };

  // Function to reset textarea height
  const resetHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '98px';
      textareaRef.current.style.overflowY = 'hidden';
    }
  };

  // Effect to adjust height when input changes
  useEffect(() => {
    if (textareaRef.current) {
      requestAnimationFrame(adjustHeight);
    }
  }, [input]);

  // Effect to adjust height on initial render
  useEffect(() => {
    // Check if we have a textarea ref and input
    if (!textareaRef.current || !input) return;

    // Function to properly adjust the height
    const forceHeightAdjustment = () => {
      if (textareaRef.current) {
        // First set a minimal height
        textareaRef.current.style.height = '24px';
        
        // Force browser to recalculate layout
        void textareaRef.current.offsetHeight;
        
        // Now set height based on content
        const scrollHeight = textareaRef.current.scrollHeight;
        const newHeight = Math.min(scrollHeight + 2, 300);
        textareaRef.current.style.height = `${newHeight}px`;
        
        // Set overflow based on content height
        textareaRef.current.style.overflowY = 
          scrollHeight > 300 ? 'auto' : 'hidden';
      }
    };

    // Try multiple times with different techniques
    
    // 1. Immediate call
    forceHeightAdjustment();
    
    // 2. After a short delay (microtask)
    Promise.resolve().then(forceHeightAdjustment);
    
    // 3. In the next animation frame
    requestAnimationFrame(forceHeightAdjustment);
    
    // 4. After short timeouts with increasing delays
    const timers = [
      setTimeout(forceHeightAdjustment, 0),
      setTimeout(forceHeightAdjustment, 100),
      setTimeout(forceHeightAdjustment, 300)
    ];
    
    // 5. When the window is fully loaded
    const handleLoad = () => {
      forceHeightAdjustment();
      // Try one more time after a short delay
      setTimeout(forceHeightAdjustment, 100);
    };
    
    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
    }
    
    // Cleanup
    return () => {
      timers.forEach(timer => clearTimeout(timer));
      window.removeEventListener('load', handleLoad);
    };
  }, []); // Empty dependency array = run once on mount

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
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null);

  // Create a wrapper function that will include the artifact prefix in the message
  const handleSubmitWithArtifact = useCallback(
    (event?: { preventDefault?: () => void }, chatRequestOptions?: ChatRequestOptions) => {
      if (selectedArtifact) {
        // Map of artifact types to their key phrases
        const keyPhrases: Record<string, string> = {
          'code': '/code: ',
          'images': '/image: Please generate an image of ',
          'sheets': '/sheet: ',
          'docs': '/doc: ',
          'web-search': '/search: '
        };

        // Get the key phrase for the selected artifact
        const keyPhrase = keyPhrases[selectedArtifact];
        const originalInput = input;
        
        // Create a new message with the key phrase prepended
        const userMessage: Message = {
          id: generateUUID(),
          role: 'user',
          content: keyPhrase + originalInput,
          createdAt: new Date()
        };
        
        // Use append instead of handleSubmit to directly add the message with our modified content
        append(userMessage, {
          experimental_attachments: attachments,
        });
        
        // Reset after sending
        setSelectedArtifact(null);
      } else {
        // Normal submission without artifact key phrase
        handleSubmit(event, chatRequestOptions);
      }
    },
    [input, selectedArtifact, append, attachments, handleSubmit]
  );

  const submitForm = useCallback(() => {
    window.history.replaceState({}, '', `/chat/${chatId}`);

    // Stop speech recognition if it's active
    if (speechRecognitionRef.current?.isRecording()) {
      console.log('Stopping speech recognition before submitting message');
      speechRecognitionRef.current.stopRecording();
    }

    // Use our wrapper to handle the submission
    handleSubmitWithArtifact(undefined, {
      experimental_attachments: attachments,
    });

    setInput('');
    setAttachments([]);
    resetHeight();
    
    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    attachments,
    handleSubmitWithArtifact,
    setAttachments,
    width,
    chatId,
    setInput
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
    await processFiles(files);
  };

  // Extract file processing logic to be reused by both input change and drop handlers
  const processFiles = async (files: File[]) => {
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

  // Handle drag events
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set to false if we're leaving the container (not entering a child element)
    // Check if the relatedTarget (where the pointer is going) is a child of the container
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return; // Don't set to false if we're just moving to a child element
    }
    
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    // Check if files were dropped
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      await processFiles(files);
    }
  };

  // Handle paste events for images
  const handlePaste = async (e: React.ClipboardEvent) => {
    // Continue with default paste behavior for text
    if (!e.clipboardData.items) return;
    
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));
    
    if (imageItems.length === 0) return; // No images in clipboard
    
    // Prevent default paste only if we found images
    // This allows normal text pasting to work as expected
    e.preventDefault();
    
    try {
      const files = await Promise.all(
        imageItems.map(async (item) => {
          const blob = item.getAsFile();
          if (!blob) return null;
          
          // Generate a filename with timestamp and type
          const extension = blob.type.split('/')[1] || 'png';
          const filename = `pasted-image-${Date.now()}.${extension}`;
          
          // Create a new File object with a proper name
          return new File([blob], filename, { type: blob.type });
        })
      );
      
      // Filter out any null values and process the files
      const validFiles = files.filter(file => file !== null) as File[];
      if (validFiles.length > 0) {
        await processFiles(validFiles);
        toast.success(`Pasted ${validFiles.length} image${validFiles.length > 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error('Error processing pasted image:', error);
      toast.error('Failed to process pasted image');
    }
  };

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    
    // Force a layout update to ensure proper height calculation
    requestAnimationFrame(adjustHeight);
    
    // Auto-scroll only when typing at the bottom
    if (textareaRef.current && textareaRef.current.scrollHeight > 300) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          // Get cursor position
          const cursorPosition = textareaRef.current.selectionStart;
          const value = textareaRef.current.value;
          
          // Calculate how close to the end the cursor is
          const distanceFromEnd = value.length - cursorPosition;
          
          // Only auto-scroll if cursor is near the end (within ~2 lines of text)
          if (distanceFromEnd < 150) {
            textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
          }
        }
      });
    }
    // Stop speech recognition if it's active when the user types
    if (speechRecognitionRef.current?.isRecording()) {
      console.log('Stopping speech recognition due to manual text input');
      speechRecognitionRef.current.stopRecording();
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

      <div 
        className="relative"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div 
          className={cx(
            "relative min-h-[24px] max-h-[344px] overflow-hidden rounded-2xl bg-muted dark:border-zinc-700",
            isDraggingOver && "ring-2 ring-blue-500 dark:ring-blue-400"
          )}
        >
          {isDraggingOver && (
            <div className="absolute inset-0 bg-blue-100/30 dark:bg-blue-900/30 flex items-center justify-center z-10 pointer-events-none">
              <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg px-4 py-2 text-sm font-medium">
                Drop files to upload
              </div>
            </div>
          )}
          <Textarea
            data-testid="multimodal-input"
            ref={textareaRef}
            placeholder="Send a message..."
            value={input}
            onChange={handleInput}
            onPaste={handlePaste}
            className={cx(
              'min-h-[24px] max-h-[300px] overflow-y-auto resize-none rounded-t-2xl !text-base bg-muted border-none dark:border-zinc-700 placeholder:text-zinc-400 dark:placeholder:text-zinc-400/80',
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
                      requestAnimationFrame(adjustHeight);

                      // Force focus on the textarea to ensure proper layout
                      textareaRef.current.focus();
                    }
                  }, 0);
                }}
                isLoading={isLoading}
              />
              <Button
                variant="ghost"
                size="icon"
                className="rounded-md rounded-bl-lg p-[7px] w-[30px] h-fit dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200 text-gray-700 dark:text-gray-300"
                disabled={isLoading}
                aria-disabled={isLoading}
                onClick={(e) => {
                  e.preventDefault(); // Prevent form submission
                  if (textareaRef.current) {
                    const textarea = textareaRef.current;
                    
                    // Force focus on the textarea to ensure we can get/set selection
                    textarea.focus();
                    
                    // Get current cursor position after ensuring focus
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    
                    // Insert a new line at cursor position
                    const newValue = input.substring(0, start) + '\n' + input.substring(end);
                    setInput(newValue);
                    
                    // Set cursor position after the inserted new line
                    // Use setTimeout to ensure the DOM updates before setting selection
                    setTimeout(() => {
                      textarea.selectionStart = start + 1;
                      textarea.selectionEnd = start + 1;
                      // Adjust height after inserting new line
                      adjustHeight();
                    }, 0);
                  }
                }}
                title="Insert new line (Hint: Press Shift+Enter)"
              >
                <CornerDownLeft size={18} />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`rounded-md rounded-bl-lg p-[7px] w-[30px] h-fit dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200 text-gray-700 dark:text-gray-300 ${selectedArtifact ? 'bg-blue-200 dark:bg-blue-600/70' : ''}`}
                    disabled={isLoading}
                    aria-disabled={isLoading}
                    onClick={(e) => {
                      // Stop propagation to prevent other click handlers
                      e.stopPropagation();
                    }}
                  >
                    <EllipsisVertical size={18} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="start"
                  onCloseAutoFocus={(e) => {
                    // Prevent the default autofocus behavior
                    e.preventDefault();
                    // Focus the textarea
                    if (textareaRef.current) {
                      textareaRef.current.focus();
                    }
                  }}
                >
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Generate</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => setSelectedArtifact(selectedArtifact === 'images' ? null : 'images')}
                    className={selectedArtifact === 'images' ? 'bg-blue-200 dark:bg-blue-600/70' : ''}
                  >
                    <Image className="mr-2 h-4 w-4" />
                    Image
                    {selectedArtifact === 'images' && <Check className="ml-auto h-4 w-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSelectedArtifact(selectedArtifact === 'code' ? null : 'code')}
                    className={selectedArtifact === 'code' ? 'bg-blue-200 dark:bg-blue-600/70' : ''}
                  >
                    <Code className="mr-2 h-4 w-4" />
                    Code
                    {selectedArtifact === 'code' && <Check className="ml-auto h-4 w-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSelectedArtifact(selectedArtifact === 'sheets' ? null : 'sheets')}
                    className={selectedArtifact === 'sheets' ? 'bg-blue-200 dark:bg-blue-600/70' : ''}
                  >
                    <Table className="mr-2 h-4 w-4" />
                    Spreadsheet
                    {selectedArtifact === 'sheets' && <Check className="ml-auto h-4 w-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSelectedArtifact(selectedArtifact === 'docs' ? null : 'docs')}
                    className={selectedArtifact === 'docs' ? 'bg-blue-200 dark:bg-blue-600/70' : ''}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Document
                    {selectedArtifact === 'docs' && <Check className="ml-auto h-4 w-4" />}
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Tools</DropdownMenuLabel>
                  
                  <DropdownMenuItem
                    onClick={() => setSelectedArtifact(selectedArtifact === 'web-search' ? null : 'web-search')}
                    className={selectedArtifact === 'web-search' ? 'bg-blue-200 dark:bg-blue-600/70' : ''}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Web Search
                    {selectedArtifact === 'web-search' && <Check className="ml-auto h-4 w-4" />}
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

        // Format the unsupported categories with bold
        const unsupportedCategoriesBold = Array.from(incompatibleAttachments)
          .map(attachment => `**${getFileTypeCategory(attachment.contentType || '', attachment.name)}**`)
          .join(', ');

        toast.error(
          (
            <div className="whitespace-pre-line">
              {`${unsupportedCategoriesBold} file types are not supported by ${modelName}.

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

function AttachmentsButton({
  fileInputRef,
  isLoading,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  isLoading: boolean;
}) {
  return (
    <Button
      data-testid="attachments-button"
      className="rounded-md rounded-bl-lg p-[7px] h-fit dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200 text-gray-700 dark:text-gray-300"
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

const AttachmentsButtonMemo = memo(AttachmentsButton);

function StopButton({
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

const StopButtonMemo = memo(StopButton);

function SendButton({
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

const SendButtonMemo = memo(SendButton, (prevProps, nextProps) => {
  if (prevProps.uploadQueue.length !== nextProps.uploadQueue.length)
    return false;
  if (prevProps.input !== nextProps.input) return false;
  return true;
});
