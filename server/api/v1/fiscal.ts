import { Router } from "express";
import { storage } from "../../storage.js";
import { ZimraDevice, ZimraApiError, getZimraBaseUrl } from "../../zimra.js";
import { getZimraLogger } from "../../lib/fiscalization.js";

const router = Router();

// GET /device — get fiscal device status (Task 9.2, Req 7.1)
router.get("/device", async (req, res) => {
  const company = req.company as any;

  if (!company.fdmsDeviceId) {
    return res.status(200).json({
      status: "unregistered",
    });
  }

  // Mask activation key to show only last 4 chars
  const rawKey = company.fdmsApiKey || "";
  const maskedActivationKey = rawKey.length > 4 
    ? `***${rawKey.slice(-4)}` 
    : "***";

  return res.status(200).json({
    deviceId: company.fdmsDeviceId,
    serialNumber: company.fdmsDeviceSerialNo,
    activationKey: maskedActivationKey,
    environment: company.zimraEnvironment || "test",
    lastPingTime: company.lastPing || null,
    status: company.fiscalDayOpen ? "online" : "offline", // simplistic status mapping
    currentDayNo: company.currentFiscalDayNo || null,
  });
});

// Helper to create ZimraDevice config
function getDeviceConfig(company: any) {
  if (!company.fdmsDeviceId) {
    throw new Error("Company not registered with ZIMRA");
  }

  return new ZimraDevice({
    deviceId: company.fdmsDeviceId,
    deviceSerialNo: company.fdmsDeviceSerialNo || "UNKNOWN",
    activationKey: company.fdmsApiKey || "",
    privateKey: company.zimraPrivateKey || "",
    certificate: company.zimraCertificate || "",
    baseUrl: getZimraBaseUrl((company.zimraEnvironment as "test" | "production") || 'test')
  }, getZimraLogger(company.id));
}

// POST /ping — manual ping (Task 9.3, Req 7.2)
router.post("/ping", async (req, res) => {
  const company = req.company as any;

  try {
    const device = getDeviceConfig(company);
    const start = Date.now();
    const response = await device.ping();
    const latencyMs = Date.now() - start;

    await storage.updateCompany(company.id, {
      lastPing: new Date(),
      deviceReportingFrequency: response.reportingFrequency
    });

    return res.status(200).json({
      isOnline: true,
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("ZIMRA v1 Ping Error:", err);
    if (err instanceof ZimraApiError) {
      return res.status(err.statusCode).json({
        error: "ZIMRA_API_ERROR",
        message: err.message,
        details: err.details,
      });
    }
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to ping ZIMRA: " + err.message,
    });
  }
});

// POST /open-day — manual day open (Task 9.4, Req 8.1)
router.post("/open-day", async (req, res) => {
  const company = req.company as any;

  try {
    const device = getDeviceConfig(company);

    const status = await device.getStatus() as any;
    if (status.fiscalDayStatus === 'FiscalDayOpened') {
      const fiscalDayNo = status.lastFiscalDayNo;
      if (!company.fiscalDayOpen) {
        await storage.updateCompany(company.id, {
          currentFiscalDayNo: fiscalDayNo,
          fiscalDayOpen: true,
          lastFiscalDayStatus: 'FiscalDayOpened'
        });
      }
      return res.status(200).json({ 
        success: true, 
        message: "Fiscal day is already open", 
        fiscalDayNo 
      });
    }

    const nextDayNo = (status.lastFiscalDayNo || 0) + 1;
    const result = await device.openDay(nextDayNo) as any;

    await storage.updateCompany(company.id, {
      currentFiscalDayNo: result.fiscalDayNo || nextDayNo,
      fiscalDayOpen: true,
      lastFiscalDayStatus: 'FiscalDayOpened',
      fiscalDayOpenedAt: new Date(),
      dailyReceiptCount: 0,
      lastFiscalHash: null
    });

    return res.status(200).json({
      success: true,
      fiscalDayNo: result.fiscalDayNo || nextDayNo,
    });
  } catch (err: any) {
    console.error("ZIMRA v1 Open Day Error:", err);
    if (err instanceof ZimraApiError) {
      return res.status(err.statusCode).json({
        error: "ZIMRA_API_ERROR",
        message: err.message,
        details: err.details,
      });
    }
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to open fiscal day: " + err.message,
    });
  }
});

// POST /close-day — manual day close (Task 9.5, Req 8.2)
router.post("/close-day", async (req, res) => {
  const company = req.company as any;

  try {
    const device = getDeviceConfig(company);

    if (!company.fiscalDayOpen && company.lastFiscalDayStatus !== 'FiscalDayCloseFailed') {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "No fiscal day is currently open",
      });
    }

    const fiscalDayNo = company.currentFiscalDayNo || 0;
    
    // Attempt closing without the complex retry logic here for simplicity,
    // or simulate the basic structure of a single pass
    const receiptCount = company.dailyReceiptCount || 0;
    
    // Identify opening date
    const formatHarareDateOnly = (date: Date) => {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Harare',
        year: 'numeric', month: '2-digit', day: '2-digit'
      }).formatToParts(date);
      const p = (t: string) => parts.find(x => x.type === t)?.value;
      return `${p('year')}-${p('month')}-${p('day')}`;
    };

    let fiscalDayDate = formatHarareDateOnly(new Date());
    if (company.fiscalDayOpenedAt) {
      fiscalDayDate = formatHarareDateOnly(new Date(company.fiscalDayOpenedAt));
    }

    let response;
    try {
      response = await device.closeDay(
        fiscalDayNo,
        fiscalDayDate,
        company.lastFiscalHash || '',
        receiptCount
      );
    } catch (e: any) {
      // Basic trap
      throw e;
    }

    await storage.updateCompany(company.id, {
      fiscalDayOpen: false,
      lastFiscalDayStatus: 'FiscalDayClosed'
    });

    return res.status(200).json({
      success: true,
      fiscalDayNo,
      receiptsDayCount: receiptCount,
    });
  } catch (err: any) {
    console.error("ZIMRA v1 Close Day Error:", err);
    if (err instanceof ZimraApiError) {
      return res.status(err.statusCode).json({
        error: "ZIMRA_API_ERROR",
        message: err.message,
        details: err.details,
      });
    }
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to close fiscal day: " + err.message,
    });
  }
});

export default router;
