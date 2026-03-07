const { Pool } = require('pg');

// 使用 Railway 提供的 DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// 创建表
const createTables = async () => {
  const client = await pool.connect();
  try {
    // 用户表
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        company_name TEXT,
        role TEXT DEFAULT 'user',
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 诊断报告表
    await client.query(`
      CREATE TABLE IF NOT EXISTS diagnosis_reports (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        company_name TEXT NOT NULL,
        industry TEXT,
        overall_score INTEGER,
        visibility_score INTEGER,
        content_score INTEGER,
        authority_score INTEGER,
        technical_score INTEGER,
        ai_mentions_count INTEGER DEFAULT 0,
        keyword_coverage REAL,
        recommendations TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);

    // 文章表
    await client.query(`
      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        keywords TEXT,
        style TEXT DEFAULT 'professional',
        word_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'completed',
        model_used TEXT DEFAULT 'deepseek/deepseek-chat',
        prompt TEXT,
        extra_requirements TEXT,
        tags TEXT,
        export_count INTEGER DEFAULT 0,
        last_exported_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 批量任务表
    await client.query(`
      CREATE TABLE IF NOT EXISTS batch_tasks (
        id TEXT PRIMARY KEY,
        name TEXT,
        total_count INTEGER DEFAULT 0,
        completed_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        config TEXT,
        results TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);

    // 插入默认管理员
    await client.query(`
      INSERT INTO users (id, email, password, company_name, role)
      VALUES ('admin_001', 'admin@auyologic.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjXAg1L3t.7eEjX9tL0z1QZ3QJZ1Z1K', 'AuyoLogic', 'admin')
      ON CONFLICT (id) DO NOTHING
    `);

    console.log('✅ PostgreSQL tables created successfully');
  } finally {
    client.release();
  }
};

// 初始化
const init = async () => {
  try {
    await createTables();
    console.log('📊 Database initialized successfully!');
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    throw err;
  }
};

module.exports = { init, pool };
