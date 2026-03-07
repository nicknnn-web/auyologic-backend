/**
 * Export Service - 简化版
 */

class ExportService {
  exportToMarkdown(article, options = {}) {
    const { includeMetadata = true, template = 'simple' } = options;
    let markdown = '';

    if (includeMetadata) {
      markdown += '---\n';
      markdown += `title: "${article.title}"\n`;
      if (article.keywords?.length) {
        markdown += `keywords: [${article.keywords.map(k => `"${k}"`).join(', ')}]\n`;
      }
      markdown += `word_count: ${article.wordCount}\n`;
      markdown += '---\n\n';
    }

    markdown += `# ${article.title}\n\n`;
    if (article.summary) markdown += `> **摘要：** ${article.summary}\n\n`;
    if (article.keywords?.length) markdown += `**关键词：** ${article.keywords.join(' · ')}\n\n`;
    markdown += article.content;

    return {
      content: markdown,
      filename: this._sanitizeFilename(article.title) + '.md',
      mimeType: 'text/markdown'
    };
  }

  exportToHTML(article, options = {}) {
    const { template = 'simple' } = options;
    const templateHTML = this._getSimpleTemplate();
    
    let html = templateHTML.header;
    html += `<h1>${this._escapeHtml(article.title)}</h1>`;
    if (article.summary) html += `<div class="summary"><strong>摘要：</strong>${this._escapeHtml(article.summary)}</div>`;
    html += `<div class="content">${this._markdownToHtml(article.content)}</div>`;
    html += templateHTML.footer;
    
    return html;
  }

  _getSimpleTemplate() {
    return {
      header: `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;line-height:1.6;max-width:800px;margin:0 auto;padding:40px 20px;color:#333;}h1{font-size:28px;margin-bottom:20px;}.summary{background:#f8f9fa;padding:15px;border-left:4px solid #007bff;margin-bottom:30px;}.content h2{font-size:22px;margin-top:30px;}.content p{margin-bottom:15px;}</style></head><body>`,
      footer: `</body></html>`
    };
  }

  _sanitizeFilename(title) {
    return title.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').substring(0, 50);
  }

  _escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  _markdownToHtml(markdown) {
    return markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>');
  }
}

module.exports = new ExportService();
