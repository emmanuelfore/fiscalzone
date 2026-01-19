
import dotenv from 'dotenv';
import net from 'net';
import { URL } from 'url';

dotenv.config();

const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
    console.error("SUPABASE_DB_URL not set");
    process.exit(1);
}

try {
    const parsed = new URL(dbUrl);
    console.log(`Checking TCP connection to ${parsed.hostname}:${parsed.port}...`);

    const socket = new net.Socket();
    socket.setTimeout(5000);

    socket.on('connect', () => {
        console.log('✅ TCP Connection established!');
        socket.destroy();
    });

    socket.on('timeout', () => {
        console.error('❌ TCP Connection timed out');
        socket.destroy();
    });

    socket.on('error', (err) => {
        console.error('❌ TCP Connection Error:', err.message);
    });

    socket.connect(Number(parsed.port), parsed.hostname);

} catch (err) {
    console.error("Invalid URL:", err);
}
