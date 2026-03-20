import { Request } from "express";

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface PassThroughFiscalizeResponse {
  fiscalCode: string;
  qrCodeData: string;
  receiptGlobalNo: number;
  receiptCounter: number;
  fiscalDayNo: number;
  invoiceNumber: string;
  total: string;
  date: string;
}

export interface InvoiceResponse {
  id: number;
  invoiceNumber: string;
  status: string;
  transactionType: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: string;
  taxAmount: string;
  total: string;
  fiscalCode: string | null;
  qrCodeData: string | null;
  receiptGlobalNo: number | null;
  receiptCounter: number | null;
  fiscalDayNo: number | null;
  customer?: CustomerResponse;
  items: InvoiceItemResponse[];
}

export interface InvoiceItemResponse {
  id: number;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  lineTotal: string;
  hsCode: string | null;
}

export interface FiscalizeResponse {
  invoiceId: number;
  invoiceNumber: string;
  fiscalCode: string;
  qrCodeData: string;
  receiptGlobalNo: number;
  receiptCounter: number;
  fiscalDayNo: number;
}

export interface CustomerResponse {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  vatNumber: string | null;
  tin: string | null;
}

// Extend Express Request to include company context
declare global {
  namespace Express {
    interface Request {
      company?: any;
    }
  }
}
