
import "dotenv/config";
import pg from 'pg';

async function checkSchema() {
    const client = new pg.Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected to database. Checking columns...");

        const tables = ['invoices', 'companies', 'tax_types'];

        for (const table of tables) {
            console.log(`\n--- Table: ${table} ---`);
            const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [table]);

            const columns = res.rows.map(r => r.column_name);
            console.log("Found columns:", columns.join(", "));
        }

    } catch (err) {
        console.error("Error checking schema:", err);
    } finally {
        await client.end();
    }
}

checkSchema();
