import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { TicketData, printReceipt as printStandard, printToBluetooth } from "../lib/printing";
import { addPrintToQueue, getPrintQueue, removePrintFromQueue, QueuedPrint } from "../lib/printQueue";
import { Alert } from "react-native";

export interface PrinterConfig {
  macAddress: string;
  autoPrint: boolean;
  autoShowModal: boolean;
  silentPrint: boolean;
  terminalId: string;
  targetPrinter: string;
  paperWidth: number;
}

const DEFAULT_CONFIG: PrinterConfig = {
  macAddress: "",
  autoPrint: false,
  autoShowModal: true,
  silentPrint: false,
  terminalId: "POS-01",
  targetPrinter: "",
  paperWidth: 58
};

export function usePrinter() {
  const [config, setConfig] = useState<PrinterConfig>(DEFAULT_CONFIG);
  const [isPrinting, setIsPrinting] = useState(false);
  const [failedPrints, setFailedPrints] = useState<QueuedPrint[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, []);

  const loadState = useCallback(async () => {
    if (userId) {
      const val = await AsyncStorage.getItem(`printer_config_${userId}`);
      if (val) {
        try { setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(val) }); } catch {}
      }
    }
    const queue = await getPrintQueue();
    setFailedPrints(queue);
  }, [userId]);

  useEffect(() => { loadState(); }, [loadState]);

  const updateConfig = async (newConfig: PrinterConfig) => {
    setConfig(newConfig);
    if (userId) {
      await AsyncStorage.setItem(`printer_config_${userId}`, JSON.stringify(newConfig));
    }
  };

  const executePrint = async (ticketData: TicketData, forceConfig?: PrinterConfig) => {
    const activeConfig = forceConfig || config;
    try {
      if (activeConfig.macAddress) {
        await printToBluetooth(ticketData, activeConfig.macAddress);
      } else {
        await printStandard(ticketData, activeConfig.targetPrinter, activeConfig.silentPrint);
      }
    } catch (e: any) {
      if (e.message !== "Print preview was cancelled.") {
        throw e;
      }
    }
  };

  const print = async (ticketData: TicketData) => {
    setIsPrinting(true);
    try {
      await executePrint(ticketData);
    } catch (error: any) {
      if (config.macAddress) {
        await addPrintToQueue(ticketData);
        await loadState();
        Alert.alert("Print Queued", "Printer is unavailable. Receipt saved to offline queue.");
      } else {
        Alert.alert("Print Error", error.message || "Could not print receipt.");
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const retryFailedPrints = async () => {
    if (failedPrints.length === 0 || isPrinting) return;
    setIsPrinting(true);
    let successCount = 0;
    
    for (const job of failedPrints) {
      try {
         await executePrint(job.ticketData);
         await removePrintFromQueue(job.id);
         successCount++;
      } catch (err) {
         Alert.alert("Printer Error", "Printer is still unavailable. Please check the connection and try again.");
         break;
      }
    }
    
    setIsPrinting(false);
    await loadState();
    
    if (successCount > 0) {
       Alert.alert("Retry Complete", `Successfully printed ${successCount} queued receipts.`);
    }
  };

  return {
    config,
    updateConfig,
    print,
    executePrint,
    isPrinting,
    failedPrints,
    retryFailedPrints,
    refreshQueue: loadState,
  };
}
