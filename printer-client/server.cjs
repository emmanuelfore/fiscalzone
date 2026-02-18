/**
 * POS Silent Print Server
 * 
 * This is a standalone middleware to enable silent printing from the browser.
 * It receives HTML content, converts it to a temporary PDF, and sends it to the default printer.
 * 
 * Requirements:
 * - Node.js installed
 * - Dependencies: npm install express cors body-parser pdf-to-printer puppeteer-core
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const ptp = require('pdf-to-printer');
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const port = 12312; // Default port for our print server

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Helper to find Chrome/Edge on Windows
function getEdgePath() {
    const paths = [
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
    ];
    for (const p of paths) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}

app.post('/print', async (req, res) => {
    const { html, printerName } = req.body;

    if (!html) {
        return res.status(400).json({ error: 'No HTML content provided' });
    }

    const tempPdfPath = path.join(os.tmpdir(), `receipt_${Date.now()}.pdf`);
    let browser = null;

    try {
        console.log('--- Received print request ---');

        // 1. Render HTML to PDF using Edge (since it's usually on Windows)
        // Adjust executablePath if they have Chrome or want to use puppeteer's built-in one
        const executablePath = getEdgePath();

        if (!executablePath) {
            throw new Error('Microsoft Edge not found. Please install Edge or update executablePath in the script.');
        }

        browser = await puppeteer.launch({
            executablePath: executablePath,
            headless: true
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        // POS Receipts are usually 80mm wide. Height is auto.
        await page.pdf({
            path: tempPdfPath,
            width: '80mm',
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 }
        });

        console.log(`Generated PDF at: ${tempPdfPath}`);

        // 2. Send to printer
        const options = {};
        if (printerName) {
            options.printer = printerName;
        }

        console.log(`Sending to printer: ${printerName || 'Default'}`);
        await ptp.print(tempPdfPath, options);
        console.log('Print job sent successfully');

        res.json({ success: true, message: 'Print job sent' });

    } catch (error) {
        console.error('Print Error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (browser) {
            await browser.close();
        }
        // Cleanup
        if (fs.existsSync(tempPdfPath)) {
            try { fs.unlinkSync(tempPdfPath); } catch (e) { }
        }
    }
});

app.get('/printers', async (req, res) => {
    try {
        const printers = await ptp.getPrinters();
        res.json(printers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/status', (req, res) => {
    res.json({ status: 'running', port });
});

app.listen(port, () => {
    console.log(`POS Print Server running at http://localhost:${port}`);
    console.log(`Click to test: http://localhost:${port}/status`);
});
