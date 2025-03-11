import { useState } from 'react';
import type { Attachment } from 'ai';
import {
  FileIcon,
  ImageIcon,
  CodeIcon,
  LoaderIcon,
  TrashIcon,
} from './icons';
import { FileText } from 'lucide-react';
import { ExtendedAttachment } from '@/lib/types/attachment';

function getFileIcon(contentType: string | undefined) {
  if (!contentType) return <FileIcon size={20} />;

  if (contentType.startsWith('image/')) return <ImageIcon size={20} />;

  // PDF and doc
  if (
    contentType === 'application/pdf' ||
    contentType === 'application/msword' ||
    contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return <FileIcon size={20} />;
  }

  // Text
  if (
    contentType === 'text/plain' ||
    contentType === 'text/markdown' ||
    contentType === 'text/richtext' ||
    contentType === 'application/rtf' ||
    contentType.includes('markdown') ||
    contentType.includes('/md')
  ) {
    return <FileText size={30} />;
  }

  // CSV or spreadsheet
  if (
    contentType === 'application/vnd.ms-excel' ||
    contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    contentType === 'text/csv'
  ) {
    return <FileIcon size={20} />;
  }

  // PowerPoint
  if (
    contentType === 'application/vnd.ms-powerpoint' ||
    contentType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return <FileIcon size={20} />;
  }

  // HTML / XML / JSON
  if (contentType === 'text/html' || contentType === 'application/xml' || contentType === 'application/json') {
    return <CodeIcon size={20} />;
  }

  // Default
  return <FileIcon size={20} />;
}

function getFileName(attachment: ExtendedAttachment) {
  // If name is available, use it directly
  if (attachment.name) return attachment.name;
  // Otherwise fallback
  return 'File';
}

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
  onDelete,
}: {
  attachment: ExtendedAttachment;
  isUploading?: boolean;
  onDelete?: () => void;
}) => {
  const { name, url: initialUrl, contentType, objectName } = attachment;
  const [url, setUrl] = useState(initialUrl);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const fileName = getFileName(attachment);
  const isImage = contentType?.startsWith('image/');

  // Refresh the presigned URL if it expires
  const refreshUrl = async () => {
    if (!objectName) return; // no S3 key to refresh
    try {
      setIsRefreshing(true);
      const response = await fetch('/api/files/refresh-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ objectName }),
      });

      if (!response.ok) {
        setError(true);
        return;
      }
      const data = await response.json();
      setUrl(data.url);
      setError(false);
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
    <div
      data-testid="input-attachment-preview"
      className="flex flex-col gap-2"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="w-20 h-16 aspect-video bg-muted rounded-md relative flex flex-col items-center justify-center overflow-hidden">
        {isImage ? (
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
            className="w-full h-full flex items-center justify-center hover:bg-zinc-400/70 transition-colors"
            title={`Open ${fileName}`}
          >
            {getFileIcon(contentType)}
          </a>
        )}

        {/* Delete button on hover */}
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
            <TrashIcon size={14} />
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
      <div className="text-xs text-zinc-500 max-w-20 truncate" title={fileName}>
        {fileName}
      </div>
    </div>
  );
};
