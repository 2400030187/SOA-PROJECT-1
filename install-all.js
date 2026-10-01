const { spawnSync } = require('child_process');
const path = require('path');

const services = ['eureka-server', 'user-service', 'vehicle-service', 'booking-service', 'api-gateway', 'frontend'];

console.log('📦 Installing npm dependencies across all DriveEase services...');

services.forEach(service => {
  console.log(`\n🔹 Installing dependencies for: ${service}`);
  const servicePath = path.join(__dirname, service);
  const result = spawnSync('npm', ['install'], { cwd: servicePath, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`❌ Failed to install dependencies for ${service}`);
  }
});

console.log('\n✅ All service dependencies installed successfully!');
