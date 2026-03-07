const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { init: initDB, pool } = require('./database/init');
const ArticleDB = require('./database/articleDB');
const { getAllProviders } = require('./config/aiProviders');
const articleService = require('./services/articleService');
const batchArticleService = require('./services/batchArticleService');
const exportService = require('./services/exportService');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(morgan('dev'));
app.use(express.json());

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'AuyoLogic API' });
});

// 初始化数据库
app.post('/api/system/init', async (req, res) => {
  try {
    await initDB();
    res.json({ success: true, message: 'Database initialized' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI 提供商列表
app.get('/api/articles/providers', (req, res) => {
  res.json({ success: true, data: getAllProviders() });
});

// 生成文章
app.post('/api/articles/generate', async (req, res) => {
  try {
    const { title, style, extraRequirements, model } = req.body;
    if (!title) return res.status(400).json({ success: false, error: '标题不能为空' });
    const article = await articleService.generateArticle({ title, style, extraRequirements, model });
    res.json({ success: true, data: article });
  } catch (error) {
    console.error('Generate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 批量生成
app.post('/api/articles/batch', async (req, res) => {
  try {
    const { titles, name, style, extraRequirements, model } = req.body;
    if (!titles || !Array.isArray(titles)) return res.status(400).json({ success: false, error: 'titles required' });
    const result = await batchArticleService.createBatchTask(titles, { name, style, extraRequirements, model });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取任务状态
app.get('/api/articles/batch/:taskId', async (req, res) => {
  try {
    const status = await batchArticleService.getTaskStatus(req.params.taskId);
    if (!status) return res.status(404).json({ success: false, error: '任务不存在' });
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取所有文章
app.get('/api/articles', async (req, res) => {
  try {
    const db = new ArticleDB();
    const articles = await db.getAll();
    res.json({ success: true, data: articles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取单篇文章
app.get('/api/articles/:id', async (req, res) => {
  try {
    const db = new ArticleDB();
    const article = await db.getById(req.params.id);
    if (!article) return res.status(404).json({ success: false, error: '文章不存在' });
    res.json({ success: true, data: article });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新文章
app.put('/api/articles/:id', async (req, res) => {
  try {
    const db = new ArticleDB();
    const article = await db.update(req.params.id, req.body);
    if (!article) return res.status(404).json({ success: false, error: '文章不存在' });
    res.json({ success: true, data: article });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除文章
app.delete('/api/articles/:id', async (req, res) => {
  try {
    const db = new ArticleDB();
    const deleted = await db.delete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: '文章不存在' });
    res.json({ success: true, message: '文章已删除' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 导出文章
app.get('/api/articles/:id/export', async (req, res) => {
  try {
    const { format = 'markdown', template = 'simple' } = req.query;
    const db = new ArticleDB();
    const article = await db.getById(req.params.id);
    if (!article) return res.status(404).json({ success: false, error: '文章不存在' });

    await db.recordExport(req.params.id);

    if (format === 'markdown') {
      const result = exportService.exportToMarkdown(article, { template });
      const encodedFilename = encodeURIComponent(result.filename);
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);
      res.send(result.content);
    } else if (format === 'html') {
      const html = exportService.exportToHTML(article, { template });
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } else {
      res.status(400).json({ success: false, error: 'Unsupported format' });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  // 自动初始化数据库
  initDB().catch(console.error);
});
