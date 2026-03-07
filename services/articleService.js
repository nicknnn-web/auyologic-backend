/**
 * Article Service - 简化版
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const ArticleDB = require('../database/articleDB');
const { getProvider, parseModelParam } = require('../config/aiProviders');

class ArticleService {
  constructor() {
    this.db = new ArticleDB();
  }

  async generateArticle(params) {
    const { title, style = 'professional', extraRequirements = '', model: modelParam } = params;
    
    const { provider: providerId, model } = parseModelParam(modelParam);
    const provider = getProvider(providerId);
    
    if (!provider.apiKey) {
      throw new Error(`${provider.name} API Key not configured`);
    }

    const prompt = this.buildPrompt(title, style, extraRequirements);

    try {
      const response = await axios.post(provider.baseURL, {
        model: model,
        messages: [
          { role: 'system', content: '你是一位专业的SEO内容创作专家。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      });

      const generatedContent = response.data.choices[0]?.message?.content || '';
      const parsed = this.parseGeneratedContent(generatedContent);

      const article = {
        id: 'art_' + Date.now(),
        title: title,
        content: parsed.content,
        summary: parsed.summary,
        keywords: parsed.keywords,
        style: style,
        wordCount: this.countWords(parsed.content),
        status: 'completed',
        model: `${providerId}/${model}`,
        prompt: prompt,
        extraRequirements: extraRequirements,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.db.create(article);
      return article;

    } catch (error) {
      console.error(`Generation failed:`, error.message);
      throw new Error(`文章生成失败: ${error.message}`);
    }
  }

  buildPrompt(title, style, extraRequirements) {
    const styles = { professional: '专业严谨', casual: '轻松随意', storytelling: '故事叙述', persuasive: '说服引导', educational: '教育科普' };
    return `请创作一篇关于"${title}"的文章。\n写作风格：${styles[style] || '专业'}\n字数：800-1500字\n${extraRequirements ? '额外要求：' + extraRequirements : ''}\n\n格式：\n摘要：[100字以内摘要]\n关键词：[3-5个关键词]\n正文：[Markdown格式正文]`;
  }

  parseGeneratedContent(content) {
    const result = { summary: '', keywords: [], content: content };
    const summaryMatch = content.match(/摘要[:：]\s*(.+?)(?=---|\n关键词|$)/s);
    if (summaryMatch) result.summary = summaryMatch[1].trim();
    const keywordsMatch = content.match(/关键词[:：]\s*(.+?)(?=---|$)/s);
    if (keywordsMatch) {
      result.keywords = keywordsMatch[1].split(/[,，、]\s*/).map(k => k.trim()).filter(k => k);
    }
    const contentMatch = content.match(/正文[:：]?\s*\n?([\s\S]+?)(?=---|$)/);
    if (contentMatch) result.content = contentMatch[1].trim();
    return result;
  }

  countWords(text) {
    const chinese = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const english = (text.match(/[a-zA-Z]+/g) || []).length;
    return chinese + english;
  }
}

module.exports = new ArticleService();
