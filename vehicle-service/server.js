const express = require('express');
const cors = require('cors');
const { initDb, upsertVehicleInDb, deleteVehicleFromDb, upsertMaintenanceLogInDb } = require('./db');

const app = express();
const PORT = 8082;

app.use(cors());
app.use(express.json());

// Root Status Landing Page & Health Check
app.get(['/actuator/health', '/health'], (req, res) => {
  res.json({ status: 'UP', service: 'vehicle-service', database: 'PostgreSQL (user: root)', port: PORT });
});

app.get('/', (req, res) => {
  if (req.headers.accept && req.headers.accept.includes('application/json') && !req.headers.accept.includes('text/html')) {
    return res.json({ service: 'Vehicle Service', status: 'UP', port: PORT, database: 'PostgreSQL (user: root)' });
  }
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>DriveEase Vehicle Service — Port 8082</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Inter', sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; margin: 0; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; max-width: 600px; margin: 40px auto; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
        .badge { background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 0.85rem; border: 1px solid rgba(16, 185, 129, 0.3); }
      </style>
    </head>
    <body>
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h2 style="margin:0;">Vehicle Service</h2>
          <span class="badge">UP (HEALTHY)</span>
        </div>
        <p style="color:#94a3b8; font-size:0.9rem;">DriveEase Fleet Inventory, Telematics & State Machine Engine.</p>
        <hr style="border:0; border-top:1px solid #334155; margin:16px 0;" />
        <p><strong>Port:</strong> 8082</p>
        <p><strong>Database:</strong> PostgreSQL (User: <code>root</code>, DB: <code>driveease_db</code>)</p>
        <p><strong>Web Portal:</strong> <a href="http://localhost:5173" style="color:#60a5fa;">http://localhost:5173</a></p>
      </div>
    </body>
    </html>
  `);
});

// DB per service: Vehicles in-memory dataset (Prices in INR ₹)
const vehiclesDb = [
  {
    id: 'v-101',
    ownerId: 'u-1002',
    make: 'Tesla',
    model: 'Model 3 Long Range',
    year: 2024,
    licensePlate: 'MH-02-EV-7890',
    category: 'ELECTRIC',
    fuelType: 'ELECTRIC',
    dailyRate: 4500.00,
    currency: 'INR',
    status: 'AVAILABLE', // AVAILABLE, RESERVED, IN_USE, IN_MAINTENANCE, OUT_OF_SERVICE
    currentOdometer: 14200,
    location: 'Mumbai Central Hub',
    imageUrl: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=800&q=80',
    features: ['Autopilot', '480km Range', 'Premium Sound', 'Supercharging Included']
  },
  {
    id: 'v-102',
    ownerId: 'u-1002',
    make: 'BMW',
    model: 'X5 xDrive40i',
    year: 2023,
    licensePlate: 'DL-01-AB-4567',
    category: 'SUV',
    fuelType: 'GASOLINE',
    dailyRate: 6500.00,
    currency: 'INR',
    status: 'AVAILABLE',
    currentOdometer: 22800,
    location: 'Delhi Airport Terminal 3',
    imageUrl: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80',
    features: ['xDrive AWD', 'Panoramic Sunroof', 'Heated Seats', 'Leather Interior']
  },
  {
    id: 'v-103',
    ownerId: 'u-1002',
    make: 'Mercedes-Benz',
    model: 'C-Class Sedan',
    year: 2024,
    licensePlate: 'KA-05-MB-1234',
    category: 'LUXURY',
    fuelType: 'HYBRID',
    dailyRate: 5500.00,
    currency: 'INR',
    status: 'AVAILABLE',
    currentOdometer: 9500,
    location: 'Bengaluru Indiranagar Hub',
    imageUrl: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80',
    features: ['Mild Hybrid EQ', 'Burmester Audio', 'Ambient Lighting', 'Adaptive Cruise']
  },
  {
    id: 'v-104',
    ownerId: 'u-1002',
    make: 'Toyota',
    model: 'RAV4 Hybrid',
    year: 2023,
    licensePlate: 'MH-12-TY-3456',
    category: 'SUV',
    fuelType: 'HYBRID',
    dailyRate: 3200.00,
    currency: 'INR',
    status: 'AVAILABLE',
    currentOdometer: 31000,
    location: 'Pune Station Depot',
    imageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80',
    features: ['18 km/l Mileage', 'Apple CarPlay', 'Safety Sense 3.0', 'Spacious Boot']
  },
  {
    id: 'v-105',
    ownerId: 'u-1002',
    make: 'Porsche',
    model: 'Taycan 4S',
    year: 2024,
    licensePlate: 'MH-01-PR-9999',
    category: 'LUXURY',
    fuelType: 'ELECTRIC',
    dailyRate: 11000.00,
    currency: 'INR',
    status: 'IN_MAINTENANCE',
    currentOdometer: 6400,
    location: 'Mumbai Central Hub',
    imageUrl: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=800&q=80',
    features: ['0-100 in 3.8s', '800V Charging', 'Performance Battery Plus']
  },
  {
    id: 'v-106',
    ownerId: 'u-1002',
    make: 'Ford',
    model: 'F-150 Lightning',
    year: 2024,
    licensePlate: 'KA-03-FD-1500',
    category: 'TRUCK',
    fuelType: 'ELECTRIC',
    dailyRate: 4800.00,
    currency: 'INR',
    status: 'AVAILABLE',
    currentOdometer: 11200,
    location: 'Bengaluru Indiranagar Hub',
    imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
    features: ['Mega Power Frunk', 'Pro Power Onboard', 'AWD Towing Capacity']
  }
];

// Maintenance logs store
const maintenanceLogsDb = [
  {
    id: 'm-501',
    vehicleId: 'v-105',
    serviceDate: '2026-09-20',
    issueDescription: 'Scheduled 6,000-mile high-voltage diagnostics & brake flushing',
    cost: 15000.00,
    currency: 'INR',
    status: 'IN_PROGRESS'
  }
];

// Vehicle State Machine Transition Table
const ALLOWED_TRANSITIONS = {
  'AVAILABLE': ['RESERVED', 'IN_MAINTENANCE', 'OUT_OF_SERVICE'],
  'RESERVED': ['IN_USE', 'AVAILABLE', 'IN_MAINTENANCE'],
  'IN_USE': ['AVAILABLE', 'IN_MAINTENANCE'],
  'IN_MAINTENANCE': ['AVAILABLE', 'OUT_OF_SERVICE'],
  'OUT_OF_SERVICE': ['AVAILABLE'] // Re-commissioning
};

// --- REST ENDPOINTS --- //

// Helper for live filtering vehicles against active booking overlap
const filterVehiclesLive = async (query) => {
  let { category, location, minPrice, maxPrice, status, search, startDate, endDate, pickupDate, returnDate } = query;
  
  // Rule: Must return ONLY vehicles with status = AVAILABLE
  let results = vehiclesDb.filter(v => v.status === 'AVAILABLE');

  if (category && category !== 'ALL') {
    results = results.filter(v => v.category.toUpperCase() === category.toUpperCase());
  }

  if (location && location !== 'ALL') {
    results = results.filter(v => v.location.toLowerCase().includes(location.toLowerCase()));
  }

  if (minPrice) {
    results = results.filter(v => v.dailyRate >= parseFloat(minPrice));
  }

  if (maxPrice) {
    results = results.filter(v => v.dailyRate <= parseFloat(maxPrice));
  }

  if (search) {
    const q = search.toLowerCase();
    results = results.filter(v =>
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      (v.licensePlate && v.licensePlate.toLowerCase().includes(q))
    );
  }

  // Live real-time check against Booking Service for date range overlap
  const reqStart = startDate || pickupDate || new Date().toISOString().split('T')[0];
  const reqEnd = endDate || returnDate || reqStart;

  try {
    const activeRes = await fetch(`http://localhost:8083/api/internal/bookings/active-windows?startDate=${reqStart}&endDate=${reqEnd}`);
    if (activeRes.ok) {
      const activeData = await activeRes.json();
      const blockedVehicleIds = activeData.blockedVehicleIds || [];
      results = results.filter(v => !blockedVehicleIds.includes(v.id));
    }
  } catch (err) {
    console.error('[Vehicle Service] Live availability check error:', err.message);
  }

  return results;
};

