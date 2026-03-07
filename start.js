const app = require('./server.js');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 AuyoLogic GEO API Server running on port ${PORT}`);
  console.log(`📊 API endpoint: http://localhost:${PORT}/api`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
});
