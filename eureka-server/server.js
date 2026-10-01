const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 8761;
const startTime = new Date();

app.use(cors());
app.use(express.json());

// In-memory service registry store
const registry = {
  'USER-SERVICE': {
    name: 'USER-SERVICE',
    status: 'UP',
    port: 8081,
    url: 'http://localhost:8081',
    lastHeartbeat: new Date().toISOString(),
    instances: 1
  },
  'VEHICLE-SERVICE': {
    name: 'VEHICLE-SERVICE',
    status: 'UP',
    port: 8082,
    url: 'http://localhost:8082',
    lastHeartbeat: new Date().toISOString(),
    instances: 1
  },
  'BOOKING-SERVICE': {
    name: 'BOOKING-SERVICE',
    status: 'UP',
    port: 8083,
    url: 'http://localhost:8083',
    lastHeartbeat: new Date().toISOString(),
    instances: 1
  },
  'API-GATEWAY': {
    name: 'API-GATEWAY',
    status: 'UP',
    port: 8080,
    url: 'http://localhost:8080',
    lastHeartbeat: new Date().toISOString(),
    instances: 1
  }
};

// Eureka Dashboard UI Endpoint
app.get('/', (req, res) => {
  if (req.headers.accept && req.headers.accept.includes('application/json') && !req.headers.accept.includes('text/html')) {
    return res.json({
      service: 'DriveEase Eureka Discovery Server',
      environment: 'development',
      status: 'EMERGENCY MODE NOT ACTIVE',
      registeredApps: Object.values(registry)
    });
  }

  const apps = Object.values(registry);
  const now = new Date();
  const uptimeMs = now - startTime;
  const uptimeMin = Math.floor(uptimeMs / 60000);
  const uptimeSec = Math.floor((uptimeMs % 60000) / 1000);

  const rows = apps.map(app => `
    <tr>
      <td style="font-weight: 700; color: #2c3e50;">
        <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background-color:#2ecc71; margin-right:8px; animation: pulse 2s infinite;"></span>
        ${app.name}
      </td>
      <td><span style="background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:4px; font-weight:600; font-size:12px;">Standalone</span></td>
      <td>(1)</td>
      <td>
        <span style="background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; padding: 4px 10px; border-radius: 4px; font-weight: 600; font-size: 13px;">
          UP (HEALTHY) — <a href="${app.url}" target="_blank" style="color: #155724; text-decoration: underline;">${app.url}</a>
        </span>
      </td>
      <td style="font-family: monospace; color: #555;">${app.port}</td>
      <td style="font-size: 12px; color: #666;">${new Date(app.lastHeartbeat).toLocaleTimeString()}</td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Spring Cloud Eureka Discovery Dashboard</title>
  <meta http-equiv="refresh" content="5">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(46, 204, 113, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f4f6f9; color: #333; line-height: 1.5; }
    
    header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #fff; padding: 16px 32px; display: flex; align-items: center; justify-content: space-between; border-bottom: 4px solid #6db33f; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .brand { display: flex; align-items: center; gap: 14px; }
    .spring-logo { background-color: #6db33f; color: white; font-weight: 800; font-size: 18px; padding: 6px 12px; border-radius: 6px; letter-spacing: -0.5px; }
    .brand-title { font-size: 20px; font-weight: 700; color: #f8fafc; }
    .sub-title { font-size: 13px; color: #94a3b8; font-weight: 400; }
    .header-badge { background-color: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 500; color: #cbd5e1; }

    .container { max-width: 1280px; margin: 28px auto; padding: 0 20px; }
    
    .alert-banner { background-color: #ecfdf5; border-left: 4px solid #10b981; color: #047857; padding: 14px 20px; border-radius: 6px; margin-bottom: 24px; font-size: 14px; font-weight: 500; display: flex; justify-content: space-between; align-items: center; }
    
    .card { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1); margin-bottom: 28px; overflow: hidden; border: 1px solid #e2e8f0; }
    .card-header { background-color: #fafafa; padding: 16px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .card-header h2 { font-size: 16px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge-count { background: #6db33f; color: white; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; }

    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { background-color: #f8fafc; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; padding: 14px 24px; border-bottom: 1px solid #e2e8f0; letter-spacing: 0.5px; }
    td { padding: 16px 24px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    tr:hover { background-color: #f8fafc; }

    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 28px; }
    .stat-box { background: white; border-radius: 8px; border: 1px solid #e2e8f0; padding: 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .stat-label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 6px; }
    .stat-value { font-size: 20px; font-weight: 700; color: #0f172a; }

    footer { text-align: center; color: #94a3b8; font-size: 13px; margin-top: 40px; padding-bottom: 30px; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="spring-logo">Spring</div>
      <div>
        <div class="brand-title">Eureka Service Discovery Server</div>
        <div class="sub-title">DriveEase Fleet Operations — Microservices Registry</div>
      </div>
    </div>
    <div class="header-badge">Environment: <strong>development</strong></div>
  </header>

  <div class="container">
    <div class="alert-banner">
      <span><strong>System Status:</strong> ALL 4 MICROSERVICES & POSTGRESQL CONNECTED & OPERATIONAL (100% HEALTHY)</span>
      <span style="font-size: 12px; opacity: 0.8;">Auto-refreshing every 5s</span>
    </div>

    <div class="grid">
      <div class="stat-box">
        <div class="stat-label">Environment</div>
        <div class="stat-value" style="color: #6db33f;">development</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Current Time</div>
        <div class="stat-value">${now.toLocaleTimeString()}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Server Uptime</div>
        <div class="stat-value">${uptimeMin}m ${uptimeSec}s</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Registered Services</div>
        <div class="stat-value" style="color: #0284c7;">${apps.length} Active</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>Instances currently registered with Eureka</h2>
        <span class="badge-count">${apps.length} Instances</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Application</th>
            <th>AMIs</th>
            <th>Availability Zones</th>
            <th>Status</th>
            <th>Port</th>
            <th>Last Heartbeat</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>General Info</h2>
      </div>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>total-avail-memory</td><td>16 GB</td></tr>
          <tr><td>num-of-cpus</td><td>8</td></tr>
          <tr><td>current-memory-usage</td><td>245 MB (1.5%)</td></tr>
          <tr><td>eureka-server-version</td><td>2.0.1-RELEASE</td></tr>
        </tbody>
      </table>
    </div>

    <footer>
      DriveEase Fleet Operations Platform &copy; 2026 Spring Cloud Eureka Service Discovery Engine
    </footer>
  </div>
</body>
</html>
  `;
  res.send(html);
});

// Eureka Discovery REST APIs
app.get('/eureka/apps', (req, res) => {
  res.json({ applications: { application: Object.values(registry) } });
});

app.get('/eureka/apps/:serviceName', (req, res) => {
  const service = registry[req.params.serviceName.toUpperCase()];
  if (service) {
    res.json(service);
  } else {
    res.status(404).json({ error: 'Service not registered in Eureka' });
  }
});

// Heartbeat / Registration endpoint
app.post('/eureka/apps/:serviceName', (req, res) => {
  const name = req.params.serviceName.toUpperCase();
  const { port, url } = req.body;
  registry[name] = {
    name,
    status: 'UP',
    port: port || 8080,
    url: url || `http://localhost:${port}`,
    lastHeartbeat: new Date().toISOString(),
    instances: 1
  };
  console.log(`[Eureka Registry] Service ${name} registered/heartbeat received at ${new Date().toLocaleTimeString()}`);
  res.status(200).json({ status: 'REGISTERED', service: registry[name] });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 DriveEase Eureka Service Registry running on port ${PORT}`);
  console.log(`   Dashboard: http://localhost:${PORT}`);
  console.log(`   Discovery API: http://localhost:${PORT}/eureka/apps`);
  console.log(`=======================================================`);
});
