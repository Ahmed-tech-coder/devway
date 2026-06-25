// server.js
const app = require('./src/app');
const env = require('./src/config/env');

const PORT = env.port || 5000;

const server = app.listen(PORT, () => {
  console.log(`[DevWay Server] Server is running in environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[DevWay Server] Listening on port: ${PORT}`);
});

// Handle unhandled promise rejections globally
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down server...');
  console.error(err);
  server.close(() => {
    process.exit(1);
  });
});
