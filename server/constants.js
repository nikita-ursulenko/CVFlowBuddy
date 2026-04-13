import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export const PATHS = {
  uploads: path.join(rootDir, 'uploads'),
  emails: path.join(rootDir, 'data', 'emails.json'),
  stats: path.join(rootDir, 'data', 'stats.json'),
  cookies: path.join(rootDir, 'data', 'lucru-cookies.json'),
  groqStatus: path.join(rootDir, 'data', 'groq-status.json')
};

export const DEFAULT_CONFIG = {
  port: process.env.PORT || 5050,
  maxJobs: 10,
  minMatchScore: 70
};
