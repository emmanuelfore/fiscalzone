
import pg from "pg";
import "dotenv/config";

const { Client } = pg;

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    
    // Rename table_number to table_name if table_number exists
    const checkCol = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'restaurant_tables' AND column_name = 'table_number';
    `);

    if (checkCol.rows.length > 0) {
      console.log("Renaming column table_number to table_name...");
      await client.query(`ALTER TABLE restaurant_tables RENAME COLUMN table_number TO table_name;`);
    } else {
      console.log("Column table_number not found or already renamed.");
    }

    // Update status default
    console.log("Updating status default to 'available'...");
    await client.query(`ALTER TABLE restaurant_tables ALTER COLUMN status SET DEFAULT 'available';`);
    await client.query(`UPDATE restaurant_tables SET status = 'available' WHERE status = 'free';`);

    console.log("Migration complete.");

  } catch (err: any) {
    console.error("Migration failed:", err.message);
  } finally {
    await client.end();
  }
}

migrate();
