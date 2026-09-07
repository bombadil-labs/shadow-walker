import { cpSync, mkdirSync } from 'node:fs';
mkdirSync('dist/site', { recursive: true });
cpSync('apps/site/index.html', 'dist/site/index.html');
