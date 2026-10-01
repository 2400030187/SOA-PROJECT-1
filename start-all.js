const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const services = [
  { name: 'Eureka Registry', dir: 'eureka-server', color: '\x1b[35m' },
  { name: 'User Service', dir: 'user-service', color: '\x1b[36m' },
  { name: 'Vehicle Service', dir: 'vehicle-service', color: '\x1b[32m' },
  { name: 'Booking Service', dir: 'booking-service', color: '\x1b[33m' },
  { name: 'API Gateway', dir: 'api-gateway', color: '\x1b[34m' },
  { name: 'React Frontend', dir: 'frontend', color: '\x1b[31m' }
];

const resetColor = '\x1b[0m';

console.log('🚀 Launching DriveEase Microservices Architecture & Frontend...\n');

services.forEach(svc => {
  const svcPath = path.join(__dirname, svc.dir);
  const child = spawn('npm', ['start'], { cwd: svcPath, shell: true });

  child.stdout.on('data', data => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => console.log(`${svc.color}[${svc.name}]${resetColor} ${line}`));
  });

  child.stderr.on('data', data => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => console.log(`${svc.color}[${svc.name} ERR]${resetColor} ${line}`));
  });

  child.on('close', code => {
    console.log(`${svc.color}[${svc.name}]${resetColor} Exited with code ${code}`);
  });
});

// Port Forwarder: Allow accessing frontend on port 3000 as well as 5173
setTimeout(() => {
  try {
    const proxyServer = http.createServer((req, res) => {
      const options = {
        hostname: '127.0.0.1',
        port: 5173,
        path: req.url,
        method: req.method,
        headers: req.headers
      };

      const connector = http.request(options, (targetRes) => {
        res.writeHead(targetRes.statusCode, targetRes.headers);
        targetRes.pipe(res, { end: true });
      });

      connector.on('error', () => {
        res.writeHead(502);
        res.end('Vite frontend initializing on port 5173...');
      });

      req.pipe(connector, { end: true });
    });

    proxyServer.listen(3000, () => {
      console.log('\x1b[32m[Port Forwarder]\x1b[0m Frontend dual alias active on http://localhost:3000 -> http://localhost:5173');
    });
  } catch (e) {
    // Port 3000 already in use
  }
}, 3000);
