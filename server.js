const http = require('http');
const fs = require('fs');
const path = require('path');

const ports = [8080, 3000, 5000, 8000];

function startServerOnPort(index) {
  if (index >= ports.length) {
    console.error("All ports busy!");
    return;
  }
  const PORT = ports[index];
  const server = http.createServer((req, res) => {
    let reqUrl = req.url.split('?')[0];
    let filePath = path.join(__dirname, reqUrl === '/' ? 'index.html' : reqUrl);

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.jpg': 'image/jpeg',
        '.png': 'image/png',
        '.svg': 'image/svg+xml'
      };

      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      startServerOnPort(index + 1);
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    process.stdout.write(`==========================================================\n`);
    process.stdout.write(`Cricket Premier League Web Application is running live at:\n`);
    process.stdout.write(`-> http://localhost:${PORT}/\n`);
    process.stdout.write(`-> http://127.0.0.1:${PORT}/\n`);
    process.stdout.write(`==========================================================\n`);
  });
}

startServerOnPort(0);
