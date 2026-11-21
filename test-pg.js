const { Client } = require('pg');
require('./scripts/load-test-env');
const connectionString = process.env.DATABASE_URL;

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
