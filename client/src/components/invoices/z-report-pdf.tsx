
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { format } from "date-fns";

// Register custom font
try {
    Font.register({
        family: 'Courier',
        fonts: [
            { src: 'https://cdn.jsdelivr.net/npm/@fontsource/courier-prime@4.5.5/files/courier-prime-latin-400-normal.woff', fontWeight: 400 },
            { src: 'https://cdn.jsdelivr.net/npm/@fontsource/courier-prime@4.5.5/files/courier-prime-latin-700-normal.woff', fontWeight: 700 },
        ],
    });
} catch (error) {
    console.warn('Failed to load Courier fonts, using system fonts');
}

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Courier',
        fontSize: 10,
        color: '#000000',
        lineHeight: 1.2,
    },
    header: {
        textAlign: 'center',
        marginBottom: 20,
    },
    companyName: {
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    divider: {
        borderBottomWidth: 1,
        borderBottomColor: '#000000',
        borderBottomStyle: 'dashed',
        marginVertical: 10,
    },
    reportTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 10,
        letterSpacing: 2,
    },
    section: {
        marginBottom: 10,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    label: {
        flex: 1,
    },
    value: {
        textAlign: 'right',
        minWidth: 100,
    },
    currencyTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 15,
        marginBottom: 5,
        textTransform: 'uppercase',
    },
    subTitle: {
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginTop: 8,
        marginBottom: 4,
        textDecoration: 'underline',
    },
    bold: {
        fontWeight: 'bold',
    }
});

interface ZReportPDFProps {
    data: any;
    isZReport: boolean;
}

