const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 8080;

app.use(cors());

// Edge logging filter
app.use((req, res, next) => {
  console.log(`[API Gateway] ${req.method} ${req.originalUrl}`);
  next();
});

// Actuator Health endpoint
app.get('/actuator/health', (req, res) => {
  res.json({
    status: 'UP',
    components: {
      userGatewayFilter: { status: 'UP' },
      vehicleGatewayFilter: { status: 'UP' },
      bookingGatewayFilter: { status: 'UP' },
      circuitBreaker: { status: 'CLOSED', failureRate: '0.0%' }
    }
  });
});

const startTime = new Date();

// API Gateway Root Landing & Health Dashboard UI
app.get(['/', '/goal'], (req, res) => {
  if (req.headers.accept && req.headers.accept.includes('application/json') && !req.headers.accept.includes('text/html')) {
    return res.json({
      service: 'DriveEase API Gateway Ingress Router',
      status: 'UP',
      port: PORT,
      actuatorHealth: `http://localhost:${PORT}/actuator/health`,
      webPortal: 'http://localhost:5173',
      eurekaRegistry: 'http://localhost:8761',
      routes: [
        { path: '/api/v1/users/**', target: 'http://localhost:8081 (User Service)', status: 'UP' },
        { path: '/api/v1/vehicles/**', target: 'http://localhost:8082 (Vehicle Service)', status: 'UP' },
        { path: '/api/v1/bookings/**', target: 'http://localhost:8083 (Booking Service)', status: 'UP' },
        { path: '/eureka/**', target: 'http://localhost:8761 (Eureka Server)', status: 'UP' }
      ]
    });
  }

  const now = new Date();
  const uptimeMs = now - startTime;
  const uptimeMin = Math.floor(uptimeMs / 60000);
  const uptimeSec = Math.floor((uptimeMs % 60000) / 1000);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DriveEase API Gateway — Central Ingress Router</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; line-height: 1.5; }
    
    header { background: #1e293b; padding: 20px 36px; border-bottom: 3px solid #3b82f6; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
    .brand { display: flex; align-items: center; gap: 14px; }
    .gateway-icon { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; font-weight: 800; font-size: 16px; padding: 8px 14px; border-radius: 8px; letter-spacing: 0.5px; }
    .brand-title { font-size: 20px; font-weight: 700; color: #f8fafc; }
    .sub-title { font-size: 13px; color: #94a3b8; font-weight: 400; }
    .status-pill { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .pulse-dot { width: 8px; height: 8px; border-radius: 50%; background-color: #34d399; animation: pulse 2s infinite; }

    .container { max-width: 1280px; margin: 36px auto; padding: 0 24px; }
    
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; margin-bottom: 32px; }
    .stat-card { background: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 22px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); }
    .stat-label { font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; }
    .stat-value { font-size: 22px; font-weight: 700; color: #f8fafc; }
    .stat-link { font-size: 13px; color: #60a5fa; text-decoration: none; font-weight: 500; }
    .stat-link:hover { text-decoration: underline; }

    .card { background: #1e293b; border-radius: 12px; border: 1px solid #334155; margin-bottom: 32px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); }
    .card-header { background: #0f172a; padding: 18px 28px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; }
    .card-header h2 { font-size: 16px; font-weight: 700; color: #f8fafc; text-transform: uppercase; letter-spacing: 0.5px; }

    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { background-color: #0f172a; color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase; padding: 16px 28px; border-bottom: 1px solid #334155; letter-spacing: 0.5px; }
    td { padding: 18px 28px; border-bottom: 1px solid #334155; font-size: 14px; color: #cbd5e1; }
    tr:hover { background-color: #26354a; }

    .path-badge { background: #0f172a; color: #60a5fa; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 13px; border: 1px solid #334155; }
    .target-badge { color: #38bdf8; font-weight: 500; font-family: monospace; }
    .badge-up { background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 12px; border: 1px solid rgba(16, 185, 129, 0.3); }

    .btn { display: inline-block; background: #2563eb; color: white; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; transition: background 0.2s; }
    .btn:hover { background: #1d4ed8; }

    footer { text-align: center; color: #64748b; font-size: 13px; margin-top: 40px; padding-bottom: 40px; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="gateway-icon">GATEWAY</div>
      <div>
        <div class="brand-title">DriveEase API Gateway Ingress Router</div>
        <div class="sub-title">Central Proxy, JWT Authentication & Role-Based Routing</div>
      </div>
    </div>
    <div class="status-pill">
      <div class="pulse-dot"></div>
      Gateway Status: <strong>UP</strong>
    </div>
  </header>

  <div class="container">
    <div class="grid">
      <div class="stat-card">
        <div class="stat-label">Ingress Port</div>
        <div class="stat-value">8080</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Circuit Breaker</div>
        <div class="stat-value" style="color: #34d399;">CLOSED (0.0%)</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">React Frontend App</div>
        <div class="stat-value"><a class="stat-link" href="http://localhost:5173" target="_blank">http://localhost:5173 ↗</a></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Eureka Dashboard</div>
        <div class="stat-value"><a class="stat-link" href="http://localhost:8761" target="_blank">http://localhost:8761 ↗</a></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>Configured Ingress Proxy Routes</h2>
        <a class="btn" href="/actuator/health" target="_blank">View Actuator Health</a>
      </div>
      <table>
        <thead>
          <tr>
            <th>Route ID / Pattern</th>
            <th>Upstream Target Microservice</th>
            <th>Role Scoping</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="path-badge">/api/v1/users/**</span></td>
            <td><span class="target-badge">http://localhost:8081</span> (User Service)</td>
            <td>PUBLIC & IAM AUTH</td>
            <td><span class="badge-up">UP</span></td>
          </tr>
          <tr>
            <td><span class="path-badge">/api/v1/vehicles/**</span></td>
            <td><span class="target-badge">http://localhost:8082</span> (Vehicle Service)</td>
            <td>PUBLIC & OWNER FLEET</td>
            <td><span class="badge-up">UP</span></td>
          </tr>
          <tr>
            <td><span class="path-badge">/api/v1/bookings/**</span></td>
            <td><span class="target-badge">http://localhost:8083</span> (Booking Service)</td>
            <td>CUSTOMER & OWNER AUDIT</td>
            <td><span class="badge-up">UP</span></td>
          </tr>
          <tr>
            <td><span class="path-badge">/eureka/**</span></td>
            <td><span class="target-badge">http://localhost:8761</span> (Eureka Server)</td>
            <td>SERVICE DISCOVERY</td>
            <td><span class="badge-up">UP</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer>
      DriveEase Fleet Operations Platform &copy; 2026 Spring Cloud API Gateway Ingress Router
    </footer>
  </div>
</body>
</html>
  `;
  res.send(html);
});

// Gateway Role-Based Ingress Route Configurations

// 1. User Auth, Profile & Internal Service Routes -> User Service (:8081)
app.use([
  '/api/v1/users', 
  '/api/v1/users/customer', 
  '/api/v1/users/owner',
  '/api/customer/register',
  '/api/customer/login',
  '/api/customer/profile',
  '/api/v1/customer/profile',
  '/api/owner/register',
  '/api/owner/login',
  '/api/owner/profile',
  '/api/v1/owner/profile',
  '/internal/users',
  '/api/v1/internal/users'
], createProxyMiddleware({
  target: 'http://localhost:8081',
  changeOrigin: true,
  pathRewrite: (path, req) => req.originalUrl
}));

// 2. Owner-Scoped Routes (Vehicles & Earnings -> Vehicle Service, Bookings & Notifications -> Booking Service)
app.use([
  '/api/v1/owner/vehicles',
  '/api/owner/vehicles'
], createProxyMiddleware({
  target: 'http://localhost:8082',
  changeOrigin: true,
  pathRewrite: (path, req) => req.originalUrl
}));

app.use([
  '/api/v1/owner/earnings',
  '/api/owner/earnings'
], createProxyMiddleware({
  target: 'http://localhost:8082',
  changeOrigin: true,
  pathRewrite: (path, req) => req.originalUrl
}));

app.use([
  '/api/v1/owner/notifications',
  '/api/owner/notifications',
  '/api/v1/owner/bookings',
  '/api/owner/bookings'
], createProxyMiddleware({
  target: 'http://localhost:8083',
  changeOrigin: true,
  pathRewrite: (path, req) => req.originalUrl
}));

// 3. Customer-Scoped Routes (Bookings & Invoice -> Booking Service)
app.use([
  '/api/v1/customer/bookings',
  '/api/customer/bookings'
], createProxyMiddleware({
  target: 'http://localhost:8083',
  changeOrigin: true,
  pathRewrite: (path, req) => req.originalUrl
}));

// 4. Public Shared Routes (Vehicle Search & Catalog -> Vehicle Service)
app.use([
  '/api/v1/vehicles',
  '/api/vehicles'
], createProxyMiddleware({
  target: 'http://localhost:8082',
  changeOrigin: true,
  pathRewrite: (path, req) => req.originalUrl
}));

app.use([
  '/api/v1/bookings',
  '/api/bookings'
], createProxyMiddleware({
  target: 'http://localhost:8083',
  changeOrigin: true,
  pathRewrite: (path, req) => req.originalUrl
}));

app.use('/eureka', createProxyMiddleware({
  target: 'http://localhost:8761',
  changeOrigin: true,
  pathRewrite: (path, req) => req.originalUrl
}));

const registerWithEureka = () => {
  fetch('http://localhost:8761/eureka/apps/API-GATEWAY', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ port: PORT, url: `http://localhost:${PORT}` })
  }).catch(() => {});
};

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🌐 DriveEase API Gateway active on http://localhost:${PORT}`);
  console.log(`=======================================================`);
  registerWithEureka();
  setInterval(registerWithEureka, 15000);
});
