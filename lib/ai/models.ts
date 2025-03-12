export const DEFAULT_CHAT_MODEL: string = 'chat-model-small';

interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model-small',
    name: 'GPT 4o mini',
    description: 'Fast, lightweight tasks',
  },
  {
    id: 'chat-model-large',
    name: 'GPT 4o',
    description: 'Complex tasks & image uploads',
  },
  {
    id: 'chat-model-reasoning',
    name: 'GPT o3 mini',
    description: 'Very complex reasoning tasks',
  },
  {
    id: 'claude-sonnet',
    name: 'Claude 3.5 Sonnet',
    description: 'Complex tasks & PDF uploads',
  },
];
