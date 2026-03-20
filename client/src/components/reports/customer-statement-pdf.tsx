import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { format, isValid } from "date-fns";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1e293b",
    backgroundColor: "#ffffff",
    padding: 0,
  },
  headerBanner: {
    height: 90,
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
    justifyContent: "center",
    alignItems: "center",
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
    marginBottom: 30,
  },
  addressBox: {
    maxWidth: "45%",
  },
  label: {
    fontSize: 8,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: 10,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 2,
  },
  meta: {
    fontSize: 8,
    color: "#64748b",
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "#0f172a",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  summaryGrid: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 15,
    marginBottom: 30,
    gap: 20,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 7,
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: 700,
    color: "#0f172a",
  },
  table: {
    marginTop: 0,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#0f172a",
    paddingBottom: 6,
    marginBottom: 6,
    backgroundColor: "#ffffff",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 6,
    alignItems: "center",
  },
  colDate: { flex: 1.2 },
  colRef: { flex: 1.5 },
  colDesc: { flex: 2.5 },
  colDebit: { flex: 1, textAlign: "right" },
  colCredit: { flex: 1, textAlign: "right" },
  colBalance: { flex: 1.2, textAlign: "right" },
  
  colHeader: {
    fontSize: 7,
    fontWeight: 700,
    color: "#475569",
    textTransform: "uppercase",
  },
  footer: {
    marginTop: 40,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 20,
  },
  footerText: {
    fontSize: 8,
    color: "#94a3b8",
  }
});

interface StatementPDFProps {
  data: {
    customer: any;
    openingBalance: number;
    closingBalance: number;
    transactions: any[];
  };
  company: any;
  startDate: Date;
  endDate: Date;
  currency: string;
}

export const CustomerStatementPDF = ({
  data,
  company,
  startDate,
  endDate,
  currency = "USD",
}: StatementPDFProps) => {
  const getSafeDate = (d: any) => {
    if (!d) return new Date();
    const dateObj = new Date(d);
    return isValid(dateObj) ? dateObj : new Date();
  };

  const formatDate = (d: any) => format(getSafeDate(d), "dd MMM yyyy");

  return (
    <Document title={`Statement - ${data.customer.name}`}>
      <Page size="A4" style={s.page}>
        <View style={s.headerBanner}>
          <View style={s.logoBox}>
            {company?.logoUrl ? (
              <Image src={company.logoUrl} style={{ width: 100, height: 35, objectFit: "contain" }} />
            ) : (
              <Text style={{ fontSize: 12, fontWeight: 700 }}>{company?.name}</Text>
            )}
          </View>
          <View style={s.headerText}>
            <Text style={s.title}>Statement of Account</Text>
            <Text style={s.meta}>{formatDate(startDate)} - {formatDate(endDate)}</Text>
          </View>
        </View>

        <View style={s.content}>
          <View style={s.topSection}>
            <View style={s.addressBox}>
              <Text style={s.label}>From</Text>
              <Text style={s.value}>{company?.tradingName || company?.name}</Text>
              <Text style={s.meta}>{company?.address}</Text>
              <Text style={s.meta}>{company?.city}, {company?.country}</Text>
              <Text style={s.meta}>TIN: {company?.tin}</Text>
            </View>
            <View style={s.addressBox}>
              <Text style={s.label}>To</Text>
              <Text style={s.value}>{data.customer.name}</Text>
              <Text style={s.meta}>{data.customer.address}</Text>
              <Text style={s.meta}>{data.customer.email}</Text>
              <Text style={s.meta}>Phone: {data.customer.phone}</Text>
            </View>
          </View>

          <View style={s.summaryGrid}>
            <View style={s.summaryItem}>
              <Text style={s.summaryLabel}>Opening Balance</Text>
              <Text style={s.summaryValue}>{currency} {data.openingBalance.toFixed(2)}</Text>
            </View>
            <View style={s.summaryItem}>
              <Text style={s.summaryLabel}>Total Invoiced</Text>
              <Text style={s.summaryValue}>
                {currency} {data.transactions.reduce((acc, t) => acc + (t.debit || 0), 0).toFixed(2)}
              </Text>
            </View>
            <View style={s.summaryItem}>
              <Text style={s.summaryLabel}>Total Paid</Text>
              <Text style={s.summaryValue}>
                {currency} {data.transactions.reduce((acc, t) => acc + (t.credit || 0), 0).toFixed(2)}
              </Text>
            </View>
            <View style={s.summaryItem}>
              <Text style={[s.summaryLabel, { color: "#3b82f6", fontWeight: 700 }]}>Balance Due</Text>
              <Text style={[s.summaryValue, { color: "#3b82f6" }]}>{currency} {data.closingBalance.toFixed(2)}</Text>
            </View>
          </View>

          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.colDate, s.colHeader]}>Date</Text>
              <Text style={[s.colRef, s.colHeader]}>Reference</Text>
              <Text style={[s.colDesc, s.colHeader]}>Description</Text>
              <Text style={[s.colDebit, s.colHeader]}>Debit</Text>
              <Text style={[s.colCredit, s.colHeader]}>Credit</Text>
              <Text style={[s.colBalance, s.colHeader]}>Balance</Text>
            </View>

            {/* Opening Balance Row */}
            <View style={[s.tableRow, { backgroundColor: "#fdfdfd" }]}>
              <Text style={[s.colDate, { fontSize: 8 }]}>{formatDate(startDate)}</Text>
              <Text style={[s.colRef, { fontSize: 8 }]}>-</Text>
              <Text style={[s.colDesc, { fontSize: 8, fontWeight: 700 }]}>Opening Balance</Text>
              <Text style={[s.colDebit, { fontSize: 8 }]}></Text>
              <Text style={[s.colCredit, { fontSize: 8 }]}></Text>
              <Text style={[s.colBalance, { fontSize: 8, fontWeight: 700 }]}>{data.openingBalance.toFixed(2)}</Text>
            </View>

            {data.transactions.map((t, i) => (
              <View key={i} style={s.tableRow}>
                <Text style={[s.colDate, { fontSize: 8 }]}>{formatDate(t.date)}</Text>
                <Text style={[s.colRef, { fontSize: 8 }]}>{t.reference}</Text>
                <Text style={[s.colDesc, { fontSize: 8 }]}>{t.description}</Text>
                <Text style={[s.colDebit, { fontSize: 8 }]}>{t.debit > 0 ? t.debit.toFixed(2) : ""}</Text>
                <Text style={[s.colCredit, { fontSize: 8 }]}>{t.credit > 0 ? t.credit.toFixed(2) : ""}</Text>
                <Text style={[s.colBalance, { fontSize: 8, fontWeight: 700 }]}>{t.balance.toFixed(2)}</Text>
              </View>
            ))}
          </View>

          <View style={s.footer}>
            <Text style={s.footerText}>Thank you for your business. Please contact us if you have any questions regarding this statement.</Text>
            <Text style={[s.footerText, { marginTop: 4, fontWeight: 700, color: "#0f172a" }]}>
              {company?.name}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
