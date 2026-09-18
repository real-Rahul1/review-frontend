// Optional: minimal static file server for local development.
// You can also use VS Code Live Server, Netlify, Vercel, GitHub Pages, etc.
const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 5500;
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };

http.createServer((req, res) => {
  let file = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (file === '/') file = '/admin.html';
  const full = path.join(__dirname, path.normalize(file));
  if (!full.startsWith(__dirname) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
    res.writeHead(404); return res.end('Not found');
  }
  res.writeHead(200, { 'Content-Type': (TYPES[path.extname(full)] || 'application/octet-stream') + '; charset=utf-8' });
  fs.createReadStream(full).pipe(res);
}).listen(PORT, () => console.log(`Frontend on http://localhost:${PORT}  (admin: /admin.html)`));
