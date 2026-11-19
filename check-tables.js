const { Client } = require('pg');
const connectionString = "postgresql://neondb_owner:npg_DJHOCphyx1j3@ep-billowing-unit-abuc6h0o.eu-west-2.aws.neon.tech/neondb?sslmode=require";

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
