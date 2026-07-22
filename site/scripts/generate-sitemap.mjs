import { readdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const distUrl = new URL('../dist/', import.meta.url);
const distDir = fileURLToPath(distUrl);
const siteUrl = 'https://protocol.tinycloud.xyz';

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.isFile() && entry.name === 'index.html' ? [path] : [];
  }));
  return nested.flat();
}

const files = await htmlFiles(distDir);
const urls = files
  .map((file) => relative(distDir, file).split(sep).join('/'))
  .map((file) => file === 'index.html' ? '/' : `/${file.slice(0, -'/index.html'.length)}/`)
  .sort();
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map((url) => `  <url><loc>${siteUrl}${url}</loc></url>`),
  '</urlset>',
  '',
].join('\n');

await writeFile(new URL('sitemap.xml', distUrl), xml);
console.log(`[sitemap] wrote ${urls.length} URLs`);