// Public vehicle search endpoint (Unversioned & Versioned) - Live Availability
app.get(['/api/vehicles/search', '/api/v1/vehicles/search'], async (req, res) => {
  const results = await filterVehiclesLive(req.query);
  res.json({ total: results.length, currency: 'INR', vehicles: results });
});

// 1. Get All / Filter Vehicles - Live Availability
app.get(['/api/vehicles', '/api/v1/vehicles'], async (req, res) => {
  const results = await filterVehiclesLive(req.query);
  res.json({ total: results.length, currency: 'INR', vehicles: results });
});

// 2. Get Single Vehicle Details (with availability calendar)
app.get(['/api/vehicles/:id', '/api/v1/vehicles/:id'], async (req, res) => {
  const vehicle = vehiclesDb.find(v => v.id === req.params.id);
  if (!vehicle) return res.status(404).json({ status: 404, message: 'Vehicle not found' });

  let blockedDates = [];
  try {
    const calendarRes = await fetch(`http://localhost:8083/api/vehicles/${vehicle.id}/calendar`);
    if (calendarRes.ok) {
      const calendarData = await calendarRes.json();
      blockedDates = calendarData.blockedDates || [];
    }
  } catch (err) {
    // Booking service offline or non-blocking fallback
  }

  res.json({ 
    ...vehicle, 
    currency: 'INR',
    ratePerDay: vehicle.dailyRate,
    blockedDates,
    calendar: blockedDates
  });
});

