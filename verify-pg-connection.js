const { Client } = require('pg');

async function checkPostgres() {
  const client = new Client({
    user: 'root',
    password: 'root',
    host: 'localhost',
    port: 5432,
    database: 'driveease_db'
  });

  try {
    await client.connect();
    console.log('✅ CONNECTED TO POSTGRESQL SUCCESSFULLY!');
    console.log('Credentials used: username=root, password=root, host=localhost, port=5432, database=driveease_db\n');

    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    console.log('Tables in database "driveease_db":');
    for (const row of res.rows) {
      const countRes = await client.query(`SELECT count(*) FROM ${row.table_name}`);
      console.log(`  - ${row.table_name}: ${countRes.rows[0].count} records`);
    }
  } catch (err) {
    console.error('❌ Connection Failed:', err.message);
  } finally {
    await client.end();
  }
}

checkPostgres();
