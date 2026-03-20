import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";
import { format, isValid } from "date-fns";

// Use built-in Helvetica — removing font registration to eliminate fetch issues

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1e293b",
    backgroundColor: "#ffffff",
    padding: 0,
  },
  headerBanner: {
    height: 80,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 40,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  logoBox: {
    width: 120,
    height: 40,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    padding: 0,
  },
  headerText: {
    color: "#0f172a",
    textAlign: "right",
  },
  content: {
    padding: 40,
  },
  topSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    borderBottom: "1pt solid #f1f5f9",
    paddingBottom: 16,
  },
  companyInfo: {
    maxWidth: "55%",
  },
  companyName: {
    fontSize: 15,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 4,
  },
  companyMeta: {
    fontSize: 9,
    color: "#64748b",
    marginBottom: 2,
    fontWeight: 400,
  },
  receiptLabel: {
    fontSize: 20,
    fontWeight: 700,
    color: "#0f172a",
    textTransform: "uppercase",
    textAlign: "right",
    marginBottom: 4,
  },
  receiptNo: {
    fontSize: 10,
    color: "#64748b",
    textAlign: "right",
    fontWeight: 500,
  },
  infoGrid: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 30,
  },
  infoCol: {
    flex: 1,
  },
  infoColLabel: {
    fontSize: 8,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoColValue: {
    fontSize: 10,
    fontWeight: 700,
    color: "#0f172a",
  },
  heroBox: {
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountHeroLabel: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.8)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  amountHeroValue: {
    fontSize: 32,
    fontWeight: 700,
    color: "#ffffff",
  },
  table: {
    marginTop: 10,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 4,
  },
  columnHeader: {
    fontSize: 8,
    fontWeight: 700,
    color: "#475569",
    textTransform: "uppercase",
  },
  colDesc: { flex: 2.5 },
  colQty: { flex: 0.8, textAlign: "center" },
  colPrice: { flex: 1.2, textAlign: "right" },
  colTax: { flex: 1.2, textAlign: "right" },
  colTotal: { flex: 1.3, textAlign: "right" },
  
  summarySection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
  },
  taxTable: {
    width: "45%",
  },
  totalsBox: {
    width: "45%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  totalLabel: {
    fontSize: 9,
    color: "#64748b",
  },
  totalValue: {
    fontSize: 9,
    fontWeight: 700,
    color: "#1e293b",
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  grandTotalLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: "#0f172a",
  },
  grandTotalValue: {
    fontSize: 10,
    fontWeight: 700,
    color: "#3b82f6",
  },
  footer: {
    marginTop: 30,
    borderTop: "1pt solid #f1f5f9",
    paddingTop: 16,
    textAlign: "center",
  },
  footerText: {
    fontSize: 8,
    color: "#94a3b8",
    marginBottom: 4,
  },
  notes: {
    marginTop: 16,
    padding: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
  },
  notesText: {
    fontSize: 8,
    color: "#64748b",
    fontStyle: "italic",
  },
});

interface PaymentReceiptPDFProps {
  payment: {
    id: number;
    amount: string | number;
    paymentMethod: string;
    reference?: string;
    notes?: string;
    currency?: string;
    paymentDate?: string | Date;
    invoiceNumber?: string;
    customerName?: string;
    customerEmail?: string;
  };
  allPayments?: any[];
  overallBalance?: number;
  company?: any;
  invoice?: any;
  taxTypes?: any[];
}

