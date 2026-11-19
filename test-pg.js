const { Client } = require('pg');
const connectionString = 'postgresql://neondb_owner:npg_DJHOCphyx1j3@ep-billowing-unit-abuc6h0o.eu-west-2.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const client = new Client({
    connectionString: connectionString,
  });
  try {
    await client.connect();
    console.log('Connected successfully with pg!');
    const res = await client.query('SELECT NOW()');
    console.log(res.rows[0]);
  } catch (err) {
    console.error('Connection error:', err);
  } finally {
    await client.end();
  }
}
main();
