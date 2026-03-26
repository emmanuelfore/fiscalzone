import AsyncStorage from "@react-native-async-storage/async-storage";
import { TicketData } from "./printing";

const PRINT_QUEUE_KEY = "@fiscalstack_print_queue";

export interface QueuedPrint {
  id: string;
  ticketData: TicketData;
  createdAt: string;
}

export const getPrintQueue = async (): Promise<QueuedPrint[]> => {
  try {
    const data = await AsyncStorage.getItem(PRINT_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to fetch print queue:", error);
    return [];
  }
};

export const addPrintToQueue = async (ticketData: TicketData): Promise<string> => {
  try {
    const queue = await getPrintQueue();
    const newPrint: QueuedPrint = {
      id: `print_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ticketData,
      createdAt: new Date().toISOString()
    };
    await AsyncStorage.setItem(PRINT_QUEUE_KEY, JSON.stringify([newPrint, ...queue]));
    return newPrint.id;
  } catch (error) {
    console.error("Failed to queue print job:", error);
    throw error;
  }
};

export const removePrintFromQueue = async (id: string): Promise<void> => {
  try {
    const queue = await getPrintQueue();
    const updatedQueue = queue.filter(item => item.id !== id);
    await AsyncStorage.setItem(PRINT_QUEUE_KEY, JSON.stringify(updatedQueue));
  } catch (error) {
    console.error("Failed to remove print from queue:", error);
  }
};

export const clearPrintQueue = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(PRINT_QUEUE_KEY);
  } catch (error) {
    console.error("Failed to clear print queue:", error);
  }
};
