// Static server for the trial on this machine: serves public/ on 127.0.0.1 only, never cached.
// Usage: node tool/serve.mjs   (env PORT, default 8792; HOST default 127.0.0.1)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 8792;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml' };

function fail(res, code) { if (!res.headersSent) res.writeHead(code); res.end(); }
http.createServer((req, res) => {
  try {
    let p;
    try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { return fail(res, 400); }
    if (p.includes('\0')) return fail(res, 400);
    const file = path.resolve(ROOT, '.' + (p.endsWith('/') ? p + 'index.html' : p));
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return fail(res, 403);
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) return fail(res, 404);
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      const s = fs.createReadStream(file);
      s.on('error', () => res.destroy());
      res.on('close', () => s.destroy());
      s.pipe(res);
    });
  } catch { fail(res, 400); }
}).listen(PORT, HOST, () => console.log(`http://${HOST}:${PORT}/`));