// --- OWNER-SCOPED VEHICLE APIS --- //

// Get vehicles belonging to owner
app.get(['/api/owner/vehicles', '/api/v1/owner/vehicles'], (req, res) => {
  const ownerVehicles = vehiclesDb;
  res.json({ total: ownerVehicles.length, currency: 'INR', vehicles: ownerVehicles });
});

// Create new vehicle (Owner / Admin)
app.post(['/api/owner/vehicles', '/api/v1/owner/vehicles'], (req, res) => {
  const { make, model, year, licensePlate, category, fuelType, dailyRate, location, imageUrl, features } = req.body;

  if (!make || !model || !licensePlate || !dailyRate) {
    return res.status(400).json({ error: 'Missing required vehicle properties' });
  }

  const newVehicle = {
    id: `v-${Date.now()}`,
    ownerId: req.headers['x-user-id'] || 'u-1002',
    make,
    model,
    year: parseInt(year) || 2024,
    licensePlate: licensePlate.toUpperCase(),
    category: category || 'SEDAN',
    fuelType: fuelType || 'GASOLINE',
    dailyRate: parseFloat(dailyRate),
    currency: 'INR',
    status: 'AVAILABLE',
    currentOdometer: 0,
    location: location || 'Mumbai Central Hub',
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
    features: Array.isArray(features) ? features : ['Standard Package']
  };

  vehiclesDb.push(newVehicle);
  upsertVehicleInDb(newVehicle);
  console.log(`[Vehicle Service] New vehicle added by Owner: ${newVehicle.make} ${newVehicle.model} (₹${newVehicle.dailyRate}/day)`);
  res.status(201).json(newVehicle);
});

