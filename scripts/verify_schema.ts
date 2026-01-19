
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
    console.error("SUPABASE_DB_URL is required.");
    process.exit(1);
}

const pool = new pg.Pool({ connectionString });

// Define the expected columns based on schema.ts (snake_case)
const expectedSchema: Record<string, string[]> = {
    users: ["id", "email", "password", "name", "created_at"],
    companies: [
        "id", "name", "trading_name", "address", "city", "country", "currency",
        "phone", "email", "website", "logo_url", "tin", "vat_number", "bp_number",
        "vat_enabled", "default_payment_terms", "bank_details", "fdms_device_id",
        "fdms_api_key", "fiscal_day_open", "created_at"
    ],
    company_users: ["id", "user_id", "company_id", "role"],
    customers: [
        "id", "company_id", "name", "email", "phone", "mobile", "address",
        "billing_address", "city", "country", "tin", "vat_number", "bp_number",
        "customer_type", "notes", "created_at"
    ],
    products: [
        "id", "company_id", "name", "description", "sku", "barcode", "hs_code",
        "category", "price", "cost_price", "tax_rate", "is_tracked", "stock_level",
        "low_stock_threshold", "is_active", "created_at"
    ],
    invoices: [
        "id", "company_id", "customer_id", "invoice_number", "issue_date", "due_date",
        "subtotal", "tax_amount", "total", "status", "tax_inclusive", "fiscal_code",
        "fiscal_signature", "qr_code_data", "synced_with_fdms", "fdms_status",
        "submission_id", "currency", "notes", "created_at"
    ],
    invoice_items: [
        "id", "invoice_id", "product_id", "description", "quantity", "unit_price",
        "tax_rate", "line_total"
    ]
};

async function verifySchema() {
    console.log("🔍 Verifying database schema against expected definitions...");
    const client = await pool.connect();
    let hasMissing = false;

    try {
        for (const [table, expectedCols] of Object.entries(expectedSchema)) {
            const res = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = $1;
            `, [table]);

            const existingCols = new Set(res.rows.map(r => r.column_name));
            const missingCols = expectedCols.filter(col => !existingCols.has(col));

            if (missingCols.length > 0) {
                console.error(`❌ Table '${table}' is missing columns: ${missingCols.join(", ")}`);
                hasMissing = true;
            } else {
                console.log(`✅ Table '${table}' is active and synced (${existingCols.size} columns).`);
            }
        }

        if (!hasMissing) {
            console.log("\n✨ All tables are fully synced with the schema!");
        } else {
            console.log("\n⚠️ Some columns are still missing. Please fix them.");
        }

    } catch (err: any) {
        console.error("❌ Verification failed:", err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

verifySchema();
