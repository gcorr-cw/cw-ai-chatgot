import { useState, useEffect } from 'react';
import type { Attachment } from 'ai';

/**
 * Hook to manage attachments with server-side URL refreshing
 * This ensures all S3 interactions happen through the server, not client-side
 */
export function useAttachments(initialAttachments?: Attachment[]) {
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh attachment URLs when component mounts or attachments change
  useEffect(() => {
    if (!initialAttachments || initialAttachments.length === 0) {
      setAttachments([]);
      return;
    }

    const refreshAttachmentUrls = async () => {
      // Only process attachments that have a name (pathname)
      const pathnames = initialAttachments
        .map(attachment => attachment.name)
        .filter(Boolean) as string[];
      
      if (pathnames.length === 0) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/files/get-attachments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pathnames }),
        });

        if (!response.ok) {
          throw new Error('Failed to refresh attachment URLs');
        }

        const { attachments: refreshedAttachments } = await response.json();
        
        // Update attachments with fresh URLs
        setAttachments(
          initialAttachments.map(attachment => {
            const refreshed = refreshedAttachments.find(
              (item: any) => item.pathname === attachment.name
            );
            
            if (refreshed) {
              return {
                ...attachment,
                url: refreshed.url
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
