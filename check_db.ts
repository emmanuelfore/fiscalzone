import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);
  console.log('Tables:', res.rows.map(r => r.table_name).join(', '));

  const colRes = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'invoices' AND table_schema = 'public'
  `);
  console.log('Columns in invoices:', colRes.rows.map(r => r.column_name).join(', '));
  
  await client.end();
}
check();