// Update vehicle (Owner)
app.put(['/api/owner/vehicles/:id', '/api/v1/owner/vehicles/:id'], (req, res) => {
  const vehicle = vehiclesDb.find(v => v.id === req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const { make, model, year, dailyRate, ratePerDay, daily_rate, location, category, fuelType, features } = req.body;
  const changes = [];

  if (make && make !== vehicle.make) { vehicle.make = make; changes.push(`Make set to ${make}`); }
  if (model && model !== vehicle.model) { vehicle.model = model; changes.push(`Model set to ${model}`); }
  if (year && parseInt(year) !== vehicle.year) { vehicle.year = parseInt(year); changes.push(`Year set to ${year}`); }

  const newRate = dailyRate || ratePerDay || daily_rate;
  if (newRate && parseFloat(newRate) !== vehicle.dailyRate) {
    const oldRate = vehicle.dailyRate;
    vehicle.previousDailyRate = oldRate;
    vehicle.dailyRate = parseFloat(newRate);
    changes.push(`Rate revised: ₹${oldRate.toLocaleString('en-IN')} ➔ ₹${vehicle.dailyRate.toLocaleString('en-IN')}/day`);
  }

  if (location && location !== vehicle.location) {
    vehicle.location = location;
    changes.push(`Depot updated to ${location}`);
  }
  if (category && category !== vehicle.category) { vehicle.category = category; changes.push(`Category set to ${category}`); }
  if (fuelType && fuelType !== vehicle.fuelType) { vehicle.fuelType = fuelType; changes.push(`Fuel type set to ${fuelType}`); }
  if (features) vehicle.features = features;

  if (changes.length > 0) {
    vehicle.lastChangeSummary = changes.join(' • ');
    vehicle.lastChangedAt = new Date().toISOString();
  }

  upsertVehicleInDb(vehicle);
  res.json({ message: 'Vehicle updated successfully', vehicle });
});

// Update vehicle daily rate / rate per day (Owner / Admin)
app.patch(['/api/owner/vehicles/:id/rate', '/api/v1/owner/vehicles/:id/rate', '/api/vehicles/:id/rate', '/api/v1/vehicles/:id/rate'], (req, res) => {
  const vehicle = vehiclesDb.find(v => v.id === req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const { dailyRate, ratePerDay, daily_rate } = req.body;
  const newRate = parseFloat(dailyRate || ratePerDay || daily_rate);
  if (isNaN(newRate) || newRate <= 0) {
    return res.status(400).json({ error: 'Invalid daily rate provided. Rate must be a positive number.' });
  }

  const previousRate = vehicle.dailyRate;
  vehicle.previousDailyRate = previousRate;
  vehicle.dailyRate = newRate;
  vehicle.lastChangeSummary = `Daily rate revised: ₹${previousRate.toLocaleString('en-IN')} ➔ ₹${newRate.toLocaleString('en-IN')}/day`;
  vehicle.lastChangedAt = new Date().toISOString();

  upsertVehicleInDb(vehicle);
  console.log(`[Vehicle Service] Daily Rate updated for ${vehicle.id} (${vehicle.make} ${vehicle.model}): ₹${previousRate} ➔ ₹${newRate}/day`);

  res.json({
    message: `Rate per day updated successfully to ₹${newRate.toLocaleString('en-IN')}`,
    vehicleId: vehicle.id,
    previousRate,
    dailyRate: vehicle.dailyRate,
    ratePerDay: vehicle.dailyRate,
    lastChangeSummary: vehicle.lastChangeSummary,
    lastChangedAt: vehicle.lastChangedAt,
    vehicle
  });
});


// Remove vehicle listing (Owner)
app.delete('/api/v1/owner/vehicles/:id', (req, res) => {
  const index = vehiclesDb.findIndex(v => v.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Vehicle not found' });

  const removed = vehiclesDb.splice(index, 1)[0];
  deleteVehicleFromDb(removed.id);
  console.log(`[Vehicle Service] Vehicle removed: ${removed.id}`);
  res.json({ message: `Vehicle ${removed.make} ${removed.model} removed from fleet`, vehicleId: removed.id });
});

// Owner vehicle status transition
app.patch('/api/v1/owner/vehicles/:id/status', (req, res) => {
  const { status, reason } = req.body;
  const vehicle = vehiclesDb.find(v => v.id === req.params.id);

  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  const targetStatus = status ? status.toUpperCase() : null;

  if (!targetStatus || !ALLOWED_TRANSITIONS[vehicle.status]) {
    return res.status(400).json({ error: 'Invalid target status' });
  }

  const allowed = ALLOWED_TRANSITIONS[vehicle.status];
  if (!allowed.includes(targetStatus)) {
    return res.status(409).json({
      error: `Invalid state transition! Cannot transition from state '${vehicle.status}' to '${targetStatus}'. Allowed target states: [${allowed.join(', ')}]`
    });
  }

  const previousStatus = vehicle.status;
  vehicle.status = targetStatus;
  vehicle.lastChangeSummary = `Vehicle status updated: ${previousStatus} ➔ ${targetStatus}${reason ? ` (${reason})` : ''}`;
  vehicle.lastChangedAt = new Date().toISOString();

  if (targetStatus === 'IN_MAINTENANCE') {
    const logItem = {
      id: `m-${Date.now()}`,
      vehicleId: vehicle.id,
      serviceDate: new Date().toISOString().split('T')[0],
      issueDescription: reason || 'Scheduled Fleet Maintenance & Safety Check',
      cost: 5000.00,
      currency: 'INR',
      status: 'IN_PROGRESS'
    };
    maintenanceLogsDb.push(logItem);
    upsertMaintenanceLogInDb(logItem);
  }

  upsertVehicleInDb(vehicle);

  res.json({
    id: vehicle.id,
    previousStatus,
    currentStatus: vehicle.status,
    updatedAt: new Date().toISOString(),
    message: `State transition to ${targetStatus} successful`
  });
});

// Owner revenue report endpoint (in INR ₹)
app.get('/api/v1/owner/earnings', (req, res) => {
  const totalFleetCount = vehiclesDb.length;
  const activeRentals = vehiclesDb.filter(v => v.status === 'RESERVED' || v.status === 'IN_USE').length;
  
  const vehicleEarnings = vehiclesDb.map((v, idx) => {
    const bookingCount = 4 + (idx % 5);
    const monthlyRev = parseFloat((v.dailyRate * (10 + (idx % 6))).toFixed(2));
    return {
      vehicleId: v.id,
      makeModel: `${v.make} ${v.model}`,
      licensePlate: v.licensePlate,
      dailyRate: v.dailyRate,
      totalBookings: bookingCount,
      monthlyRevenue: monthlyRev,
      currency: 'INR'
    };
  });

  const totalMonthlyRevenue = vehicleEarnings.reduce((acc, curr) => acc + curr.monthlyRevenue, 0);

  res.json({
    currency: 'INR',
    totalMonthlyRevenue: parseFloat(totalMonthlyRevenue.toFixed(2)),
    formattedTotalRevenue: `₹${totalMonthlyRevenue.toLocaleString('en-IN')}`,
    totalFleetCount,
    activeRentals,
    vehicleBreakdown: vehicleEarnings
  });
});

// Backward compatible POST /api/v1/vehicles
app.post('/api/v1/vehicles', (req, res) => {
  const { make, model, year, licensePlate, category, fuelType, dailyRate, location, imageUrl, features } = req.body;

  if (!make || !model || !licensePlate || !dailyRate) {
    return res.status(400).json({ error: 'Missing required vehicle properties' });
  }

  const newVehicle = {
    id: `v-${Date.now()}`,
    ownerId: 'u-1002',
    make,
    model,
    year: parseInt(year) || 2024,
    licensePlate: licensePlate.toUpperCase(),
    category: category || 'SEDAN',
    fuelType: fuelType || 'GASOLINE',
    dailyRate: parseFloat(dailyRate),
    currency: 'INR',
    status: 'AVAILABLE',
    currentOdometer: 0,
    location: location || 'Mumbai Central Hub',
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
    features: Array.isArray(features) ? features : ['Standard Package']
  };

  vehiclesDb.push(newVehicle);
  upsertVehicleInDb(newVehicle);
  res.status(201).json(newVehicle);
});

// Vehicle State Machine Controlled Transition
app.patch('/api/v1/vehicles/:id/status', (req, res) => {
  const { status, reason } = req.body;
  const vehicle = vehiclesDb.find(v => v.id === req.params.id);

  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  const targetStatus = status ? status.toUpperCase() : null;

  if (!targetStatus || !ALLOWED_TRANSITIONS[vehicle.status]) {
    return res.status(400).json({ error: 'Invalid target status' });
  }

  const allowed = ALLOWED_TRANSITIONS[vehicle.status];
  if (!allowed.includes(targetStatus)) {
    return res.status(409).json({
      error: `Invalid state transition! Cannot transition from state '${vehicle.status}' to '${targetStatus}'. Allowed target states: [${allowed.join(', ')}]`
    });
  }

  const previousStatus = vehicle.status;
  vehicle.status = targetStatus;

  if (targetStatus === 'IN_MAINTENANCE') {
    const logItem = {
      id: `m-${Date.now()}`,
      vehicleId: vehicle.id,
      serviceDate: new Date().toISOString().split('T')[0],
      issueDescription: reason || 'Scheduled Fleet Maintenance & Safety Check',
      cost: 5000.00,
      currency: 'INR',
      status: 'IN_PROGRESS'
    };
    maintenanceLogsDb.push(logItem);
    upsertMaintenanceLogInDb(logItem);
  }

  upsertVehicleInDb(vehicle);

  console.log(`[Vehicle State Machine] ${vehicle.id} (${vehicle.make} ${vehicle.model}): ${previousStatus} ➔ ${targetStatus}`);

  res.json({
    id: vehicle.id,
    previousStatus,
    currentStatus: vehicle.status,
    updatedAt: new Date().toISOString(),
    message: `State transition to ${targetStatus} successful`
  });
});

// 5. Internal Availability Check (called by Booking Service via Feign/HTTP)
app.get('/api/v1/vehicles/:id/availability', (req, res) => {
  const vehicle = vehiclesDb.find(v => v.id === req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const isOperational = vehicle.status === 'AVAILABLE' || vehicle.status === 'RESERVED';
  res.json({
    vehicleId: vehicle.id,
    status: vehicle.status,
    isAvailableForBooking: isOperational && vehicle.status !== 'IN_MAINTENANCE' && vehicle.status !== 'OUT_OF_SERVICE'
  });
});

// 6. Telemetry & Odometer Ingestion
app.post('/api/v1/vehicles/:id/telemetry', (req, res) => {
  const { currentOdometer, location } = req.body;
  const vehicle = vehiclesDb.find(v => v.id === req.params.id);

  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  if (currentOdometer && currentOdometer > vehicle.currentOdometer) {
    vehicle.currentOdometer = currentOdometer;
  }
  if (location) {
    vehicle.location = location;
  }
  upsertVehicleInDb(vehicle);

  res.json({ vehicleId: vehicle.id, currentOdometer: vehicle.currentOdometer, location: vehicle.location });
});

// Eureka Heartbeat simulation
const registerWithEureka = () => {
  fetch('http://localhost:8761/eureka/apps/VEHICLE-SERVICE', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ port: PORT, url: `http://localhost:${PORT}` })
  }).catch(() => {});
};

app.listen(PORT, async () => {
  await initDb(vehiclesDb, maintenanceLogsDb);
  console.log(`[Vehicle Service] Running on port ${PORT}`);
  registerWithEureka();
  setInterval(registerWithEureka, 15000);
});
