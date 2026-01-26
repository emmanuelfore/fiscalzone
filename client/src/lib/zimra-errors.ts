
export const ZIMRA_ERROR_MAP: Record<string, { title: string, message: string }> = {
    // Device Errors
    'DEV01': { title: "Device Inactive", message: "Device not found or not active. Please check your registration status." },
    'DEV02': { title: "Activation Failed", message: "The activation key provided is incorrect." },
    'DEV03': { title: "Invalid CSR", message: "The certificate request is invalid. Please regenerate your keys." },
    'DEV04': { title: "Device Blocked", message: "This device model has been blacklisted by ZIMRA." },
    'DEV05': { title: "Taxpayer Inactive", message: "Your taxpayer account is not active in the ZIMRA system." },
    'DEV06': { title: "Model Mismatch", message: "This device model and version is not registered in FDMS." },

    // Receipt Errors
    'RCPT01': { title: "Submission Blocked", message: "Fiscal day is closed or closure is in progress. You cannot submit receipts now." },
    'RCPT02': { title: "Invalid Receipt Structure", message: "The receipt data format is invalid or missing mandatory fields." },

    // Fiscal Day Errors
    'FISC01': { title: "Open Day Blocked", message: "Opening the fiscal day is not allowed at this time." },
    'FISC03': { title: "Closure In Progress", message: "Fiscal day closure is already in progress." },
    'FISC04': { title: "Day Not Opened", message: "Closing is not allowed because the fiscal day was not opened." },

    // File Errors
    'FILE01': { title: "File Too Large", message: "The submitted file exceeds the 3MB limit." },
    'FILE02': { title: "Invalid File Format", message: "The file structure is invalid or missing mandatory fields." },
    'FILE03': { title: "Mode Mismatch", message: "File submission is only allowed when the device is in Offline mode." },

    // Closure Processing Errors (from Section 5.4.9)
    'BadCertificateSignature': {
        title: "Signature Error",
        message: "The digital signature for the close day report is invalid. Check device configuration."
    },
    'MissingReceipts': {
        title: "Sequence Gap",
        message: "There are missing receipts ('Grey' errors) that must be synced before closing."
    },
    'ReceiptsWithValidationErrors': {
        title: "Validation Errors",
        message: "Resolve all 'Red' status invoices before attempting to close the fiscal day."
    },
    'CountersMismatch': {
        title: "Total Mismatch",
        message: "The summary totals do not match the individual receipts. Check for rounding issues."
    }
};

/**
 * Get a human-readable error from a ZIMRA error code
 */
export function getZimraErrorMessage(errorCode: string | undefined, fallback?: string) {
    if (!errorCode) return { title: "ZIMRA Error", message: fallback || "An unknown ZIMRA error occurred." };

    const mapped = ZIMRA_ERROR_MAP[errorCode];
    if (mapped) return mapped;

    return { title: `ZIMRA Error (${errorCode})`, message: fallback || "A specific ZIMRA error occurred." };
}
