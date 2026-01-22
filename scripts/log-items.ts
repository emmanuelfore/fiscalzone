
import { storage } from '../server/storage';

async function logInvoices() {
    try {
        const invoices = await storage.getInvoices(1); // Assuming company ID 1 exists
        if (invoices.length > 0) {
            const invoice = await storage.getInvoice(invoices[0].id);
            console.log('Invoice Item 0:', invoice?.items[0]);
        } else {
            console.log('No invoices (company ID 1) found. Checking for any invoice...');
            // Try to find any company
            const { db } = await import('../server/db');
            const { invoices: invoicesTable } = await import('../shared/schema');
            const rows = await db.select().from(invoicesTable).limit(1);
            if (rows.length > 0) {
                const invoice = await storage.getInvoice(rows[0].id);
                console.log('Invoice Item 0:', invoice?.items[0]);
            } else {
                console.log('No invoices found at all');
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

logInvoices();
