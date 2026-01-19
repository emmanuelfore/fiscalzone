
import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer";
import { format } from "date-fns";

// Register custom font to look more professional
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
    verificationBlock: {
        textAlign: 'center',
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        marginBottom: 20,
    },
    verificationLabel: {
        fontSize: 8,
        textTransform: 'uppercase',
        color: '#94a3b8',
        letterSpacing: 1,
        marginBottom: 2,
    },
    verificationCode: {
        fontSize: 14,
        fontWeight: 700,
        color: '#059669', // Emerald 600
        letterSpacing: 2,
        fontFamily: 'Courier',
    },
    verificationUrl: {
        fontSize: 8,
        color: '#64748b',
        marginTop: 2,
    },
    columns: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    column: {
        width: '48%',
    },
    sectionTitle: {
        fontSize: 9,
        fontWeight: 700,
        textTransform: 'uppercase',
        borderBottomWidth: 1,
        borderBottomColor: '#cbd5e1',
        paddingBottom: 4,
        marginBottom: 6,
    },
    infoText: {
        fontSize: 9,
        lineHeight: 1.4,
        color: '#475569',
    },
    bold: {
        fontWeight: 700,
        color: '#1e293b',
    },
    fiscalBox: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 10,
        marginBottom: 20,
    },
    fiscalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    fiscalLabel: {
        color: '#64748b',
        width: '40%',
    },
    fiscalValue: {
        fontWeight: 700,
        color: '#1e293b',
        flex: 1,
    },
    table: {
        width: '100%',
        marginBottom: 20,
    },
    tableHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
        paddingBottom: 4,
        marginBottom: 4,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingVertical: 6,
    },
    colHS: { width: '15%', color: '#64748b' },
    colDesc: { width: '35%' },
    colQty: { width: '10%', textAlign: 'center' },
    colPrice: { width: '15%', textAlign: 'right' },
    colVat: { width: '10%', textAlign: 'right', fontSize: 8, color: '#64748b' },
    colTotal: { width: '15%', textAlign: 'right', fontWeight: 700 },

    headerText: {
        fontSize: 8,
        fontWeight: 700,
        textTransform: 'uppercase',
    },

    summarySection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        borderTopWidth: 2,
        borderTopColor: '#1e293b',
        paddingTop: 10,
    },
    taxTable: {
        width: '45%',
    },
    totalsBox: {
        width: '45%',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    grandTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingTop: 6,
        marginTop: 4,
        fontSize: 12,
        fontWeight: 700,
    },
    footerSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 30,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingTop: 20,
    },
    footerLabel: {
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
    },
    qrCode: {
        width: 80,
        height: 80,
    }
});

interface InvoicePDFProps {
    invoice: any;
    company: any;
    customer: any;
    qrCodeUrl?: string;
}

