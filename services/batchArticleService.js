/**
 * Batch Article Service - 简化版
 */

const axios = require('axios');
const { pool } = require('../database/init');
const ArticleDB = require('../database/articleDB');
const { getProvider, parseModelParam } = require('../config/aiProviders');

class BatchArticleService {
  async createBatchTask(titles, config = {}) {
    const taskId = 'batch_' + Date.now();
    const { style = 'professional', extraRequirements = '', model = 'deepseek/deepseek-chat', concurrentLimit = 3 } = config;

    await pool.query(`
      INSERT INTO batch_tasks (id, name, total_count, completed_count, failed_count, status, config, results, created_at)
      VALUES ($1, $2, $3, 0, 0, 'pending', $4, '[]', $5)
    `, [taskId, config.name || `批量任务 ${new Date().toLocaleString()}`, titles.length, 
        JSON.stringify({ titles, style, extraRequirements, model, concurrentLimit }),
        new Date().toISOString()]);

    this.processBatchTask(taskId).catch(console.error);

    return { taskId, status: 'pending', total: titles.length, message: '批量任务已创建并开始处理' };
  }

  async processBatchTask(taskId) {
    try {
      const taskResult = await pool.query('SELECT * FROM batch_tasks WHERE id = $1', [taskId]);
      const task = taskResult.rows[0];
      if (!task) throw new Error('Task not found');

      const config = JSON.parse(task.config);
      await pool.query("UPDATE batch_tasks SET status = 'running' WHERE id = $1", [taskId]);

      const results = [];
      for (let i = 0; i < config.titles.length; i += config.concurrentLimit) {
        const batch = config.titles.slice(i, i + config.concurrentLimit);
        const batchPromises = batch.map((title, idx) => this._generateArticle(taskId, title, config, i + idx));

        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach(result => {
          results.push(result.status === 'fulfilled' ? { success: true, ...result.value } : { success: false, error: result.reason.message });
        });

        const completed = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        await pool.query('UPDATE batch_tasks SET completed_count = $1, failed_count = $2, results = $3 WHERE id = $4',
          [completed, failed, JSON.stringify(results), taskId]);
      }

      await pool.query("UPDATE batch_tasks SET status = 'completed', completed_at = $1 WHERE id = $2",
        [new Date().toISOString(), taskId]);
    } catch (error) {
      console.error(`Task ${taskId} failed:`, error);
      await pool.query("UPDATE batch_tasks SET status = 'failed' WHERE id = $1", [taskId]);
    }
  }

  async _generateArticle(taskId, title, config, index) {
    const { provider: providerId, model } = parseModelParam(config.model);
    const provider = getProvider(providerId);

    const prompt = `请创作一篇关于"${title}"的文章。\n写作风格：${config.style}\n字数：800-1500字\n\n格式：\n摘要：[100字以内摘要]\n关键词：[3-5个关键词]\n正文：[Markdown格式正文]`;
    
    const response = await axios.post(provider.baseURL, {
      model, messages: [{ role: 'user', content: prompt }],
      temperature: 0.7, max_tokens: 4000
    }, { headers: { 'Authorization': `Bearer ${provider.apiKey}`, 'Content-Type': 'application/json' }, timeout: 60000 });

    const content = response.data.choices[0]?.message?.content || '';
    const db = new ArticleDB();
    await db.create({
      id: `art_${taskId}_${index}`, title, content,
      style: config.style, model: `${providerId}/${model}`,
      tags: ['batch', `batch_${taskId}`],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });

    return { articleId: `art_${taskId}_${index}`, title };
  }

  async getTaskStatus(taskId) {
    const result = await pool.query('SELECT * FROM batch_tasks WHERE id = $1', [taskId]);
    if (!result.rows[0]) return null;
    const t = result.rows[0];
    return {
      taskId: t.id, name: t.name, status: t.status, total: t.total_count,
      completed: t.completed_count, failed: t.failed_count,
      progress: t.total_count > 0 ? Math.round(((t.completed_count + t.failed_count) / t.total_count) * 100) : 0
    };
  }

  async getAllTasks(limit = 20) {
    const result = await pool.query('SELECT * FROM batch_tasks ORDER BY created_at DESC LIMIT $1', [limit]);
    return result.rows.map(t => ({
      taskId: t.id, name: t.name, status: t.status, total: t.total_count,
      completed: t.completed_count, failed: t.failed_count,
      progress: t.total_count > 0 ? Math.round(((t.completed_count + t.failed_count) / t.total_count) * 100) : 0
    }));
  }
}

module.exports = new BatchArticleService();
