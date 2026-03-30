
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
    
    // Check company 18 users
    const res = await client.query(`
      SELECT cu.user_id, u.email, cu.role, c.name as company_name
      FROM company_users cu
      JOIN users u ON u.id = cu.user_id
      JOIN companies c ON c.id = cu.company_id
      WHERE cu.company_id = 18;
    `);
    console.log("Users in Company 18:");
    res.rows.forEach(row => console.log(`- ${row.user_id} (${row.email}): ${row.role}`));

    // Check all users
    const usersRes = await client.query(`SELECT id, email FROM users;`);
    console.log("\nAll Users:");
    usersRes.rows.forEach(row => console.log(`- ${row.id} (${row.email})`));

  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await client.end();
  }
}

check();
