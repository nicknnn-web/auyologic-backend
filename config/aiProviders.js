/**
 * AI Provider Configurations
 */

const AI_PROVIDERS = {
  deepseek: {
    name: 'Deepseek',
    baseURL: 'https://api.deepseek.com/v1/chat/completions',
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    models: [
      { id: 'deepseek-chat', name: 'Deepseek Chat', maxTokens: 4000 },
      { id: 'deepseek-reasoner', name: 'Deepseek Reasoner', maxTokens: 4000 }
    ],
    defaultModel: 'deepseek-chat'
  },
  
  nvidia: {
    name: 'NVIDIA',
    baseURL: 'https://integrate.api.nvidia.com/v1/chat/completions',
    apiKey: process.env.NVIDIA_API_KEY || '',
    models: [
      { id: 'deepseek-ai/deepseek-v3.2', name: 'DeepSeek v3.2', maxTokens: 4000 }
    ],
    defaultModel: 'deepseek-ai/deepseek-v3.2'
  },
  
  kimi: {
    name: 'Kimi (Moonshot)',
    baseURL: 'https://api.moonshot.cn/v1/chat/completions',
    apiKey: process.env.KIMI_API_KEY || '',
    models: [
      { id: 'moonshot-v1-8k', name: 'Kimi v1 8K', maxTokens: 8000 }
    ],
    defaultModel: 'moonshot-v1-8k'
  }
};

const getProvider = (providerId) => AI_PROVIDERS[providerId] || AI_PROVIDERS.deepseek;

const getAllProviders = () => Object.entries(AI_PROVIDERS).map(([id, config]) => ({
  id, name: config.name, models: config.models, defaultModel: config.defaultModel
}));

const parseModelParam = (modelParam) => {
  if (!modelParam) return { provider: 'deepseek', model: AI_PROVIDERS.deepseek.defaultModel };
  const parts = modelParam.split('/');
  if (parts.length === 2 && AI_PROVIDERS[parts[0]]) {
    return { provider: parts[0], model: parts[1] };
  }
  return { provider: 'deepseek', model: modelParam };
};

module.exports = { AI_PROVIDERS, getProvider, getAllProviders, parseModelParam };
