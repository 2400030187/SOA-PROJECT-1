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

function mapRowToBooking(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    userPhone: row.user_phone,
    vehicleId: row.vehicle_id,
    vehicleInfo: row.vehicle_info,
    startDate: row.start_date ? new Date(row.start_date).toISOString() : null,
    endDate: row.end_date ? new Date(row.end_date).toISOString() : null,
    pickupLocation: row.pickup_location,
    returnLocation: row.return_location,
    durationDays: parseFloat(row.duration_days),
    dailyRate: parseFloat(row.daily_rate),
    subtotal: parseFloat(row.subtotal),
    gstRate: parseFloat(row.gst_rate || 0.18),
    taxAmount: parseFloat(row.tax_amount),
    totalAmount: parseFloat(row.total_amount),
    currency: row.currency || 'INR',
    status: row.status,
    startOdometer: row.start_odometer ? parseInt(row.start_odometer) : null,
    endOdometer: row.end_odometer ? parseInt(row.end_odometer) : null,
    actualReturnTime: row.actual_return_time ? new Date(row.actual_return_time).toISOString() : null,
    fees: row.fees || { lateFee: 0, damageFee: 0 },
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
}

function mapRowToNotification(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.owner_id,
    type: row.type,
    vehicleId: row.vehicle_id,
    bookingId: row.booking_id,
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
}

async function initDb(bookingsDb, notificationsDb) {
  try {
    const client = await pool.connect();
    console.log('[Booking Service DB] Connected to PostgreSQL with username "root"');

    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        user_name VARCHAR(200) NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        user_phone VARCHAR(50),
        vehicle_id VARCHAR(100) NOT NULL,
        vehicle_info VARCHAR(255) NOT NULL,
        start_date TIMESTAMP WITH TIME ZONE NOT NULL,
        end_date TIMESTAMP WITH TIME ZONE NOT NULL,
        pickup_location VARCHAR(255) NOT NULL,
        return_location VARCHAR(255) NOT NULL,
        duration_days DECIMAL(5, 2) NOT NULL,
        daily_rate DECIMAL(10, 2) NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL,
        gst_rate DECIMAL(4, 2) NOT NULL DEFAULT 0.18,
        tax_amount DECIMAL(10, 2) NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED',
        start_odometer INT,
        end_odometer INT,
        actual_return_time TIMESTAMP WITH TIME ZONE,
        fees JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(100) PRIMARY KEY,
        owner_id VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        vehicle_id VARCHAR(100),
        booking_id VARCHAR(100),
        message TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed bookings into PostgreSQL
    for (const b of bookingsDb) {
      await client.query(`
        INSERT INTO bookings (
          id, user_id, user_name, user_email, user_phone, vehicle_id, vehicle_info,
          start_date, end_date, pickup_location, return_location, duration_days,
          daily_rate, subtotal, gst_rate, tax_amount, total_amount, currency, status,
          start_odometer, end_odometer, actual_return_time, fees, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          user_name = EXCLUDED.user_name,
          user_email = EXCLUDED.user_email,
          user_phone = EXCLUDED.user_phone,
          vehicle_id = EXCLUDED.vehicle_id,
          vehicle_info = EXCLUDED.vehicle_info,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          pickup_location = EXCLUDED.pickup_location,
          return_location = EXCLUDED.return_location,
          duration_days = EXCLUDED.duration_days,
          daily_rate = EXCLUDED.daily_rate,
          subtotal = EXCLUDED.subtotal,
          gst_rate = EXCLUDED.gst_rate,
          tax_amount = EXCLUDED.tax_amount,
          total_amount = EXCLUDED.total_amount,
          currency = EXCLUDED.currency,
          status = EXCLUDED.status,
          start_odometer = EXCLUDED.start_odometer,
          end_odometer = EXCLUDED.end_odometer,
          actual_return_time = EXCLUDED.actual_return_time,
          fees = EXCLUDED.fees;
      `, [
        b.id, b.userId, b.userName, b.userEmail, b.userPhone || null, b.vehicleId, b.vehicleInfo,
        b.startDate, b.endDate, b.pickupLocation, b.returnLocation, b.durationDays,
        b.dailyRate, b.subtotal, b.gstRate || 0.18, b.taxAmount, b.totalAmount, b.currency || 'INR', b.status,
        b.startOdometer || null, b.endOdometer || null, b.actualReturnTime || null, JSON.stringify(b.fees || { lateFee: 0, damageFee: 0 }),
        b.createdAt || new Date().toISOString()
      ]);
    }

    // Seed notifications into PostgreSQL
    for (const n of notificationsDb) {
      await client.query(`
        INSERT INTO notifications (
          id, owner_id, type, vehicle_id, booking_id, message, is_read, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          owner_id = EXCLUDED.owner_id,
          type = EXCLUDED.type,
          vehicle_id = EXCLUDED.vehicle_id,
          booking_id = EXCLUDED.booking_id,
          message = EXCLUDED.message,
          is_read = EXCLUDED.is_read;
      `, [
        n.id, n.ownerId, n.type, n.vehicleId || null, n.bookingId || null, n.message, n.isRead || false, n.createdAt || new Date().toISOString()
      ]);
    }

    // Reload bookings & notifications from PostgreSQL
    const resBookings = await client.query('SELECT * FROM bookings ORDER BY created_at DESC');
    bookingsDb.length = 0;
    resBookings.rows.forEach(r => bookingsDb.push(mapRowToBooking(r)));

    const resNotifs = await client.query('SELECT * FROM notifications ORDER BY created_at DESC');
    notificationsDb.length = 0;
    resNotifs.rows.forEach(r => notificationsDb.push(mapRowToNotification(r)));

    console.log(`[Booking Service DB] Loaded ${bookingsDb.length} bookings & ${notificationsDb.length} notifications from PostgreSQL.`);
    client.release();
  } catch (err) {
    console.error('[Booking Service DB] Error initializing PostgreSQL DB:', err.message);
  }
}

