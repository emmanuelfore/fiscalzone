import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

dotenv.config();

async function debugDb() {
    console.log('--- Database Debug ---');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'PRESENT' : 'MISSING');

    try {
        const result = await db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'companies' AND column_name = 'api_key_created_at';
        `);
        console.log('Query Result for api_key_created_at:', result.rows);

        if (result.rows.length === 0) {
            console.log('❌ COLUMN MISSING IN RUNNING DB CONNECTION');
        } else {
            console.log('✅ COLUMN EXISTS IN RUNNING DB CONNECTION');
        }
    } catch (error) {
        console.error('❌ Error querying DB:', error);
    }
}

debugDb();
