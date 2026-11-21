const { Client } = require('pg');
require('./scripts/load-test-env');
const connectionString = process.env.DATABASE_URL;

async function checkTables() {
  const client = new Client({ connectionString });
  await client.connect();
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);
  console.log("Tables in database:", res.rows.map(r => r.table_name));
  await client.end();
}

checkTables().catch(console.error);