export const PaymentReceiptPDF = ({
  payment,
  allPayments = [],
  overallBalance,
  company,
  invoice,
  taxTypes,
}: PaymentReceiptPDFProps) => {
  const currency = payment.currency || invoice?.currency || "USD";

  const getSafeDate = (d: any) => {
    if (!d) return new Date();
    const dateObj = new Date(d);
    return isValid(dateObj) ? dateObj : new Date();
  };

  // Calculate balance due after THIS payment
  // We sum all payments for this invoice that happened on or before this payment
  const currentPaymentDate = getSafeDate(payment.paymentDate).getTime();
  const paidUntilNow = (allPayments || []).reduce((sum, p) => {
    const pDate = getSafeDate(p.paymentDate).getTime();
    if (pDate < currentPaymentDate || (pDate === currentPaymentDate && p.id <= payment.id)) {
      return sum + Number(p.amount || 0);
    }
    return sum;
  }, 0);

  const balanceDue = Math.max(0, Number(invoice?.total || 0) - paidUntilNow);

  const date = format(getSafeDate(payment.paymentDate), "dd MMM yyyy");

  const taxRegistered = company?.vatRegistered || false;

  // Calculate Tax Summary if invoice and items are available
  const taxSummary = invoice?.items?.reduce((acc: any, item: any) => {
    const taxRate = taxRegistered ? Number(item.taxRate || 0) : 0;
    const lineTotal = Number(item.lineTotal);
    let netAmount = 0;
    let taxAmount = 0;

    if (invoice.taxInclusive) {
      netAmount = lineTotal / (1 + taxRate / 100);
      taxAmount = lineTotal - netAmount;
    } else {
      const qty = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      netAmount = qty * unitPrice;
      taxAmount = netAmount * (taxRate / 100);
    }

    const key = `${taxRate}`;
    if (!acc[key]) {
      acc[key] = { taxRate, netAmount: 0, taxAmount: 0 };
    }
    acc[key].netAmount += netAmount;
    acc[key].taxAmount += taxAmount;
    return acc;
  }, {} as Record<string, any>) || {};

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.headerBanner}>
          <View style={s.logoBox}>
            {company?.logoUrl && (company.logoUrl.startsWith('http') || company.logoUrl.startsWith('/')) ? (
              <Image src={company.logoUrl} style={{ width: 100, height: 30, objectFit: "contain" }} />
            ) : (
              <Text style={{ fontSize: 10, fontWeight: 700, color: "#0f172a", textTransform: "uppercase" }}>{company?.name?.substring(0, 15)}</Text>
            )}
          </View>
          <View style={s.headerText}>
            <Text style={{ fontSize: 12, fontWeight: 700 }}>PAYMENT RECEIPT</Text>
            <Text style={{ fontSize: 8, opacity: 0.8 }}>#{payment.reference || "REC-NEW"}</Text>
          </View>
        </View>

        <View style={s.content}>
          <View style={s.topSection}>
            <View style={s.companyInfo}>
              <Text style={s.companyName}>{company?.tradingName || company?.name}</Text>
              {company?.address ? <Text style={s.companyMeta}>{company.address}</Text> : null}
              <Text style={s.companyMeta}>{company?.city || "Harare"}, {company?.country || "Zimbabwe"}</Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                {company?.tin ? <Text style={[s.companyMeta, { fontWeight: 700 }]}>TIN: {company.tin}</Text> : null}
                {company?.vatNumber ? <Text style={[s.companyMeta, { fontWeight: 700 }]}>VAT: {company.vatNumber}</Text> : null}
              </View>
            </View>
            <View>
              <Text style={s.receiptLabel}>Receipt</Text>
              <Text style={[s.receiptNo, { fontSize: 12, color: "#1e293b", marginBottom: 2 }]}>Receipt No: {payment.reference || "N/A"}</Text>
              <Text style={s.receiptNo}>Date: {date}</Text>
            </View>
          </View>
 
          <View style={s.infoGrid}>
            <View style={s.infoCol}>
              <Text style={s.infoColLabel}>Received From</Text>
              <Text style={s.infoColValue}>{payment.customerName || "Walk-in Customer"}</Text>
              {payment.customerEmail ? <Text style={[s.companyMeta, { marginTop: 2 }]}>{payment.customerEmail}</Text> : null}
            </View>
            <View style={s.infoCol}>
              <Text style={s.infoColLabel}>Payment Method</Text>
              <Text style={s.infoColValue}>{payment.paymentMethod || "Other"}</Text>
            </View>
            <View style={s.infoCol}>
              <Text style={s.infoColLabel}>Invoice Reference</Text>
              <Text style={[s.infoColValue, { fontWeight: 700 }]}>{payment.invoiceNumber || "N/A"}</Text>
            </View>
          </View>

          <View style={s.heroBox}>
            <View>
              <Text style={s.amountHeroLabel}>Amount Paid</Text>
              <Text style={{ color: "#ffffff", fontSize: 12, opacity: 0.8 }}>Currency: {currency}</Text>
            </View>
            <Text style={s.amountHeroValue}>{currency} {Number(payment.amount || 0).toFixed(2)}</Text>
          </View>

          {invoice?.items && invoice.items.length > 0 ? (
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.colDesc, s.columnHeader]}>Description</Text>
                <Text style={[s.colQty, s.columnHeader]}>Qty</Text>
                <Text style={[s.colPrice, s.columnHeader]}>Price</Text>
                <Text style={[s.colTax, s.columnHeader]}>Tax</Text>
                <Text style={[s.colTotal, s.columnHeader]}>Total</Text>
              </View>
              {invoice.items.slice(0, 8).map((item: any, i: number) => {
                const taxRate = Number(item.taxRate || 0);
                const lineTotal = Number(item.lineTotal || 0);
                let lineTax = 0;
                if (invoice.taxInclusive) {
                  lineTax = lineTotal - (lineTotal / (1 + taxRate / 100));
                } else {
                  lineTax = (Number(item.quantity || 0) * Number(item.unitPrice || 0)) * (taxRate / 100);
                }
                return (
                  <View key={i} style={s.tableRow}>
                    <Text style={[s.colDesc, { fontSize: 8 }]}>{item.description || "Item"}</Text>
                    <Text style={[s.colQty, { fontSize: 8 }]}>{item.quantity || 0}</Text>
                    <Text style={[s.colPrice, { fontSize: 8 }]}>{Number(item.unitPrice || 0).toFixed(2)}</Text>
                    <Text style={[s.colTax, { fontSize: 8 }]}>{lineTax.toFixed(2)}</Text>
                    <Text style={[s.colTotal, { fontSize: 8, fontWeight: 700 }]}>{lineTotal.toFixed(2)}</Text>
                  </View>
                );
              })}
              {invoice.items.length > 8 ? (
                <Text style={{ fontSize: 8, color: "#94a3b8", marginTop: 4, textAlign: "center" }}>... and {invoice.items.length - 8} more items</Text>
              ) : null}
            </View>
          ) : null}

          <View style={s.summarySection}>
            <View style={s.taxTable}>
              {Object.keys(taxSummary).length > 0 ? (
                <View>
                  <Text style={[s.infoColLabel, { marginBottom: 4 }]}>Tax Analysis</Text>
                  <View style={{ borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingBottom: 2, marginBottom: 2, flexDirection: "row" }}>
                    <Text style={{ fontSize: 7, flex: 1, color: "#94a3b8" }}>Rate</Text>
                    <Text style={{ fontSize: 7, flex: 2, textAlign: "right", color: "#94a3b8" }}>Net</Text>
                    <Text style={{ fontSize: 7, flex: 2, textAlign: "right", color: "#94a3b8" }}>VAT</Text>
                  </View>
                  {Object.entries(taxSummary).map(([rate, data]: [string, any]) => (
                    <View key={rate} style={{ flexDirection: "row", marginBottom: 1 }}>
                      <Text style={{ fontSize: 7, flex: 1 }}>{Number(rate).toFixed(1)}%</Text>
                      <Text style={{ fontSize: 7, flex: 2, textAlign: "right" }}>{data.netAmount.toFixed(2)}</Text>
                      <Text style={{ fontSize: 7, flex: 2, textAlign: "right" }}>{data.taxAmount.toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={s.totalsBox}>
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Invoice Total:</Text>
                <Text style={s.totalValue}>{Number(invoice?.total || 0).toFixed(2)}</Text>
              </View>
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Amount Paid:</Text>
                <Text style={s.totalValue}>{Number(payment.amount || 0).toFixed(2)}</Text>
              </View>
              <View style={s.grandTotal}>
                <Text style={s.grandTotalLabel}>Balance Due:</Text>
                <Text style={s.grandTotalValue}>{currency} {balanceDue.toFixed(2)}</Text>
              </View>

              <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#f1f5f9", borderTopStyle: "dashed" }}>
                 <View style={s.totalRow}>
                  <Text style={[s.totalLabel, { fontSize: 7, color: "#94a3b8" }]}>Overall Statement Balance:</Text>
                  <Text style={[s.totalValue, { fontSize: 8, color: (overallBalance || 0) > 0 ? "#e11d48" : "#059669" }]}>
                    {overallBalance !== undefined 
                      ? `${currency} ${Number(overallBalance).toFixed(2)}`
                      : "N/A"}
                  </Text>
                </View>
                {overallBalance === undefined && (
                  <Text style={{ fontSize: 6, color: "#94a3b8", textAlign: "right" }}>No customer linked to this payment</Text>
                )}
              </View>
            </View>
          </View>

          {payment.notes ? (
            <View style={s.notes}>
              <Text style={[s.infoColLabel, { fontSize: 7, marginBottom: 2 }]}>Notes</Text>
              <Text style={s.notesText}>{payment.notes}</Text>
            </View>
          ) : null}

          <View style={s.footer}>
            <Text style={s.footerText}>This is a computer-generated payment receipt for your records.</Text>
            <Text style={{ fontSize: 10, fontWeight: 700, color: "#0f172a" }}>Thank You!</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
