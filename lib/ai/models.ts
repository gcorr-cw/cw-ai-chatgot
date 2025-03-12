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
    description: 'For complex, multi-step tasks',
  },
  {
    id: 'chat-model-reasoning',
    name: 'Reasoning model',
    description: 'Uses advanced reasoning',
  },
  {
    id: 'claude-sonnet',
    name: 'Claude 3.5 Sonnet',
    description: 'Supports PDF uploads',
  },
];
