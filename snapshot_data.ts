
import pg from 'pg';
const { Pool } = pg;

// Connection string from .env
const connectionString = "postgresql://postgres.tzczbbsdvrlonwjwcwss:9TPewLiNYgoeu406@aws-1-eu-west-2.pooler.supabase.com:5432/postgres";

async function snapshotData() {
    const pool = new Pool({ connectionString });
    try {
        const companyId = 8; // LIPVIEW INVESTMENTS

        // Tax Types
        const taxTypesRes = await pool.query(`
            SELECT code, name, description, rate, "zimra_code", "zimra_tax_id", "calculation_method"
            FROM tax_types
            WHERE company_id = $1
        `, [companyId]);

        // Products
        const productsRes = await pool.query(`
            SELECT name, description, sku, price, "tax_rate", "product_type", "hs_code", "tax_type_id"
            FROM products
            WHERE company_id = $1
        `, [companyId]);

        // Customers
        const customersRes = await pool.query(`
            SELECT name, email, phone, tin, "vat_number", "customer_type", "currency", "address"
            FROM customers
            WHERE company_id = $1
        `, [companyId]);


        const output = JSON.stringify({
            taxTypes: taxTypesRes.rows,
            products: productsRes.rows,
            customers: customersRes.rows
        }, null, 2);

        // console.log(output);
        const fs = await import('fs');
        fs.writeFileSync('snapshot_final.json', output);
        console.log("Written to snapshot_final.json");

    } catch (err) {
        console.error("Snapshot Error:", err);
    } finally {
        await pool.end();
    }
}

snapshotData();
