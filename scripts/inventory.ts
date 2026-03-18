
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

const logFile = 'db_inventory.txt';
const logStream = fs.createWriteStream(logFile, { flags: 'w', encoding: 'utf8' });

function log(message: string) {
    console.log(message);
    logStream.write(message + '\n');
}

async function inventory() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        log('📊 Database Inventory\n');

        const res = await pool.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            ORDER BY table_name, column_name;
        `);

        let currentTable = '';
        res.rows.forEach(row => {
            if (row.table_name !== currentTable) {
                currentTable = row.table_name;
                log(`\nTable: ${currentTable}`);
            }
            log(`  - ${row.column_name} (${row.data_type})`);
        });

    } catch (error: any) {
        log('❌ Error: ' + error.message);
    } finally {
        await pool.end();
        logStream.end();
    }
}

inventory();