export const InvoicePDF = ({ invoice, company, customer, qrCodeUrl }: InvoicePDFProps) => {

    // Extract Verification Code logic same as frontend
    const verificationCodeRaw = invoice.qrCodeData ? invoice.qrCodeData.slice(-16) : "";
    const verificationCode = verificationCodeRaw.match(/.{1,4}/g)?.join("-") || "";

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* 1. Verification Block */}
                {invoice.fiscalCode && (
                    <View style={styles.verificationBlock}>
                        <Text style={styles.verificationLabel}>Verification Code</Text>
                        <Text style={styles.verificationCode}>{verificationCode}</Text>
                        <Text style={styles.verificationUrl}>Verify at https://receipt.zimra.org</Text>
                    </View>
                )}

                {/* 2. Seller & Buyer */}
                <View style={styles.columns}>
                    <View style={styles.column}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            {company?.logoUrl && (
                                <Image
                                    src={company.logoUrl}
                                    style={{ width: 40, height: 40, marginRight: 10, objectFit: 'contain' }}
                                />
                            )}
                            <View>
                                <Text style={styles.sectionTitle}>Seller</Text>
                                <Text style={[styles.bold, { fontSize: 10, marginBottom: 2 }]}>{company?.tradingName || company?.name}</Text>
                            </View>
                        </View>
                        <View style={styles.infoText}>
                            <Text>{company?.address}</Text>
                            <Text>{company?.city}, {company?.country}</Text>
                            <Text style={{ marginTop: 4 }}>TIN: {company?.tin}</Text>
                            <Text>VAT No: {company?.vatNumber || "N/A"}</Text>
                            <Text>Phone: {company?.phone}</Text>
                            <Text>Email: {company?.email}</Text>
                        </View>
                    </View>
                    <View style={styles.column}>
                        <Text style={styles.sectionTitle}>Buyer</Text>
                        <View style={styles.infoText}>
                            {customer ? (
                                <>
                                    <Text style={[styles.bold, { fontSize: 10, marginBottom: 2 }]}>{customer.name}</Text>
                                    <Text>{customer.address || "No Address"}</Text>
                                    <Text>{customer.city} {customer.country}</Text>
                                    <Text style={{ marginTop: 4 }}>TIN: {customer.tin || "N/A"}</Text>
                                    <Text>VAT No: {customer.vatNumber || "N/A"}</Text>
                                    {customer.email && <Text>Email: {customer.email}</Text>}
                                </>
                            ) : (
                                <Text style={{ fontStyle: 'italic', color: '#94a3b8' }}>Walk-in Customer</Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* 3. Fiscal Info Grid */}
                <View style={styles.fiscalBox}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View style={{ width: '48%' }}>
                            <View style={styles.fiscalRow}>
                                <Text style={styles.fiscalLabel}>Invoice No:</Text>
                                <Text style={styles.fiscalValue}>{invoice.invoiceNumber}</Text>
                            </View>
                            <View style={styles.fiscalRow}>
                                <Text style={styles.fiscalLabel}>Global No:</Text>
                                <Text style={styles.fiscalValue}>{invoice.id}</Text>
                            </View>
                            <View style={styles.fiscalRow}>
                                <Text style={styles.fiscalLabel}>Fiscal Day:</Text>
                                <Text style={styles.fiscalValue}>{invoice.fiscalDayNo || "N/A"}</Text>
                            </View>
                        </View>
                        <View style={{ width: '48%' }}>
                            <View style={styles.fiscalRow}>
                                <Text style={styles.fiscalLabel}>Date:</Text>
                                <Text style={styles.fiscalValue}>{format(new Date(invoice.issueDate), "dd MMM yyyy HH:mm")}</Text>
                            </View>
                            <View style={styles.fiscalRow}>
                                <Text style={styles.fiscalLabel}>Device ID:</Text>
                                <Text style={styles.fiscalValue}>{company?.fdmsDeviceId || "N/A"}</Text>
                            </View>
                            <View style={styles.fiscalRow}>
                                <Text style={styles.fiscalLabel}>Currency:</Text>
                                <Text style={styles.fiscalValue}>{invoice.currency}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* 4. Items Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.colHS, styles.headerText]}>HS CODE</Text>
                        <Text style={[styles.colDesc, styles.headerText]}>DESCRIPTION</Text>
                        <Text style={[styles.colQty, styles.headerText]}>QTY</Text>
                        <Text style={[styles.colPrice, styles.headerText]}>PRICE</Text>
                        <Text style={[styles.colVat, styles.headerText]}>VAT</Text>
                        <Text style={[styles.colTotal, styles.headerText]}>AMOUNT</Text>
                    </View>
                    {invoice.items?.map((item: any, i: number) => {
                        const lineTotal = Number(item.quantity) * Number(item.unitPrice);
                        const taxRate = Number(item.taxRate || 15);

                        let displayPrice = Number(item.unitPrice);
                        let displayTotal = Number(item.lineTotal);
                        let vatAmt = 0;

                        if (invoice.taxInclusive) {
                            vatAmt = displayTotal - (displayTotal / (1 + taxRate / 100));
                        } else {
                            vatAmt = displayTotal * (taxRate / 100);
                            displayTotal += vatAmt;
                        }

                        return (
                            <View key={i} style={styles.tableRow}>
                                <Text style={styles.colHS}>{item.product?.hsCode || "0000"}</Text>
                                <Text style={styles.colDesc}>{item.description}</Text>
                                <Text style={styles.colQty}>{item.quantity}</Text>
                                <Text style={styles.colPrice}>{displayPrice.toFixed(2)}</Text>
                                <Text style={styles.colVat}>{vatAmt.toFixed(2)}</Text>
                                <Text style={styles.colTotal}>{displayTotal.toFixed(2)}</Text>
                            </View>
                        );
                    })}
                </View>

                {/* 5. Summary & Totals */}
                <View style={styles.summarySection}>
                    {/* Tax Analysis */}
                    <View style={styles.taxTable}>
                        <Text style={[styles.sectionTitle, { marginBottom: 4, borderBottomWidth: 0 }]}>Tax Analysis</Text>
                        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e2e8f0', paddingBottom: 2 }}>
                            <Text style={{ fontSize: 8, width: '40%', color: '#64748b' }}>Type</Text>
                            <Text style={{ fontSize: 8, width: '30%', textAlign: 'right', color: '#64748b' }}>Rate</Text>
                            <Text style={{ fontSize: 8, width: '30%', textAlign: 'right', color: '#64748b' }}>Tax Amt</Text>
                        </View>
                        <View style={{ flexDirection: 'row', paddingTop: 2 }}>
                            <Text style={{ fontSize: 8, width: '40%' }}>Standard</Text>
                            <Text style={{ fontSize: 8, width: '30%', textAlign: 'right' }}>15%</Text>
                            <Text style={{ fontSize: 8, width: '30%', textAlign: 'right' }}>{Number(invoice.taxAmount).toFixed(2)}</Text>
                        </View>
                    </View>

                    {/* Totals */}
                    <View style={styles.totalsBox}>
                        <View style={styles.totalRow}>
                            <Text>Total (Excl. Tax)</Text>
                            <Text>{Number(invoice.subtotal).toFixed(2)}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text>Total VAT</Text>
                            <Text>{Number(invoice.taxAmount).toFixed(2)}</Text>
                        </View>
                        <View style={styles.grandTotal}>
                            <Text>TOTAL {invoice.currency}</Text>
                            <Text>{Number(invoice.total).toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                {/* Banking Details Section */}
                {(company?.bankName || company?.accountNumber) && (
                    <View style={{ marginTop: 20, padding: 10, backgroundColor: '#fdfdfd', borderLeftWidth: 2, borderLeftColor: '#8b5cf6' }}>
                        <Text style={[styles.sectionTitle, { borderBottomWidth: 0, marginBottom: 4, color: '#8b5cf6' }]}>Banking Details</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                            <View style={{ width: '50%', marginBottom: 4 }}>
                                <Text style={{ fontSize: 7, color: '#94a3b8', textTransform: 'uppercase' }}>Bank</Text>
                                <Text style={{ fontSize: 9, fontWeight: 700 }}>{company.bankName || "N/A"}</Text>
                            </View>
                            <View style={{ width: '50%', marginBottom: 4 }}>
                                <Text style={{ fontSize: 7, color: '#94a3b8', textTransform: 'uppercase' }}>Account Name</Text>
                                <Text style={{ fontSize: 9, fontWeight: 700 }}>{company.accountName || company.name}</Text>
                            </View>
                            <View style={{ width: '50%' }}>
                                <Text style={{ fontSize: 7, color: '#94a3b8', textTransform: 'uppercase' }}>Account Number</Text>
                                <Text style={{ fontSize: 9, fontWeight: 700, fontFamily: 'Courier' }}>{company.accountNumber || "N/A"}</Text>
                            </View>
                            <View style={{ width: '50%' }}>
                                <Text style={{ fontSize: 7, color: '#94a3b8', textTransform: 'uppercase' }}>Branch Code</Text>
                                <Text style={{ fontSize: 9, fontWeight: 700 }}>{company.branchCode || "N/A"}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* 6. Footer */}
                <View style={styles.footerSection}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.footerLabel, { fontSize: 12, marginBottom: 2 }]}>
                            {invoice.fiscalCode ? "FISCAL TAX INVOICE" : "PROFORMA INVOICE"}
                        </Text>
                        <View style={{ flexDirection: 'column' }}>
                            <Text style={{ fontSize: 8, color: '#64748b' }}>
                                {invoice.fiscalCode ? "Issued via ZIMRA Fiscal Device" : "Not valid for tax purposes until fiscalized"}
                            </Text>
                            {invoice.fiscalCode && <Text style={{ fontSize: 8, color: '#64748b', fontFamily: 'Courier', marginTop: 2 }}>Code: {invoice.fiscalCode}</Text>}
                            {invoice.fiscalSignature && <Text style={{ fontSize: 8, color: '#64748b', fontFamily: 'Courier', marginTop: 1, width: 350 }}>Sig: {invoice.fiscalSignature.substring(0, 40)}...</Text>}
                        </View>
                    </View>
                    {qrCodeUrl && (
                        <Image style={styles.qrCode} src={qrCodeUrl} />
                    )}
                </View>

            </Page>
        </Document >
    )
};
