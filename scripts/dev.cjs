/**
 * Runs API + Vite with inherited stdio (avoids concurrently/pipe issues where
 * the Express process exits while Vite keeps running).
 */
const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const serverEntry = path.join(root, 'server.js');

const server = spawn(process.execPath, [serverEntry], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});

server.on('exit', (code, signal) => {
  if (signal) {
    console.error(`[dev] server stopped (${signal})`);
  } else {
    console.error(`[dev] server exited with code ${code}`);
  }
});

const client = spawn('npm', ['run', 'dev'], {
  cwd: path.join(root, 'client'),
  stdio: 'inherit',
  env: process.env,
  shell: true,
});

client.on('exit', (code, signal) => {
  if (signal) {
    console.error(`[dev] client stopped (${signal})`);
  } else {
    console.error(`[dev] client exited with code ${code}`);
  }
  server.kill('SIGTERM');
  process.exit(code ?? 0);
});

function shutdown() {
  client.kill('SIGINT');
  server.kill('SIGINT');
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
