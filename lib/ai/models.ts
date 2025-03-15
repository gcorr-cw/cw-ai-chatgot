export const DEFAULT_CHAT_MODEL: string = 'chat-model-large';

interface ChatModel {
  id: string;
  name: string;
  description: string;
  supportedAttachmentTypes?: string[];
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model-small',
    name: 'GPT 4o mini',
    description: 'Fast, lightweight tasks',
    supportedAttachmentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  },
  {
    id: 'chat-model-large',
    name: 'GPT 4o',
    description: 'Complex tasks & image uploads',
    supportedAttachmentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'text/csv'],
  },
  {
    id: 'chat-model-reasoning',
    name: 'GPT o3 mini',
    description: 'Very complex reasoning tasks',
    supportedAttachmentTypes: [],
  },
  {
    id: 'claude-sonnet',
    name: 'Claude 3.5 Sonnet',
    description: 'Complex tasks & PDF uploads',
    supportedAttachmentTypes: ['application/pdf', 'text/plain', 'text/csv'],
  },
];

export function isAttachmentTypeSupported(modelId: string, contentType: string): boolean {
  const model = chatModels.find(model => model.id === modelId);
  if (!model || !model.supportedAttachmentTypes) return false;
  return model.supportedAttachmentTypes.includes(contentType);
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

  const typeMap: Record<string, string> = {
    'image/jpeg': 'JPEG images',
    'image/png': 'PNG images',
    'image/gif': 'GIF images',
    'image/webp': 'WebP images',
    'application/pdf': 'PDF documents',
    'text/plain': 'Text files',
    'text/csv': 'CSV files'
  };

  const formattedTypes = model.supportedAttachmentTypes.map(type => typeMap[type] || type);
  const uniqueTypes = Array.from(new Set(formattedTypes));

  return uniqueTypes.join(', ');
}
