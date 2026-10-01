const { Client } = require('pg');

async function setupPostgres() {
  // Step 1: Connect as postgres user (which works on local PG server) to ensure root user & DB exist
  console.log('Connecting to PostgreSQL as postgres...');
  let adminClient = null;
  try {
    adminClient = new Client({ user: 'postgres', password: 'root', host: 'localhost', port: 5432, database: 'postgres' });
    await adminClient.connect();
    
    const userRes = await adminClient.query("SELECT 1 FROM pg_roles WHERE rolname = 'root'");
    if (userRes.rowCount === 0) {
      await adminClient.query("CREATE ROLE root WITH LOGIN SUPERUSER PASSWORD 'root'");
      console.log('Successfully created PostgreSQL user "root" with password "root"!');
    } else {
      await adminClient.query("ALTER USER root WITH PASSWORD 'root' SUPERUSER LOGIN");
      console.log('Successfully verified/updated PostgreSQL user "root" with password "root"!');
    }

    const dbRes = await adminClient.query("SELECT 1 FROM pg_database WHERE datname = 'driveease_db'");
    if (dbRes.rowCount === 0) {
      await adminClient.query('CREATE DATABASE driveease_db OWNER root');
      console.log('Successfully created database "driveease_db" owned by "root"!');
    } else {
      console.log('Database "driveease_db" already exists.');
    }
  } catch (err) {
    console.log('Admin connect notice:', err.message);
  } finally {
    if (adminClient) await adminClient.end();
  }

  // Step 2: Now test connecting directly as root/root to driveease_db
  console.log('Testing direct connection as user: root, password: root...');
  const rootClient = new Client({
    user: 'root',
    password: 'root',
    host: 'localhost',
    port: 5432,
    database: 'driveease_db'
  });

  try {
    await rootClient.connect();
    console.log('SUCCESS: Successfully connected to database "driveease_db" as user "root" with password "root"!');
    await rootClient.end();
  } catch (err) {
    console.error('ERROR connecting with root/root:', err.message);
  }
}

setupPostgres();
