import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\x1b[36m%s\x1b[0m', '==================================================');
console.log('\x1b[36m%s\x1b[0m', '⚡ ENERGYQ AI — Powering Smarter Living, Managing Smarter Grids');
console.log('\x1b[36m%s\x1b[0m', '   Starting FastAPI Backend (Port 8000) & Vite Frontend (Port 5173)');
console.log('\x1b[36m%s\x1b[0m', '==================================================\n');

const isWin = process.platform === 'win32';
const pythonBin = isWin
  ? path.join(__dirname, 'backend', 'venv', 'Scripts', 'python.exe')
  : path.join(__dirname, 'backend', 'venv', 'bin', 'python');

// 1. Launch FastAPI Backend
const backend = spawn(pythonBin, ['main.py'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true,
});

// 2. Launch Frontend
const npmCmd = isWin ? 'npm.cmd' : 'npm';
const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true,
});

const cleanup = () => {
  console.log('\n\x1b[33m%s\x1b[0m', 'Shutting down ENERGYQ AI services...');
  backend.kill('SIGINT');
  frontend.kill('SIGINT');
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
