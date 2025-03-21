import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

// Define response models for PDF support
export const responseModels = {
  'chat-model-small': openai.responses('gpt-4o-mini'),
  'chat-model-large': openai.responses('gpt-4o'),
};

// Define web search tool using the exact format from the documentation
export const webSearchTool = openai.tools.webSearchPreview({
  searchContextSize: 'medium',
  userLocation: {
    type: 'approximate',
    city: 'Albany',
    region: 'Oregon',
  },
});

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model-small': chatModel,
        'chat-model-large': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
        'claude-sonnet': chatModel,
      },  
    })
  : customProvider({
      languageModels: {
        'chat-model-small': openai('gpt-4o-mini'),
        'chat-model-large': openai('gpt-4o'),
        'chat-model-reasoning': wrapLanguageModel({
          model: openai('o3-mini', {
            reasoningEffort: 'high'
          }),
          middleware: extractReasoningMiddleware({ tagName: 'think' })
        }),
        'title-model': openai('gpt-4-turbo'),
        'artifact-model': openai('gpt-4o-mini'),
        'claude-sonnet': anthropic('claude-3-5-sonnet-20241022'),
      },
      imageModels: {
        'small-model': openai.image('dall-e-2'),
        'large-model': openai.image('dall-e-3'),
      },
    });
