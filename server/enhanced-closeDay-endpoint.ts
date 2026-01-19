// Enhanced closeDay endpoint with retry logic and comprehensive error handling
// Replace the existing closeDay endpoint (lines 528-569) in routes.ts with this code

app.post("/api/companies/:id/zimra/day/close", requireAuth, async(req, res) =\u003e {
    const companyId = Number(req.params.id);
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds between retries

    try {
        const company = await storage.getCompany(companyId);
        if(!company || !company.fdmsDeviceId) {
    return res.status(400).json({ message: "Company not registered with ZIMRA" });
}

// Check if fiscal day is actually open
if (!company.fiscalDayOpen) {
    return res.status(400).json({
        message: "No fiscal day is currently open",
        suggestion: "Open a fiscal day before attempting to close it"
    });
}

const device = new ZimraDevice({
    deviceId: company.fdmsDeviceId,
    deviceSerialNo: "UNKNOWN",
    activationKey: company.fdmsApiKey || "",
    privateKey: company.zimraPrivateKey || "",
    certificate: company.zimraCertificate || "",
});

const fiscalDayNo = company.currentFiscalDayNo || 0;
const receiptCounter = company.dailyReceiptCount || 0;

console.log(`[CloseDay] Starting closure for Fiscal Day ${fiscalDayNo}, Company ${companyId}`);
console.log(`[CloseDay] Receipt Counter: ${receiptCounter}`);

// Calculate Counters from DB transactions for this day
const counters = await storage.calculateFiscalCounters(companyId, fiscalDayNo);
console.log(`[CloseDay] Calculated ${counters.length} fiscal counters`);

const todayStr = new Date().toISOString().slice(0, 19);

// Retry mechanism for fiscal day closure
let lastError: any = null;
let result: any = null;

for (let attempt = 1; attempt \u003c = maxRetries; attempt++) {
    try {
        console.log(`[CloseDay] Attempt ${attempt}/${maxRetries} to close fiscal day ${fiscalDayNo}`);

        result = await device.closeDay(
            fiscalDayNo,
            todayStr,
            receiptCounter,
            counters
        );

        // Success! Break out of retry loop
        console.log(`[CloseDay] ✓ Successfully closed fiscal day ${fiscalDayNo} on attempt ${attempt}`);
        lastError = null;
        break;

    } catch (err: any) {
        lastError = err;
        console.error(`[CloseDay] ✗ Attempt ${attempt}/${maxRetries} failed:`, {
            error: err.message,
            statusCode: err.statusCode,
            endpoint: err.endpoint,
            details: err.details
        });

        // If this is not the last attempt, wait before retrying
        if (attempt \u003c maxRetries) {
            console.log(`[CloseDay] Waiting ${retryDelay}ms before retry...`);
            await new Promise(resolve =\u003e setTimeout(resolve, retryDelay));
        }
    }
}

// If all retries failed, handle the error
if (lastError) {
    console.error(`[CloseDay] ✗ All ${maxRetries} attempts failed for fiscal day ${fiscalDayNo}`);

    // Update company state to reflect failed closure
    await storage.updateCompany(companyId, {
        lastFiscalDayStatus: 'FiscalDayCloseFailed'
    });

    // Provide detailed error response with recovery instructions
    const errorResponse: any = {
        message: "Failed to close fiscal day after multiple attempts",
        fiscalDayNo,
        attempts: maxRetries,
        lastError: lastError.message,
        recovery: {
            options: [
                "Review and correct the fiscal counters data",
                "Verify all receipts for the day are properly recorded",
                "Try closing the day again via this endpoint",
                "If issue persists, manually close via ZIMRA Public Portal",
                "Contact ZIMRA support if manual closure is also failing"
            ],
            manualClosureUrl: "https://portal.zimra.co.zw" // Update with actual URL
        }
    };

    if (lastError instanceof ZimraApiError) {
        errorResponse.statusCode = lastError.statusCode;
        errorResponse.endpoint = lastError.endpoint;
        errorResponse.details = lastError.details;

        // Check if ZIMRA returned specific error code
        if (lastError.details?.fiscalDayClosingErrorCode) {
            errorResponse.zimraErrorCode = lastError.details.fiscalDayClosingErrorCode;
        }
    }

    return res.status(500).json(errorResponse);
}

// Success! Update company state
console.log(`[CloseDay] Updating company state after successful closure`);

await storage.updateCompany(companyId, {
    fiscalDayOpen: false,
    lastFiscalDayStatus: 'FiscalDayClosed'
});

// Log successful closure
console.log(`[CloseDay] ✓ Fiscal Day ${fiscalDayNo} closed successfully`, {
    companyId,
    fiscalDayNo,
    receiptCounter,
    countersCount: counters.length,
    timestamp: new Date().toISOString()
});

res.json({
    success: true,
    message: `Fiscal day ${fiscalDayNo} closed successfully`,
    fiscalDayNo,
    receiptCounter,
    countersSubmitted: counters.length,
    result
});

  } catch (err: any) {
    console.error("[CloseDay] Unexpected error:", err);

    // Try to update status even if there's an unexpected error
    try {
        await storage.updateCompany(companyId, {
            lastFiscalDayStatus: 'FiscalDayCloseFailed'
        });
    } catch (updateErr) {
        console.error("[CloseDay] Failed to update company status:", updateErr);
    }

    if (err instanceof ZimraApiError) {
        return res.status(err.statusCode).json({
            message: err.message,
            details: err.details,
            endpoint: err.endpoint
        });
    }

    res.status(500).json({
        message: "Failed to close fiscal day: " + err.message,
        error: err.toString()
    });
}
});
