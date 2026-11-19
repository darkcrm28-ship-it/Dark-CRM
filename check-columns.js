const { Client } = require('pg');
const connectionString = "postgresql://neondb_owner:npg_DJHOCphyx1j3@ep-billowing-unit-abuc6h0o-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

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
