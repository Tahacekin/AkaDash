const { createApp } = require('./server/app');
const { PORT } = require('./server/config');

const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`AkaDash API listening at http://localhost:${PORT}`);
});

function shutdown(signal) {
  console.log(`[AkaDash] ${signal} received, closing server…`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = { app, server };
