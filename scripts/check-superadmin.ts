
import pg from "pg";
import "dotenv/config";

const { Client } = pg;

async function check() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    
    const res = await client.query(`SELECT id, email, is_super_admin FROM users WHERE id = 'b72d80ae-31c4-4484-b517-564c7cd3cef1';`);
    console.log(res.rows);

  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await client.end();
  }
}

check();
