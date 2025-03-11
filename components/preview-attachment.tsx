import { useState, useEffect } from 'react';
import type { Attachment } from 'ai';
import {
  FileIcon,
  ImageIcon,
  CodeIcon,
  InfoIcon,
  GlobeIcon,
  LoaderIcon,
  TrashIcon
} from './icons';

// Helper function to get the appropriate icon for a file type
const getFileIcon = (contentType: string | undefined) => {
  if (!contentType) return <FileIcon size={20} />;
  
  if (contentType.startsWith('image/')) return <ImageIcon size={20} />;
  
  if (contentType === 'application/pdf' ||
      contentType === 'application/msword' ||
      contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      contentType === 'text/plain' ||
      contentType === 'text/markdown' ||
      contentType === 'text/richtext' ||
      contentType === 'application/rtf') {
    return <FileIcon size={20} />;
  }
  
  if (contentType === 'application/vnd.ms-excel' ||
      contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      contentType === 'text/csv') {
    return <FileIcon size={20} />;
  }
  
  if (contentType === 'application/vnd.ms-powerpoint' ||
      contentType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
    return <FileIcon size={20} />;
  }
  
  if (contentType === 'text/html' || contentType === 'application/xml') {
    return <CodeIcon size={20} />;
  }
  
  if (contentType === 'application/json') {
    return <CodeIcon size={20} />;
  }
  
  return <FileIcon size={20} />;
};

// Get the file name from the pathname
const getFileName = (pathname: string | undefined) => {
  if (!pathname) return 'File';
  const parts = pathname.split('/');
  return parts[parts.length - 1];
};

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
  onDelete
}: {
  attachment: Attachment;
  isUploading?: boolean;
  onDelete?: () => void;
}) => {
  const { name, url: initialUrl, contentType } = attachment;
  const [url, setUrl] = useState(initialUrl);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

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

  const isImage = contentType?.startsWith('image/');
  const fileName = getFileName(name);

  return (
    <div 
      data-testid="input-attachment-preview" 
      className="flex flex-col gap-2"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="w-20 h-16 aspect-video bg-muted rounded-md relative flex flex-col items-center justify-center overflow-hidden">
        {isImage ? (
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
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="w-full h-full flex items-center justify-center hover:bg-zinc-200 transition-colors"
            title={`Open ${fileName}`}
          >
            {getFileIcon(contentType)}
          </a>
        )}

        {/* Delete button that appears on hover */}
        {isHovering && onDelete && !isUploading && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className="absolute top-0.5 right-0.5 bg-zinc-800/70 hover:bg-zinc-900/90 text-white rounded-full p-0.5 size-5 flex items-center justify-center z-10 transition-all"
            aria-label="Delete attachment"
          >
            <TrashIcon size={12} />
          </button>
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
      <div className="text-xs text-zinc-500 max-w-16 truncate" title={fileName}>{fileName}</div>
    </div>
  );
};
