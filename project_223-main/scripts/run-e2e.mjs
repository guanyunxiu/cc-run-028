// 运行端到端逻辑测试：node scripts/run-e2e.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const esbuild = require('esbuild');

const root = dirname(dirname(fileURLToPath(import.meta.url)));

await esbuild.build({
  entryPoints: [join(root, 'scripts/e2e-logic-test.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: join(root, 'node_modules/.cache/e2e-logic-test.cjs'),
  alias: { '@': join(root, 'src') },
  logLevel: 'error',
});

await import(join(root, 'node_modules/.cache/e2e-logic-test.cjs'));
