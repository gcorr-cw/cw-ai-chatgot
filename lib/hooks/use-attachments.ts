import { useState, useEffect } from 'react';
import type { Attachment } from 'ai';

/**
 * We rely on a single field objectName for S3 key references.
 */
interface ExtendedAttachment extends Attachment {
  objectName?: string;
}

/**
 * Hook to manage attachments with server-side URL refreshing.
 * This ensures all S3 interactions happen through the server, not client-side.
 */
export function useAttachments(initialAttachments?: ExtendedAttachment[]) {
  const [attachments, setAttachments] = useState<ExtendedAttachment[]>(initialAttachments || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh attachment URLs when component mounts or attachments change
  useEffect(() => {
    if (!initialAttachments || initialAttachments.length === 0) {
      setAttachments([]);
      return;
    }

    console.log(
      'useAttachments - Initial attachments:',
      initialAttachments.map((a) => ({
        name: a.name,
        objectName: a.objectName,
        contentType: a.contentType,
        url: a.url?.substring(0, 30) + '...',
      }))
    );

    setAttachments(initialAttachments);

    const refreshAttachmentUrls = async () => {
      // We'll build an array of the objectName or fallback to the attachment's name
      const objectNames = initialAttachments
        .map((attachment) => attachment.objectName || attachment.name)
        .filter(Boolean) as string[];

      console.log('useAttachments - Object names to refresh:', objectNames);

      if (objectNames.length === 0) return;

      setIsLoading(true);
      setError(null);

      try {
        // Call our updated endpoint with "objectNames" instead of pathnames
        const response = await fetch('/api/files/get-attachments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ objectNames }),
        });

        if (!response.ok) {
          throw new Error('Failed to refresh attachment URLs');
        }

        const { attachments: refreshedAttachments } = await response.json();

        // Update attachments with fresh URLs
        setAttachments(
          initialAttachments.map((attachment) => {
            const objectKey = attachment.objectName || attachment.name;
            const refreshed = refreshedAttachments.find(
              (item: any) => item.objectName === objectKey
            );

            if (refreshed) {
              return {
                ...attachment,
                url: refreshed.url,
              };
            }

            return attachment;
          })
        );
      } catch (err) {
        console.error('Error refreshing attachment URLs:', err);
        setError('Failed to load attachments');
        // Keep the original attachments even if refresh fails
        setAttachments(initialAttachments);
      } finally {
        setIsLoading(false);
      }
    };

    refreshAttachmentUrls();
  }, [initialAttachments]);

  return { attachments, isLoading, error };
}
