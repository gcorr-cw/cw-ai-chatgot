import { useState, useEffect } from 'react';
import type { Attachment } from 'ai';

import { LoaderIcon } from './icons';

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
}: {
  attachment: Attachment;
  isUploading?: boolean;
}) => {
  const { name, url: initialUrl, contentType } = attachment;
  const [url, setUrl] = useState(initialUrl);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(false);

  // Function to refresh the URL if it expires
  const refreshUrl = async () => {
    if (!name) return;
    
    try {
      setIsRefreshing(true);
      const response = await fetch('/api/files/refresh-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pathname: name }),
      });

      if (response.ok) {
        const data = await response.json();
        setUrl(data.url);
        setError(false);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Failed to refresh attachment URL:', err);
      setError(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle image load errors (potentially expired URLs)
  const handleImageError = async () => {
    if (!isRefreshing && !error) {
      await refreshUrl();
    }
  };

  return (
    <div data-testid="input-attachment-preview" className="flex flex-col gap-2">
      <div className="w-20 h-16 aspect-video bg-muted rounded-md relative flex flex-col items-center justify-center">
        {contentType ? (
          contentType.startsWith('image') ? (
            // NOTE: it is recommended to use next/image for images
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={name ?? 'An image attachment'}
              className="rounded-md size-full object-cover"
              onError={handleImageError}
            />
          ) : (
            <div className="" />
          )
        ) : (
          <div className="" />
        )}

        {(isUploading || isRefreshing) && (
          <div
            data-testid="input-attachment-loader"
            className="animate-spin absolute text-zinc-500"
          >
            <LoaderIcon />
          </div>
        )}
      </div>
      <div className="text-xs text-zinc-500 max-w-16 truncate">{name}</div>
    </div>
  );
};
