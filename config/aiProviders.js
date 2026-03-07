/**
 * AI Provider Configurations
 * 只保留可用的模型（Deepseek）
 */

const AI_PROVIDERS = {
  deepseek: {
    name: 'Deepseek',
    baseURL: 'https://api.deepseek.com/v1/chat/completions',
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    models: [
      { id: 'deepseek-chat', name: 'Deepseek Chat', maxTokens: 4000 }
    ],
    defaultModel: 'deepseek-chat'
  }
  // NVIDIA API Key 暂时无效，已注释
  // nvidia: {
  //   name: 'NVIDIA',
  //   baseURL: 'https://integrate.api.nvidia.com/v1/chat/completions',
  //   apiKey: process.env.NVIDIA_API_KEY || '',
  //   models: [
  //     { id: 'deepseek-ai/deepseek-v3.2', name: 'DeepSeek v3.2', maxTokens: 4000 }
  //   ],
  //   defaultModel: 'deepseek-ai/deepseek-v3.2'
  // }
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