async function upsertBookingInDb(b) {
  try {
    await pool.query(`
      INSERT INTO bookings (
        id, user_id, user_name, user_email, user_phone, vehicle_id, vehicle_info,
        start_date, end_date, pickup_location, return_location, duration_days,
        daily_rate, subtotal, gst_rate, tax_amount, total_amount, currency, status,
        start_odometer, end_odometer, actual_return_time, fees, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        user_name = EXCLUDED.user_name,
        user_email = EXCLUDED.user_email,
        user_phone = EXCLUDED.user_phone,
        vehicle_id = EXCLUDED.vehicle_id,
        vehicle_info = EXCLUDED.vehicle_info,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        pickup_location = EXCLUDED.pickup_location,
        return_location = EXCLUDED.return_location,
        duration_days = EXCLUDED.duration_days,
        daily_rate = EXCLUDED.daily_rate,
        subtotal = EXCLUDED.subtotal,
        gst_rate = EXCLUDED.gst_rate,
        tax_amount = EXCLUDED.tax_amount,
        total_amount = EXCLUDED.total_amount,
        currency = EXCLUDED.currency,
        status = EXCLUDED.status,
        start_odometer = EXCLUDED.start_odometer,
        end_odometer = EXCLUDED.end_odometer,
        actual_return_time = EXCLUDED.actual_return_time,
        fees = EXCLUDED.fees;
    `, [
      b.id, b.userId, b.userName, b.userEmail, b.userPhone || null, b.vehicleId, b.vehicleInfo,
      b.startDate, b.endDate, b.pickupLocation, b.returnLocation, b.durationDays,
      b.dailyRate, b.subtotal, b.gstRate || 0.18, b.taxAmount, b.totalAmount, b.currency || 'INR', b.status,
      b.startOdometer || null, b.endOdometer || null, b.actualReturnTime || null, JSON.stringify(b.fees || { lateFee: 0, damageFee: 0 }),
      b.createdAt || new Date().toISOString()
    ]);
  } catch (err) {
    console.error('[Booking Service DB] Error upserting booking in PostgreSQL:', err.message);
  }
}

async function upsertNotificationInDb(n) {
  try {
    await pool.query(`
      INSERT INTO notifications (
        id, owner_id, type, vehicle_id, booking_id, message, is_read, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        owner_id = EXCLUDED.owner_id,
        type = EXCLUDED.type,
        vehicle_id = EXCLUDED.vehicle_id,
        booking_id = EXCLUDED.booking_id,
        message = EXCLUDED.message,
        is_read = EXCLUDED.is_read;
    `, [
      n.id, n.ownerId, n.type, n.vehicleId || null, n.bookingId || null, n.message, n.isRead || false, n.createdAt || new Date().toISOString()
    ]);
  } catch (err) {
    console.error('[Booking Service DB] Error upserting notification in PostgreSQL:', err.message);
  }
}

async function updateNotificationReadInDb(id, isRead) {
  try {
    await pool.query('UPDATE notifications SET is_read = $1 WHERE id = $2', [isRead, id]);
  } catch (err) {
    console.error('[Booking Service DB] Error updating notification in PostgreSQL:', err.message);
  }
}

module.exports = { pool, initDb, upsertBookingInDb, upsertNotificationInDb, updateNotificationReadInDb, mapRowToBooking, mapRowToNotification };
