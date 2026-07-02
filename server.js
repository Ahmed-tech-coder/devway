// server.js
const app = require('./src/app');
const env = require('./src/config/env');

const PORT = env.port || 5000;

const server = app.listen(PORT, () => {
  console.log(`[DevWay Server] Server is running in environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[DevWay Server] Listening on port: ${PORT}`);
});

// Run assignments scheduler check every 60 seconds (Auto-publish/close)
const assignmentsService = require('./src/modules/assignments/assignments.service');
setInterval(async () => {
  try {
    await assignmentsService.runSchedulerSync();
  } catch (err) {
    console.error('[DevWay Server] Assignment scheduler error:', err);
  }
}, 60000);

// Handle unhandled promise rejections globally
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down server...');
  console.error(err);
  server.close(() => {
    process.exit(1);
  });
});