export const ZReportPDF = ({ data, isZReport }: ZReportPDFProps) => {
    const { company, fiscalDayNo, openedAt, closedAt, counters, docStats } = data;

    // Helper to filter and sort counters
    const getCountersByType = (curr: string, type: string) => {
        return (counters || [])
            .filter((c: any) => c.fiscalCounterCurrency === curr && c.fiscalCounterType === type)
            .sort((a: any, b: any) => (b.fiscalCounterTaxPercent || 0) - (a.fiscalCounterTaxPercent || 0));
    };

    return (
        <Document title={`${isZReport ? 'Z' : 'X'} Report - Day ${fiscalDayNo || 'Current'}`}>
            <Page size="A4" style={styles.page}>
                {/* Header Section */}
                <View style={styles.header}>
                    <Text style={styles.companyName}>{company.name}</Text>
                    <Text>TIN: {company.tin}</Text>
                    {company.vatNumber && <Text>VAT No: {company.vatNumber}</Text>}
                    {company.branchName && company.branchName !== company.name && <Text>Branch: {company.branchName}</Text>}
                    <Text>{company.address}</Text>
                    <Text>{company.city}, {company.country}</Text>
                    <Text>{company.email}</Text>
                    <Text>{company.phone}</Text>
                </View>

                <View style={styles.divider} />

                <Text style={styles.reportTitle}>{isZReport ? "Z REPORT" : "X REPORT"}</Text>

                <View style={styles.divider} />

                {/* Fiscal Day Info */}
                <View style={styles.section}>
                    <View style={styles.row}>
                        <Text style={styles.label}>Fiscal day No:</Text>
                        <Text style={styles.value}>{fiscalDayNo || "N/A"}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Fiscal day opened:</Text>
                        <Text style={styles.value}>{openedAt ? format(new Date(openedAt), "dd/MM/yyyy HH:mm") : "N/A"}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Fiscal day closed:</Text>
                        <Text style={styles.value}>{isZReport && closedAt ? format(new Date(closedAt), "dd/MM/yyyy HH:mm") : (isZReport ? "N/A" : "STILL OPEN")}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Device Serial No:</Text>
                        <Text style={styles.value}>{company.fdmsDeviceSerialNo || "N/A"}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Device Id:</Text>
                        <Text style={styles.value}>{company.fdmsDeviceId || "N/A"}</Text>
                    </View>
                </View>

                <View style={styles.divider} />
                <Text style={{ textAlign: 'center', fontWeight: 'bold' }}>Daily totals</Text>
                <View style={styles.divider} />

                {/* Currency Sections */}
                {docStats && docStats.map((stats: any) => {
                    const currency = stats.currency;

                    // Net Sales Counters
                    const netCounters = getCountersByType(currency, 'SaleByTax');
                    const netTaxCounters = getCountersByType(currency, 'SaleTaxByTax');

                    const cnCounters = getCountersByType(currency, 'CreditNoteByTax');
                    const cnTaxCounters = getCountersByType(currency, 'CreditNoteTaxByTax');

                    const dnCounters = getCountersByType(currency, 'DebitNoteByTax');
                    const dnTaxCounters = getCountersByType(currency, 'DebitNoteTaxByTax');

                    return (
                        <View key={currency} break={docStats.indexOf(stats) > 0}>
                            <Text style={styles.currencyTitle}>{currency}</Text>
                            <View style={styles.divider} />

                            {/* Net Sales */}
                            <View style={styles.section}>
                                <Text style={styles.subTitle}>Total net sales</Text>
                                {netCounters.map((c: any, i: number) => {
                                    const taxC = netTaxCounters.find((tc: any) => tc.fiscalCounterTaxPercent === c.fiscalCounterTaxPercent);

                                    const cnC = cnCounters.find((cc: any) => cc.fiscalCounterTaxPercent === c.fiscalCounterTaxPercent);
                                    const cnTaxC = cnTaxCounters.find((ctc: any) => ctc.fiscalCounterTaxPercent === c.fiscalCounterTaxPercent);

                                    const dnC = dnCounters.find((dc: any) => dc.fiscalCounterTaxPercent === c.fiscalCounterTaxPercent);
                                    const dnTaxC = dnTaxCounters.find((dtc: any) => dtc.fiscalCounterTaxPercent === c.fiscalCounterTaxPercent);

                                    // Formula: (Sale - SaleTax) + (CN - CNTax) + (DN - DNTax)
                                    const netVal = (c.fiscalCounterValue - (taxC?.fiscalCounterValue || 0)) +
                                        ((cnC?.fiscalCounterValue || 0) - (cnTaxC?.fiscalCounterValue || 0)) +
                                        ((dnC?.fiscalCounterValue || 0) - (dnTaxC?.fiscalCounterValue || 0));

                                    return (
                                        <View key={i} style={styles.row}>
                                            <Text style={styles.label}>Net, VAT {c.fiscalCounterTaxPercent}%</Text>
                                            <Text style={styles.value}>{netVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                        </View>
                                    );
                                })}
                                <View style={[styles.row, { marginTop: 4 }]}>
                                    <Text style={[styles.label, styles.bold]}>Total net amount</Text>
                                    <Text style={[styles.value, styles.bold]}>
                                        {(
                                            (netCounters.reduce((s: number, c: any) => s + c.fiscalCounterValue, 0) - netTaxCounters.reduce((s: number, c: any) => s + c.fiscalCounterValue, 0)) +
                                            (cnCounters.reduce((s: number, c: any) => s + c.fiscalCounterValue, 0) - cnTaxCounters.reduce((s: number, c: any) => s + c.fiscalCounterValue, 0)) +
                                            (dnCounters.reduce((s: number, c: any) => s + c.fiscalCounterValue, 0) - dnTaxCounters.reduce((s: number, c: any) => s + c.fiscalCounterValue, 0))
                                        ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Text>
                                </View>
                            </View>

                            {/* Taxes */}
                            <View style={styles.section}>
                                <Text style={styles.subTitle}>Total taxes</Text>
                                {netTaxCounters.map((c: any, i: number) => {
                                    const cnTaxC = cnTaxCounters.find((ctc: any) => ctc.fiscalCounterTaxPercent === c.fiscalCounterTaxPercent);
                                    const dnTaxC = dnTaxCounters.find((dtc: any) => dtc.fiscalCounterTaxPercent === c.fiscalCounterTaxPercent);

                                    const taxVal = c.fiscalCounterValue + (cnTaxC?.fiscalCounterValue || 0) + (dnTaxC?.fiscalCounterValue || 0);

                                    return (
                                        <View key={i} style={styles.row}>
                                            <Text style={styles.label}>Tax, VAT {c.fiscalCounterTaxPercent}%</Text>
                                            <Text style={styles.value}>{taxVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                        </View>
                                    );
                                })}
                                <View style={[styles.row, { marginTop: 4 }]}>
                                    <Text style={[styles.label, styles.bold]}>Total tax amount</Text>
                                    <Text style={[styles.value, styles.bold]}>
                                        {(
                                            netTaxCounters.reduce((s: number, c: any) => s + c.fiscalCounterValue, 0) +
                                            cnTaxCounters.reduce((s: number, c: any) => s + c.fiscalCounterValue, 0) +
                                            dnTaxCounters.reduce((s: number, c: any) => s + c.fiscalCounterValue, 0)
                                        ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Text>
                                </View>
                            </View>

                            {/* Gross Sales */}
                            <View style={styles.section}>
                                <Text style={styles.subTitle}>Total gross sales</Text>
                                {netCounters.map((c: any, i: number) => {
                                    const cnC = cnCounters.find((cc: any) => cc.fiscalCounterTaxPercent === c.fiscalCounterTaxPercent);
                                    const dnC = dnCounters.find((dc: any) => dc.fiscalCounterTaxPercent === c.fiscalCounterTaxPercent);

                                    const grossVal = c.fiscalCounterValue + (cnC?.fiscalCounterValue || 0) + (dnC?.fiscalCounterValue || 0);

                                    return (
                                        <View key={i} style={styles.row}>
                                            <Text style={styles.label}>Total, VAT {c.fiscalCounterTaxPercent}%</Text>
                                            <Text style={styles.value}>{grossVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                        </View>
                                    );
                                })}
                                <View style={[styles.row, { marginTop: 4 }]}>
                                    <Text style={[styles.label, styles.bold]}>Total gross amount</Text>
                                    <Text style={[styles.value, styles.bold]}>
                                        {(
                                            netCounters.reduce((s: number, c: any) => s + c.fiscalCounterValue, 0) +
                                            cnCounters.reduce((s: number, c: any) => s + c.fiscalCounterValue, 0) +
                                            dnCounters.reduce((s: number, c: any) => s + c.fiscalCounterValue, 0)
                                        ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.divider} />

                            {/* Documents */}
                            <View style={styles.section}>
                                <Text style={styles.subTitle}>Documents</Text>
                                <View style={[styles.row, styles.bold]}>
                                    <Text style={{ width: '40%' }}>Type</Text>
                                    <Text style={{ width: '20%', textAlign: 'center' }}>Quantity</Text>
                                    <Text style={{ width: '40%', textAlign: 'right' }}>Total amount</Text>
                                </View>
                                <View style={styles.row}>
                                    <Text style={{ width: '40%' }}>Invoices</Text>
                                    <Text style={{ width: '20%', textAlign: 'center' }}>{stats.invoices.quantity}</Text>
                                    <Text style={{ width: '40%', textAlign: 'right' }}>{stats.invoices.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                </View>
                                <View style={styles.row}>
                                    <Text style={{ width: '40%' }}>Credit notes</Text>
                                    <Text style={{ width: '20%', textAlign: 'center' }}>{stats.creditNotes.quantity}</Text>
                                    <Text style={{ width: '40%', textAlign: 'right' }}>{stats.creditNotes.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                </View>
                                <View style={styles.row}>
                                    <Text style={{ width: '40%' }}>Debit notes</Text>
                                    <Text style={{ width: '20%', textAlign: 'center' }}>{stats.debitNotes.quantity}</Text>
                                    <Text style={{ width: '40%', textAlign: 'right' }}>{stats.debitNotes.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                </View>
                                <View style={[styles.row, styles.bold, { marginTop: 4, borderTopWidth: 1, paddingTop: 4 }]}>
                                    <Text style={{ width: '40%' }}>Total documents</Text>
                                    <Text style={{ width: '20%', textAlign: 'center' }}>{stats.totalDocuments.quantity}</Text>
                                    <Text style={{ width: '40%', textAlign: 'right' }}>{stats.totalDocuments.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                </View>
                            </View>

                            <Text style={{ textAlign: 'center', marginVertical: 10 }}>================================================</Text>
                        </View>
                    );
                })}

                {/* POS Sales Summary Section */}
                {data.posSummary && (
                    <View style={styles.section}>
                        <Text style={[styles.subTitle, { textAlign: 'center', textDecoration: 'none' }]}>--- POS SALES SUMMARY ---</Text>
                        <View style={[styles.row, styles.bold, { marginTop: 10 }]}>
                            <Text style={styles.label}>Total Transactions:</Text>
                            <Text style={styles.value}>{data.posSummary.totalTransactions}</Text>
                        </View>
                        <View style={styles.divider} />
                        
                        {data.posSummary.byPaymentMethod && data.posSummary.byPaymentMethod.map((pm: any, i: number) => (
                            <View key={i} style={styles.row}>
                                <Text style={styles.label}>{pm.method} ({pm.count} sales):</Text>
                                <Text style={styles.value}>{Number(pm.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                            </View>
                        ))}
                        
                        <View style={[styles.row, styles.bold, { marginTop: 5, borderTopWidth: 1, paddingTop: 5 }]}>
                            <Text style={styles.label}>GRAND TOTAL SALES:</Text>
                            <Text style={styles.value}>{Number(data.posSummary.grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                        </View>
                    </View>
                )}

                <View style={styles.divider} />

                {/* Cash Movements Section */}
                {data.posSummary?.posTransactions && data.posSummary.posTransactions.length > 0 && (
                    <View style={styles.section} break>
                        <Text style={[styles.subTitle, { textAlign: 'center', textDecoration: 'none' }]}>--- CASH MOVEMENTS (AUDIT TRAIL) ---</Text>
                        <View style={[styles.row, styles.bold, { marginTop: 10, borderBottomWidth: 1, paddingBottom: 4 }]}>
                            <Text style={{ width: '20%' }}>Time</Text>
                            <Text style={{ width: '40%' }}>Type/Reason</Text>
                            <Text style={{ width: '20%', textAlign: 'center' }}>User</Text>
                            <Text style={{ width: '20%', textAlign: 'right' }}>Amount</Text>
                        </View>
                        {data.posSummary.posTransactions.map((t: any, i: number) => (
                            <View key={i} style={[styles.row, { paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: '#EEEEEE' }]}>
                                <Text style={{ width: '20%' }}>{format(new Date(t.createdAt), "HH:mm")}</Text>
                                <View style={{ width: '40%' }}>
                                    <Text style={styles.bold}>{t.type === 'DROP' ? 'REMITTANCE' : 'PAYOUT'}</Text>
                                    <Text style={{ fontSize: 8 }}>{t.reason || 'Manual'}</Text>
                                </View>
                                <Text style={{ width: '20%', textAlign: 'center', fontSize: 8 }}>{t.userName}</Text>
                                <Text style={{ width: '20%', textAlign: 'right' }}>
                                    {t.type === 'DROP' ? '+' : '-'}{Number(t.amount).toFixed(2)}
                                </Text>
                            </View>
                        ))}
                        <View style={[styles.row, styles.bold, { marginTop: 10, paddingTop: 5, borderTopWidth: 1 }]}>
                            <Text style={{ width: '80%' }}>NET CASH MOVEMENT:</Text>
                            <Text style={{ width: '20%', textAlign: 'right' }}>
                                {data.posSummary.posTransactions
                                    .reduce((acc: number, t: any) => acc + (t.type === 'DROP' ? Number(t.amount) : -Number(t.amount)), 0)
                                    .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Text>
                        </View>
                    </View>
                )}

                <View style={styles.divider} />
                <Text style={{ textAlign: 'center', marginTop: 20, fontSize: 8 }}>
                    *** End of Report ***
                </Text>
                <Text style={{ textAlign: 'center', fontSize: 8 }}>
                    Generated on {format(new Date(), "dd/MM/yyyy HH:mm:ss")}
                </Text>
            </Page>
        </Document>
    );
};
