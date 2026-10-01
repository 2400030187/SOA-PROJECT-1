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

// Helper to sanitize date strings or JSON
function mapRowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    password: row.password_hash || row.password,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    phoneNumber: row.phone_number,
    phone: row.phone_number,
    businessName: row.business_name || row.company_name || '',
    companyName: row.company_name || row.business_name || '',
    gstin: row.gstin || '',
    address: row.address || '',
    driverLicenseNumber: row.driver_license_number || (row.driver_license ? row.driver_license.licenseNumber : ''),
    driverLicense: row.driver_license || (row.driver_license_number ? {
      licenseNumber: row.driver_license_number,
      verificationStatus: 'VERIFIED'
    } : null),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
}

async function initDb(usersDb) {
  try {
    const client = await pool.connect();
    console.log('[User Service DB] Connected to PostgreSQL with username "root"');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(100) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER',
        phone_number VARCHAR(50),
        business_name VARCHAR(255),
        company_name VARCHAR(255),
        gstin VARCHAR(50),
        address TEXT,
        driver_license_number VARCHAR(50),
        driver_license JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed initial users if table is empty or missing seeds
    for (const u of usersDb) {
      await client.query(`
        INSERT INTO users (
          id, email, password_hash, first_name, last_name, role, phone_number,
          business_name, company_name, gstin, address, driver_license_number, driver_license, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          role = EXCLUDED.role,
          phone_number = EXCLUDED.phone_number,
          business_name = EXCLUDED.business_name,
          company_name = EXCLUDED.company_name,
          gstin = EXCLUDED.gstin,
          address = EXCLUDED.address,
          driver_license_number = EXCLUDED.driver_license_number,
          driver_license = EXCLUDED.driver_license;
      `, [
        u.id,
        u.email,
        u.password,
        u.firstName,
        u.lastName,
        u.role,
        u.phoneNumber || u.phone || null,
        u.businessName || u.companyName || null,
        u.companyName || u.businessName || null,
        u.gstin || null,
        u.address || null,
        u.driverLicenseNumber || (u.driverLicense ? u.driverLicense.licenseNumber : null),
        u.driverLicense ? JSON.stringify(u.driverLicense) : null,
        u.createdAt || new Date().toISOString()
      ]);
    }

    // Reload all users from database into memory
    const res = await client.query('SELECT * FROM users ORDER BY created_at ASC');
    usersDb.length = 0;
    res.rows.forEach(r => usersDb.push(mapRowToUser(r)));
    console.log(`[User Service DB] Loaded ${usersDb.length} users from PostgreSQL.`);

    client.release();
  } catch (err) {
    console.error('[User Service DB] Error initializing PostgreSQL DB:', err.message);
  }
}

async function upsertUserInDb(u) {
  try {
    await pool.query(`
      INSERT INTO users (
        id, email, password_hash, first_name, last_name, role, phone_number,
        business_name, company_name, gstin, address, driver_license_number, driver_license, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        role = EXCLUDED.role,
        phone_number = EXCLUDED.phone_number,
        business_name = EXCLUDED.business_name,
        company_name = EXCLUDED.company_name,
        gstin = EXCLUDED.gstin,
        address = EXCLUDED.address,
        driver_license_number = EXCLUDED.driver_license_number,
        driver_license = EXCLUDED.driver_license;
    `, [
      u.id,
      u.email,
      u.password,
      u.firstName,
      u.lastName,
      u.role,
      u.phoneNumber || u.phone || null,
      u.businessName || u.companyName || null,
      u.companyName || u.businessName || null,
      u.gstin || null,
      u.address || null,
      u.driverLicenseNumber || (u.driverLicense ? u.driverLicense.licenseNumber : null),
      u.driverLicense ? JSON.stringify(u.driverLicense) : null,
      u.createdAt || new Date().toISOString()
    ]);
  } catch (err) {
    console.error('[User Service DB] Error upserting user in PostgreSQL:', err.message);
  }
}

module.exports = { pool, initDb, upsertUserInDb, mapRowToUser };
