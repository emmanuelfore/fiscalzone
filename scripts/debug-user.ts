
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function checkUser() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const email = 'admin@zimra.co.zw';
        const res = await pool.query('SELECT id, email, is_super_admin FROM public.users WHERE email = $1', [email]);
        console.log('User status:', JSON.stringify(res.rows, null, 2));

        const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users'");
        console.log('Users table columns:', cols.rows.map(r => r.column_name));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkUser();
