const { Client } = require('pg');
require('./scripts/load-test-env');
const connectionString = process.env.DATABASE_URL;

async function checkColumns() {
  const client = new Client({ connectionString });
  await client.connect();
  const res = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'Customer'
  `);
  console.log("Columns in Customer table:", res.rows.map(r => r.column_name));
  await client.end();
}

checkColumns().catch(console.error);
