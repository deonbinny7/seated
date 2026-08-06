// Bundles the extension into dist/, ready for chrome://extensions → "Load unpacked".
import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });

const shared = {
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'chrome110',
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'info',
};

await Promise.all([
  // Runs in the page's own JavaScript world, where it can see the seat map the page drew.
  build({ ...shared, entryPoints: ['src/reader.ts'], outfile: 'dist/reader.js' }),
  // Runs in the extension's isolated world and draws the Seated panel.
  build({ ...shared, entryPoints: ['src/content.tsx'], outfile: 'dist/content.js', jsx: 'automatic', loader: { '.css': 'text' } }),
]);

await cp('manifest.json', 'dist/manifest.json');
await cp('harness.html', 'dist/harness.html');
console.log('Built apps/extension/dist');
