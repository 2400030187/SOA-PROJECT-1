const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'driveease_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

function mapRowToVehicle(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.owner_id,
    make: row.make,
    model: row.model,
    year: parseInt(row.year),
    licensePlate: row.license_plate,
    category: row.category,
    fuelType: row.fuel_type,
    dailyRate: parseFloat(row.daily_rate),
    previousDailyRate: row.previous_daily_rate ? parseFloat(row.previous_daily_rate) : null,
    lastChangeSummary: row.last_change_summary || null,
    lastChangedAt: row.last_changed_at || null,
    currency: row.currency || 'INR',
    status: row.status,
    currentOdometer: parseInt(row.current_odometer || 0),
    location: row.location,
    imageUrl: row.image_url,
    features: row.features || []
  };
}

function mapRowToMaintenanceLog(row) {
  if (!row) return null;
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    serviceDate: row.service_date,
    issueDescription: row.issue_description,
    cost: parseFloat(row.cost),
    currency: row.currency || 'INR',
    status: row.status
  };
}

async function initDb(vehiclesDb, maintenanceLogsDb) {
  try {
    const client = await pool.connect();
    console.log('[Vehicle Service DB] Connected to PostgreSQL with username "root"');

    await client.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id VARCHAR(100) PRIMARY KEY,
        owner_id VARCHAR(100) NOT NULL,
        make VARCHAR(100) NOT NULL,
        model VARCHAR(100) NOT NULL,
        year INT NOT NULL,
        license_plate VARCHAR(50) UNIQUE NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'SEDAN',
        fuel_type VARCHAR(50) NOT NULL DEFAULT 'GASOLINE',
        daily_rate DECIMAL(10, 2) NOT NULL,
        previous_daily_rate DECIMAL(10, 2),
        last_change_summary TEXT,
        last_changed_at VARCHAR(100),
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
        current_odometer INT NOT NULL DEFAULT 0,
        location VARCHAR(255) NOT NULL,
        image_url TEXT,
        features JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS previous_daily_rate DECIMAL(10, 2);
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_change_summary TEXT;
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_changed_at VARCHAR(100);

      CREATE TABLE IF NOT EXISTS maintenance_logs (
        id VARCHAR(100) PRIMARY KEY,
        vehicle_id VARCHAR(100) NOT NULL,
        service_date VARCHAR(50) NOT NULL,
        issue_description TEXT NOT NULL,
        cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed vehicles into PostgreSQL
    for (const v of vehiclesDb) {
      await client.query(`
        INSERT INTO vehicles (
          id, owner_id, make, model, year, license_plate, category, fuel_type,
          daily_rate, previous_daily_rate, last_change_summary, last_changed_at, currency, status, current_odometer, location, image_url, features
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (id) DO UPDATE SET
          owner_id = EXCLUDED.owner_id,
          make = EXCLUDED.make,
          model = EXCLUDED.model,
          year = EXCLUDED.year,
          license_plate = EXCLUDED.license_plate,
          category = EXCLUDED.category,
          fuel_type = EXCLUDED.fuel_type,
          daily_rate = EXCLUDED.daily_rate,
          previous_daily_rate = EXCLUDED.previous_daily_rate,
          last_change_summary = EXCLUDED.last_change_summary,
          last_changed_at = EXCLUDED.last_changed_at,
          currency = EXCLUDED.currency,
          status = EXCLUDED.status,
          current_odometer = EXCLUDED.current_odometer,
          location = EXCLUDED.location,
          image_url = EXCLUDED.image_url,
          features = EXCLUDED.features;
      `, [
        v.id, v.ownerId, v.make, v.model, v.year, v.licensePlate, v.category, v.fuelType,
        v.dailyRate, v.previousDailyRate || null, v.lastChangeSummary || null, v.lastChangedAt || null, v.currency || 'INR', v.status, v.currentOdometer, v.location, v.imageUrl,
        JSON.stringify(v.features || [])
      ]);
    }

    // Seed maintenance logs
    for (const m of maintenanceLogsDb) {
      await client.query(`
        INSERT INTO maintenance_logs (
          id, vehicle_id, service_date, issue_description, cost, currency, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          vehicle_id = EXCLUDED.vehicle_id,
          service_date = EXCLUDED.service_date,
          issue_description = EXCLUDED.issue_description,
          cost = EXCLUDED.cost,
          currency = EXCLUDED.currency,
          status = EXCLUDED.status;
      `, [m.id, m.vehicleId, m.serviceDate, m.issueDescription, m.cost, m.currency || 'INR', m.status]);
    }

    // Reload vehicles & maintenance logs from PostgreSQL
    const resVeh = await client.query('SELECT * FROM vehicles ORDER BY id ASC');
    vehiclesDb.length = 0;
    resVeh.rows.forEach(r => vehiclesDb.push(mapRowToVehicle(r)));

    const resMaint = await client.query('SELECT * FROM maintenance_logs ORDER BY created_at DESC');
    maintenanceLogsDb.length = 0;
    resMaint.rows.forEach(r => maintenanceLogsDb.push(mapRowToMaintenanceLog(r)));

    console.log(`[Vehicle Service DB] Loaded ${vehiclesDb.length} vehicles & ${maintenanceLogsDb.length} maintenance logs from PostgreSQL.`);
    client.release();
  } catch (err) {
    console.error('[Vehicle Service DB] Error initializing PostgreSQL DB:', err.message);
  }
}

async function upsertVehicleInDb(v) {
  try {
    await pool.query(`
      INSERT INTO vehicles (
        id, owner_id, make, model, year, license_plate, category, fuel_type,
        daily_rate, previous_daily_rate, last_change_summary, last_changed_at, currency, status, current_odometer, location, image_url, features
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (id) DO UPDATE SET
        owner_id = EXCLUDED.owner_id,
        make = EXCLUDED.make,
        model = EXCLUDED.model,
        year = EXCLUDED.year,
        license_plate = EXCLUDED.license_plate,
        category = EXCLUDED.category,
        fuel_type = EXCLUDED.fuel_type,
        daily_rate = EXCLUDED.daily_rate,
        previous_daily_rate = EXCLUDED.previous_daily_rate,
        last_change_summary = EXCLUDED.last_change_summary,
        last_changed_at = EXCLUDED.last_changed_at,
        currency = EXCLUDED.currency,
        status = EXCLUDED.status,
        current_odometer = EXCLUDED.current_odometer,
        location = EXCLUDED.location,
        image_url = EXCLUDED.image_url,
        features = EXCLUDED.features;
    `, [
      v.id, v.ownerId, v.make, v.model, v.year, v.licensePlate, v.category, v.fuelType,
      v.dailyRate, v.previousDailyRate || null, v.lastChangeSummary || null, v.lastChangedAt || null, v.currency || 'INR', v.status, v.currentOdometer, v.location, v.imageUrl,
      JSON.stringify(v.features || [])
    ]);
  } catch (err) {
    console.error('[Vehicle Service DB] Error upserting vehicle in PostgreSQL:', err.message);
  }
}

async function deleteVehicleFromDb(id) {
  try {
    await pool.query('DELETE FROM vehicles WHERE id = $1', [id]);
  } catch (err) {
    console.error('[Vehicle Service DB] Error deleting vehicle in PostgreSQL:', err.message);
  }
}

async function upsertMaintenanceLogInDb(m) {
  try {
    await pool.query(`
      INSERT INTO maintenance_logs (
        id, vehicle_id, service_date, issue_description, cost, currency, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        vehicle_id = EXCLUDED.vehicle_id,
        service_date = EXCLUDED.service_date,
        issue_description = EXCLUDED.issue_description,
        cost = EXCLUDED.cost,
        currency = EXCLUDED.currency,
        status = EXCLUDED.status;
    `, [m.id, m.vehicleId, m.serviceDate, m.issueDescription, m.cost, m.currency || 'INR', m.status]);
  } catch (err) {
    console.error('[Vehicle Service DB] Error upserting maintenance log in PostgreSQL:', err.message);
  }
}

module.exports = { pool, initDb, upsertVehicleInDb, deleteVehicleFromDb, upsertMaintenanceLogInDb, mapRowToVehicle, mapRowToMaintenanceLog };
