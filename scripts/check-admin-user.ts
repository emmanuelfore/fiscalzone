
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
    
    // Check companies for b72d80ae-31c4-4484-b517-564c7cd3cef1
    const res = await client.query(`
      SELECT cu.company_id, c.name, cu.role
      FROM company_users cu
      JOIN companies c ON c.id = cu.company_id
      WHERE cu.user_id = 'b72d80ae-31c4-4484-b517-564c7cd3cef1';
    `);
    console.log("Companies for admin@fiscalstake.co.zw:");
    res.rows.forEach(row => console.log(`- ${row.company_id}: ${row.name} (${row.role})`));

  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await client.end();
  }
}

check();
