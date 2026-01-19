
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
    console.error("SUPABASE_DB_URL is required.");
    process.exit(1);
}

const pool = new pg.Pool({ connectionString });

async function seedZimraTax() {
    console.log("🇿🇼  Seeding ZIMRA Tax Configuration...");
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Create Tables
        console.log("Creating tables...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS tax_types (
                id SERIAL PRIMARY KEY,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                rate DECIMAL(5, 2) NOT NULL,
                is_active BOOLEAN DEFAULT true,
                effective_from DATE NOT NULL,
                effective_to DATE,
                zimra_code TEXT,
                calculation_method TEXT DEFAULT 'INCLUSIVE'
            );

            CREATE TABLE IF NOT EXISTS tax_categories (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                default_tax_type_id INTEGER REFERENCES tax_types(id),
                zimra_category_code TEXT,
                description TEXT,
                is_active BOOLEAN DEFAULT true
            );

            CREATE TABLE IF NOT EXISTS tax_rate_history (
                id SERIAL PRIMARY KEY,
                tax_type_id INTEGER REFERENCES tax_types(id),
                rate DECIMAL(5, 2) NOT NULL,
                effective_from DATE NOT NULL,
                effective_to DATE,
                reason TEXT,
                gazette_reference TEXT
            );

            CREATE TABLE IF NOT EXISTS customer_tax_exemptions (
                id SERIAL PRIMARY KEY,
                customer_id INTEGER REFERENCES customers(id),
                exemption_type TEXT,
                certificate_number TEXT,
                issued_by TEXT,
                valid_from DATE NOT NULL,
                valid_to DATE NOT NULL,
                status TEXT DEFAULT 'VERIFIED'
            );

            ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_category_id INTEGER REFERENCES tax_categories(id);
        `);

        // 2. Insert Tax Types (Master Table)
        console.log("Inserting Tax Types...");
        const taxTypesData = [
            { code: "VAT-STD", name: "Standard Rate", rate: 15.00, zimra_code: "A", desc: "Standard VAT rate for taxable supplies" },
            { code: "VAT-ZERO", name: "Zero-Rated", rate: 0.00, zimra_code: "B", desc: "Zero-rated supplies (exports, basic foods)" },
            { code: "VAT-EX", name: "Exempt", rate: 0.00, zimra_code: "E", desc: "Exempt supplies (financial, education)" },
            { code: "VAT-SPECIAL", name: "Special Rate", rate: 0.00, zimra_code: "Z", desc: "Special circumstances" }
        ];

        for (const tax of taxTypesData) {
            await client.query(`
                INSERT INTO tax_types (code, name, rate, zimra_code, description, effective_from)
                VALUES ($1, $2, $3, $4, $5, NOW())
                ON CONFLICT (code) DO UPDATE 
                SET rate = $3, zimra_code = $4, description = $5;
            `, [tax.code, tax.name, tax.rate, tax.zimra_code, tax.desc]);
        }

        // 3. Insert Tax Categories
        console.log("Inserting Tax Categories...");
        // Fetch IDs to link
        const resStd = await client.query("SELECT id FROM tax_types WHERE code = 'VAT-STD'");
        const resZero = await client.query("SELECT id FROM tax_types WHERE code = 'VAT-ZERO'");
        const resExempt = await client.query("SELECT id FROM tax_types WHERE code = 'VAT-EX'");

        const stdId = resStd.rows[0]?.id;
        const zeroId = resZero.rows[0]?.id;
        const exemptId = resExempt.rows[0]?.id;

        const categories = [
            { name: "Standard Taxable Goods/Services", typeId: stdId, code: "GOODS_STD", desc: "General goods and services" },
            { name: "Basic Food Items", typeId: zeroId, code: "FOOD_BASIC", desc: "Rice, flour, sugar, cooking oil, etc." },
            { name: "Medical Services", typeId: exemptId, code: "MED_SERV", desc: "Medical and health services" },
            { name: "Educational Services", typeId: exemptId, code: "EDU_SERV", desc: "Educational and training services" },
            { name: "Financial Services", typeId: exemptId, code: "FIN_SERV", desc: "Banking, insurance, loans" },
            { name: "Export Goods/Services", typeId: zeroId, code: "EXPORT", desc: "Goods/services for export" }
        ];

        for (const cat of categories) {
            // Check if exists by name (simple check)
            const exists = await client.query("SELECT id FROM tax_categories WHERE name = $1", [cat.name]);
            if (exists.rows.length === 0) {
                await client.query(`
                    INSERT INTO tax_categories (name, default_tax_type_id, zimra_category_code, description)
                    VALUES ($1, $2, $3, $4)
                `, [cat.name, cat.typeId, cat.code, cat.desc]);
            }
        }

        await client.query("COMMIT");
        console.log("✅ ZIMRA Tax Configuration seeded successfully.");
    } catch (err: any) {
        await client.query("ROLLBACK");
        console.error("❌ Failed to seed:", err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

seedZimraTax();
