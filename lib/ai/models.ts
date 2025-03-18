import { ATTACHMENT_TYPES, getFileTypeDescription } from '@/lib/attachments/types';

export const DEFAULT_CHAT_MODEL: string = 'chat-model-large';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
  supportedAttachmentTypes?: string[];
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model-small',
    name: 'Small Model',
    description: 'Fast, lightweight tasks  (GPT 4o mini)',
    supportedAttachmentTypes: [
      ...Object.values(ATTACHMENT_TYPES.IMAGE),
      ATTACHMENT_TYPES.DOCUMENT_PDF.PDF,
      ...Object.values(ATTACHMENT_TYPES.TEXT),
      ...Object.values(ATTACHMENT_TYPES.CODE),
      ATTACHMENT_TYPES.SPREADSHEET_CSV.CSV
    ],
  },
  {
    id: 'chat-model-large',
    name: 'Large Model',
    description: 'Complex multi-step tasks  (GPT 4o)',
    supportedAttachmentTypes: [
      ...Object.values(ATTACHMENT_TYPES.IMAGE),
      ATTACHMENT_TYPES.DOCUMENT_PDF.PDF,
      ...Object.values(ATTACHMENT_TYPES.TEXT),
      ...Object.values(ATTACHMENT_TYPES.CODE),
      ATTACHMENT_TYPES.SPREADSHEET_CSV.CSV
    ],
  },
  {
    id: 'chat-model-reasoning',
    name: 'Reasoning Model',
    description: 'Very complex reasoning tasks  (GPT o3 mini)',
    supportedAttachmentTypes: [
      ...Object.values(ATTACHMENT_TYPES.TEXT),
      ...Object.values(ATTACHMENT_TYPES.CODE),
      ATTACHMENT_TYPES.SPREADSHEET_CSV.CSV
    ],
  },
  /* Temporarily hidden
  {
    id: 'claude-sonnet',
    name: 'Claude 3.5 Sonnet',
    description: 'Complex tasks & PDF uploads',
    supportedAttachmentTypes: [
      ...Object.values(ATTACHMENT_TYPES.IMAGE),
      ATTACHMENT_TYPES.DOCUMENT_PDF.PDF,
      ...Object.values(ATTACHMENT_TYPES.TEXT),
      ...Object.values(ATTACHMENT_TYPES.CODE),
      ATTACHMENT_TYPES.SPREADSHEET_CSV.CSV
    ],
  },
  */
];

export function isAttachmentTypeSupported(modelId: string, contentType: string): boolean {
  const model = chatModels.find(model => model.id === modelId);
  if (!model || !model.supportedAttachmentTypes) return false;

  // Check for exact match first
  if (model.supportedAttachmentTypes.includes(contentType)) {
    return true;
  }

  // For markdown files, there are multiple possible MIME types
  // Check if any of the TEXT types match the prefix of the content type
  if (contentType.startsWith('text/markdown') ||
    contentType.startsWith('text/x-markdown') ||
    contentType === 'application/markdown' ||
    contentType === 'application/x-markdown') {
    return model.supportedAttachmentTypes.some(type =>
      type === ATTACHMENT_TYPES.TEXT.MARKDOWN ||
      type === ATTACHMENT_TYPES.TEXT.X_MARKDOWN ||
      type === ATTACHMENT_TYPES.TEXT.MD ||
      type === ATTACHMENT_TYPES.TEXT.APP_MARKDOWN ||
      type === ATTACHMENT_TYPES.TEXT.APP_X_MARKDOWN
    );
  }

  return false;
}

export function getAllSupportedAttachmentTypes(): string[] {
  const allTypes = new Set<string>();
  chatModels.forEach(model => {
    if (model.supportedAttachmentTypes) {
      model.supportedAttachmentTypes.forEach(type => allTypes.add(type));
    }
  });
  return Array.from(allTypes);
}

export function getSupportedAttachmentTypesFormatted(modelId: string): string {
  const model = chatModels.find(model => model.id === modelId);
  if (!model || !model.supportedAttachmentTypes || model.supportedAttachmentTypes.length === 0) {
    return 'No attachments supported';
  }

  const formattedTypes = model.supportedAttachmentTypes.map(type => getFileTypeDescription(type));
  const uniqueTypes = Array.from(new Set(formattedTypes));

  return uniqueTypes.join(', ');
}

/**
 * Gets a list of supported file extensions for a given model
 * This is useful for validating files by extension when MIME types are unreliable
 */
export function getSupportedFileExtensions(modelId: string): string[] {
  const model = chatModels.find(model => model.id === modelId);
  if (!model || !model.supportedAttachmentTypes || model.supportedAttachmentTypes.length === 0) {
    return [];
  }

  const extensions: string[] = [];

  // Check for each category of attachment types
  if (model.supportedAttachmentTypes.some(type => type.startsWith('image/'))) {
    extensions.push('jpg', 'jpeg', 'png', 'gif', 'webp', 'svg');
  }

  if (model.supportedAttachmentTypes.includes(ATTACHMENT_TYPES.DOCUMENT_PDF.PDF)) {
    extensions.push('pdf');
  }

  if (model.supportedAttachmentTypes.some(type =>
    type === ATTACHMENT_TYPES.TEXT.MARKDOWN ||
    type === ATTACHMENT_TYPES.TEXT.X_MARKDOWN ||
    type === ATTACHMENT_TYPES.TEXT.MD)) {
    extensions.push('md', 'markdown');
  }

  if (model.supportedAttachmentTypes.includes(ATTACHMENT_TYPES.TEXT.PLAIN)) {
    extensions.push('txt');
  }

  if (model.supportedAttachmentTypes.includes(ATTACHMENT_TYPES.SPREADSHEET_CSV.CSV)) {
    extensions.push('csv');
  }

  return extensions;
}
