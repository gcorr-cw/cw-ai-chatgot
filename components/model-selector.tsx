'use client';

import { startTransition, useMemo, useOptimistic, useState, useEffect } from 'react';
import { useChat } from 'ai/react';
import { toast } from 'sonner';

import { saveChatModelAsCookie } from '@/app/(chat)/actions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { chatModels, isAttachmentTypeSupported, getSupportedAttachmentTypesFormatted } from '@/lib/ai/models';
import { cn } from '@/lib/utils';

import { CheckCircleFillIcon, ChevronDownIcon } from './icons';

export function ModelSelector({
  selectedModelId,
  className,
}: {
  selectedModelId: string;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] =
    useOptimistic(selectedModelId);
  const { messages } = useChat();

  const selectedChatModel = useMemo(
    () => chatModels.find((chatModel) => chatModel.id === optimisticModelId),
    [optimisticModelId],
  );

  // Function to check for incompatible attachments when model changes
  const checkIncompatibleAttachments = (newModelId: string) => {
    if (!messages || messages.length === 0) return true;
    
    // Find all messages with attachments
    const messagesWithAttachments = messages.filter(
      message => message.experimental_attachments && message.experimental_attachments.length > 0
    );
    
    if (messagesWithAttachments.length === 0) return true;
    
    // Check if any attachments are incompatible with the selected model
    let incompatibleAttachmentsFound = false;
    let incompatibleTypes = new Set<string>();
    
    messagesWithAttachments.forEach(message => {
      if (message.experimental_attachments) {
        message.experimental_attachments.forEach(attachment => {
          const contentType = attachment.contentType || '';
          if (!isAttachmentTypeSupported(newModelId, contentType)) {
            incompatibleAttachmentsFound = true;
            incompatibleTypes.add(contentType);
          }
        });
      }
    });
    
    // Show warning if incompatible attachments found
    if (incompatibleAttachmentsFound) {
      const supportedTypes = getSupportedAttachmentTypesFormatted(newModelId);
      const modelName = chatModels.find(model => model.id === newModelId)?.name || newModelId;
      
      toast.warning(
        `This chat contains attachments that are not supported by ${modelName}. Some content may not be properly processed. Supported types: ${supportedTypes}`,
        {
          duration: 6000,
        }
      );
    }
    
    return true;
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
          className,
        )}
      >
        <Button variant="outline" className="md:px-2 md:h-[34px]">
          {selectedChatModel?.name}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[300px]">
        {chatModels.map((chatModel) => {
          const { id } = chatModel;

          return (
            <DropdownMenuItem
              key={id}
              onSelect={() => {
                setOpen(false);

                startTransition(() => {
                  // Check for incompatible attachments before changing the model
                  if (id !== optimisticModelId) {
                    checkIncompatibleAttachments(id);
                  }
                  
                  setOptimisticModelId(id);
                  saveChatModelAsCookie(id);
                });
              }}
              className="gap-4 group/item flex flex-row justify-between items-center"
              data-active={id === optimisticModelId}
            >
              <div className="flex flex-col gap-1 items-start">
                <div>{chatModel.name}</div>
                <div className="text-xs text-muted-foreground">
                  {chatModel.description}
                </div>
              </div>

              <div className="text-foreground dark:text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
                <CheckCircleFillIcon />
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
