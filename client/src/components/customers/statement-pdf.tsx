
import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer";
import { format } from "date-fns";

// Register fonts (reuse existing if possible or re-declare)
Font.register({
    family: 'Roboto',
    fonts: [
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
    ],
});

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Roboto',
        fontSize: 9,
        color: '#333333',
        backgroundColor: '#FFFFFF',
    },
    headerFunc: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        paddingBottom: 10,
    },
    titleBlock: {
        flexDirection: 'column',
    },
    title: {
        fontSize: 18,
        fontWeight: 700,
        textTransform: 'uppercase',
        color: '#1e293b',
    },
    subtitle: {
        fontSize: 10,
        color: '#64748b',
        marginTop: 4,
    },
    companyInfo: {
        alignItems: 'flex-end',
    },
    companyName: {
        fontSize: 12,
        fontWeight: 700,
        marginBottom: 2,
    },
    infoText: {
        fontSize: 8,
        color: '#475569',
        marginBottom: 1,
        textAlign: 'right',
    },
    customerSection: {
        marginTop: 10,
        marginBottom: 20,
        padding: 10,
        backgroundColor: '#f8fafc',
        borderRadius: 4,
    },
    customerName: {
        fontSize: 11,
        fontWeight: 700,
        marginBottom: 2,
    },
    periodBlock: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    periodLabel: {
        fontSize: 9,
        color: '#64748b',
        width: 100,
    },
    periodValue: {
        fontSize: 9,
        fontWeight: 700,
    },
    table: {
        width: '100%',
        marginBottom: 20,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#cbd5e1',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingVertical: 6,
    },
    colDate: { width: '15%' },
    colRef: { width: '15%' },
    colDesc: { width: '30%' },
    colMoney: { width: '13%', textAlign: 'right' },
    colBal: { width: '14%', textAlign: 'right', fontWeight: 700 },

    headerText: {
        fontSize: 8,
        fontWeight: 700,
        textTransform: 'uppercase',
        color: '#475569',
    },
    cellText: {
        fontSize: 8,
    },

    balanceRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        marginTop: 10,
    },
    totalLabel: {
        fontSize: 10,
        fontWeight: 700,
        marginRight: 20,
    },
    totalValue: {
        fontSize: 12,
        fontWeight: 700,
        color: '#0f172a',
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
}

export const StatementPDF = ({ data, company, startDate, endDate }: StatementPDFProps) => {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.headerFunc}>
                    <View style={styles.titleBlock}>
                        <Text style={styles.title}>Statement of Account</Text>
                        <Text style={styles.subtitle}>{format(startDate, "dd MMM yyyy")} - {format(endDate, "dd MMM yyyy")}</Text>
                    </View>
                    <View style={styles.companyInfo}>
                        <Text style={styles.companyName}>{company.tradingName || company.name}</Text>
                        <Text style={styles.infoText}>{company.address}</Text>
                        <Text style={styles.infoText}>{company.city}</Text>
                        <Text style={styles.infoText}>{company.email}</Text>
                        <Text style={styles.infoText}>{company.phone}</Text>
                    </View>
                </View>

                {/* Customer Info */}
                <View style={styles.customerSection}>
                    <Text style={{ fontSize: 8, color: '#64748b', marginBottom: 4 }}>BILL TO</Text>
                    <Text style={styles.customerName}>{data.customer.name}</Text>
                    <Text style={styles.infoText}>{data.customer.address}</Text>
                    <Text style={styles.infoText}>{data.customer.city}</Text>
                </View>

                {/* Opening Balance */}
                <View style={styles.periodBlock}>
                    <Text style={styles.periodLabel}>Opening Balance</Text>
                    <Text style={styles.periodValue}>${Number(data.openingBalance).toFixed(2)}</Text>
                </View>

                {/* Transactions Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.colDate, styles.headerText]}>Date</Text>
                        <Text style={[styles.colRef, styles.headerText]}>Reference</Text>
                        <Text style={[styles.colDesc, styles.headerText]}>Description</Text>
                        <Text style={[styles.colMoney, styles.headerText]}>Debit</Text>
                        <Text style={[styles.colMoney, styles.headerText]}>Credit</Text>
                        <Text style={[styles.colBal, styles.headerText]}>Balance</Text>
                    </View>

                    {/* Opening Balance Row if needed, but usually just start from transactions */}

                    {data.transactions.map((tx, i) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={[styles.colDate, styles.cellText]}>{format(new Date(tx.date), "dd/MM/yyyy")}</Text>
                            <Text style={[styles.colRef, styles.cellText]}>{tx.reference}</Text>
                            <Text style={[styles.colDesc, styles.cellText]}>{tx.description}</Text>
                            <Text style={[styles.colMoney, styles.cellText]}>{tx.debit > 0 ? tx.debit.toFixed(2) : "-"}</Text>
                            <Text style={[styles.colMoney, styles.cellText]}>{tx.credit > 0 ? tx.credit.toFixed(2) : "-"}</Text>
                            <Text style={[styles.colBal, styles.cellText]}>{tx.balance.toFixed(2)}</Text>
                        </View>
                    ))}
                </View>

                {/* Closing Balance */}
                <View style={styles.balanceRow}>
                    <Text style={styles.totalLabel}>Closing Balance</Text>
                    <Text style={styles.totalValue}>${Number(data.closingBalance).toFixed(2)}</Text>
                </View>

            </Page>
        </Document>
    );
};
