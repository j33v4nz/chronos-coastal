import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'frontend/package.json'));
const { build } = require('esbuild');
const out = path.join(root, 'dist');
rmSync(out, { recursive: true, force: true });
mkdirSync(path.join(out, 'server'), { recursive: true });
mkdirSync(path.join(out, '.openai'), { recursive: true });
cpSync(path.join(root, 'frontend/dist'), path.join(out, 'client'), { recursive: true });
cpSync(path.join(root, '.openai/hosting.json'), path.join(out, '.openai/hosting.json'));
await build({ entryPoints: [path.join(root, 'worker/index.mjs')], bundle: true, format: 'esm', platform: 'neutral', target: 'es2022', outfile: path.join(out, 'server/index.js') });
const meta = JSON.parse(readFileSync(path.join(root, '.openai/hosting.json'), 'utf8'));
if (meta.d1 !== 'DB') throw new Error('The hosted app requires the DB binding.');
writeFileSync(path.join(out, 'package.json'), '{"type":"module"}\n');
console.log('Sites package ready: dist/client, dist/server, dist/.openai.');
