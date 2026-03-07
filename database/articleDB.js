const { pool } = require('./init');

class ArticleDB {
  async create(article) {
    const id = article.id || 'art_' + Date.now();
    const now = new Date().toISOString();
    
    const query = `
      INSERT INTO articles (id, title, content, summary, keywords, style, word_count,
        status, model_used, prompt, extra_requirements, tags, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    const values = [
      id, article.title, article.content, article.summary || '',
      article.keywords ? JSON.stringify(article.keywords) : '[]',
      article.style || 'professional', article.wordCount || 0,
      article.status || 'completed', article.model || 'deepseek/deepseek-chat',
      article.prompt || '', article.extraRequirements || '',
      article.tags ? JSON.stringify(article.tags) : '[]',
      article.createdAt || now, article.updatedAt || now
    ];
    const result = await pool.query(query, values);
    return this._formatRow(result.rows[0]);
  }

  async getAll(limit = 50, offset = 0) {
    const query = `
      SELECT * FROM articles 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows.map(row => this._formatRow(row));
  }

  async getById(id) {
    const query = 'SELECT * FROM articles WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] ? this._formatRow(result.rows[0]) : null;
  }

  async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const fieldMap = {
      title: 'title', content: 'content', summary: 'summary',
      keywords: 'keywords', style: 'style', wordCount: 'word_count',
      status: 'status', model: 'model_used', prompt: 'prompt',
      extraRequirements: 'extra_requirements', tags: 'tags'
    };

    for (const [key, dbKey] of Object.entries(fieldMap)) {
      if (updates[key] !== undefined) {
        fields.push(`${dbKey} = $${paramCount++}`);
        if (['keywords', 'tags'].includes(dbKey) && Array.isArray(updates[key])) {
          values.push(JSON.stringify(updates[key]));
        } else {
          values.push(updates[key]);
        }
      }
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = $${paramCount++}`);
    values.push(new Date().toISOString());
    values.push(id);

    const query = `UPDATE articles SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);
    return result.rows[0] ? this._formatRow(result.rows[0]) : null;
  }

  async delete(id) {
    const query = 'DELETE FROM articles WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  }

  async search(query, limit = 20) {
    const sql = `
      SELECT * FROM articles 
      WHERE title ILIKE $1 OR content ILIKE $1 OR summary ILIKE $1
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    const searchPattern = `%${query}%`;
    const result = await pool.query(sql, [searchPattern, limit]);
    return result.rows.map(row => this._formatRow(row));
  }

  async count() {
    const result = await pool.query('SELECT COUNT(*) as count FROM articles');
    return parseInt(result.rows[0].count);
  }

  async recordExport(id) {
    const query = `
      UPDATE articles 
      SET export_count = export_count + 1, last_exported_at = $1 
      WHERE id = $2
    `;
    const result = await pool.query(query, [new Date().toISOString(), id]);
    return result.rowCount > 0;
  }

  _formatRow(row) {
    return {
      id: row.id, title: row.title, content: row.content, summary: row.summary,
      keywords: this._parseJSON(row.keywords, []), style: row.style,
      wordCount: row.word_count, status: row.status, model: row.model_used,
      prompt: row.prompt, extraRequirements: row.extra_requirements,
      tags: this._parseJSON(row.tags, []), exportCount: row.export_count,
      lastExportedAt: row.last_exported_at, createdAt: row.created_at, updatedAt: row.updated_at
    };
  }

  _parseJSON(str, defaultValue) {
    if (!str) return defaultValue;
    try { return JSON.parse(str); } catch { return defaultValue; }
  }
}

module.exports = ArticleDB;
