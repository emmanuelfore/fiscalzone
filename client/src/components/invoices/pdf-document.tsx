
import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer";
import { format } from "date-fns";

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Helvetica',
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
        flexDirection: 'column',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 10,
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
    // Column widths for Inclusive (Total 100%)
    colCode: { width: '10%', color: '#64748b' },
    colDesc: { width: '35%' },
    colQty: { width: '10%', textAlign: 'center' },
    colPrice: { width: '15%', textAlign: 'right' },
    colVat: { width: '15%', textAlign: 'right', fontSize: 8, color: '#64748b' },
    colTotal: { width: '15%', textAlign: 'right', fontWeight: 700 },

    // Column widths for Exclusive (Total 100%)
    colExCode: { width: '8%', color: '#64748b' },
    colExDesc: { width: '27%' },
    colExQty: { width: '8%', textAlign: 'center' },
    colExPrice: { width: '12%', textAlign: 'right' },
    colExAmt: { width: '15%', textAlign: 'right' }, // Amount (excl tax)
    colExVat: { width: '12%', textAlign: 'right', fontSize: 8 },
    colExTotal: { width: '18%', textAlign: 'right', fontWeight: 700 },

    headerText: {
        fontSize: 8,
        fontWeight: 700,
        textTransform: 'none', // Spec uses Mixed Case often (Title Case)
    },
    // ... rest of styles
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

    const isExclusive = !invoice.taxInclusive;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* 0. Header: Logo (Left) - Verification (Center) - QR (Right) */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    {/* Left: Logo */}
                    <View style={{ width: '25%' }}>
                        {company?.logoUrl ? (
                            <Image src={company.logoUrl} style={{ width: 100, height: 50, objectFit: 'contain' }} />
                        ) : null}
                    </View>

                    {/* Center: Verification Text */}
                    <View style={{ width: '50%', alignItems: 'center' }}>
                        {invoice.fiscalCode && (
                            <>
                                <Text style={{ fontSize: 10, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>
                                    Verification Code: {verificationCode}
                                </Text>
                                <Text style={{ fontSize: 8, color: 'blue', textDecoration: 'none' }}>
                                    Verify at {company?.qrUrl || "https://receipt.zimra.org"}
                                </Text>
                            </>
                        )}
                    </View>

                    {/* Right: QR Code */}
                    <View style={{ width: '25%', alignItems: 'flex-end' }}>
                        {qrCodeUrl && (
                            <Image style={{ width: 80, height: 80 }} src={qrCodeUrl} />
                        )}
                    </View>
                </View>

                {/* Title */}
                <Text style={{ textAlign: 'center', fontSize: 14, fontWeight: 'bold', marginVertical: 10, textTransform: 'uppercase' }}>
                    {invoice.fiscalCode ? "FISCAL TAX INVOICE" : (invoice.status === 'quote' ? "QUOTATION" : "INVOICE")}
                </Text>


                {/* 2. Header (Seller & Buyer) */}
                <View style={styles.columns}>
                    <View style={styles.column}>
                        <View style={{ marginBottom: 10 }}>
                            {/* Logo removed (moved to header) */}
                            <View>
                                <Text style={styles.sectionTitle}>SELLER</Text>
                                <Text style={[styles.bold, { fontSize: 10, marginBottom: 2 }]}>{company?.tradingName || company?.name}</Text>
                            </View>
                        </View>
                        <View style={styles.infoText}>
                            <Text>{company?.address}</Text>
                            <Text>{company?.city}, {company?.country}</Text>
                            <Text style={{ marginTop: 4 }}>TIN: {company?.tin}</Text>
                            <Text>VAT No: {company?.vatNumber || "N/A"}</Text>
                            {company?.phone && <Text>Phone: {company?.phone}</Text>}
                            {company?.email && <Text>Email: {company?.email}</Text>}
                        </View>
                    </View>
                    <View style={styles.column}>
                        <Text style={styles.sectionTitle}>BUYER</Text>
                        <View style={styles.infoText}>
                            {customer ? (
                                <>
                                    <Text style={[styles.bold, { fontSize: 10, marginBottom: 2 }]}>{customer.name}</Text>
                                    <Text>{customer.address || "No Address"}</Text>
                                    <Text>{customer.city} {customer.country}</Text>
                                    <Text style={{ marginTop: 4 }}>TIN: {customer.tin || "N/A"}</Text>
                                    <Text>VAT No: {customer.vatNumber || "N/A"}</Text>
                                    {customer.email && <Text>Email: {customer.email}</Text>}
                                    {customer.phone && <Text>Phone: {customer.phone}</Text>}
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
                                <Text style={styles.fiscalValue}>
                                    {invoice.receiptCounter !== null && invoice.receiptCounter !== undefined &&
                                        invoice.receiptGlobalNo !== null && invoice.receiptGlobalNo !== undefined
                                        ? `${invoice.receiptCounter}/${invoice.receiptGlobalNo}`
                                        : invoice.invoiceNumber}
                                </Text>
                            </View>
                            <View style={styles.fiscalRow}>
                                <Text style={styles.fiscalLabel}>Customer Reference No:</Text>
                                <Text style={styles.fiscalValue}>{invoice.invoiceNumber}</Text>
                            </View>
                            <View style={styles.fiscalRow}>
                                <Text style={styles.fiscalLabel}>Fiscal Day No:</Text>
                                <Text style={styles.fiscalValue}>{invoice.fiscalDayNo || "N/A"}</Text>
                            </View>
                        </View>
                        <View style={{ width: '48%' }}>
                            <View style={styles.fiscalRow}>
                                <Text style={styles.fiscalLabel}>Date:</Text>
                                <Text style={styles.fiscalValue}>{format(new Date(invoice.issueDate), "dd/MM/yy HH:mm")}</Text>
                            </View>
                            <View style={styles.fiscalRow}>
                                <Text style={styles.fiscalLabel}>Fiscal Device ID:</Text>
                                <Text style={styles.fiscalValue}>{company?.fdmsDeviceId || "N/A"}</Text>
                            </View>
                            <View style={styles.fiscalRow}>
                                <Text style={styles.fiscalLabel}>Device Serial No:</Text>
                                <Text style={styles.fiscalValue}>{company?.fdmsDeviceSerialNo || "N/A"}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* 4. Items Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        {isExclusive ? (
                            <>
                                <Text style={[styles.colExCode, styles.headerText]}>Code</Text>
                                <Text style={[styles.colExDesc, styles.headerText]}>Description</Text>
                                <Text style={[styles.colExQty, styles.headerText]}>Qty</Text>
                                <Text style={[styles.colExPrice, styles.headerText]}>Price</Text>
                                <Text style={[styles.colExAmt, styles.headerText]}>Amount{"\n"}(excl. tax)</Text>
                                <Text style={[styles.colExVat, styles.headerText]}>VAT</Text>
                                <Text style={[styles.colExTotal, styles.headerText]}>Total amount{"\n"}(incl. tax)</Text>
                            </>
                        ) : (
                            <>
                                <Text style={[styles.colCode, styles.headerText]}>Code</Text>
                                <Text style={[styles.colDesc, styles.headerText]}>Description</Text>
                                <Text style={[styles.colQty, styles.headerText]}>Qty</Text>
                                <Text style={[styles.colPrice, styles.headerText]}>Price</Text>
                                <Text style={[styles.colVat, styles.headerText]}>VAT</Text>
                                <Text style={[styles.colTotal, styles.headerText]}>Total amount{"\n"}(incl. tax)</Text>
                            </>
                        )}
                    </View>

                    {invoice.items?.map((item: any, i: number) => {
                        const lineTotal = Number(item.lineTotal); // This is usually Inclusive or Exclusive based on storage, but let's recalculate to be safe/consistent
                        const qty = Number(item.quantity);
                        const unitPrice = Number(item.unitPrice);
                        const taxRate = Number(item.taxRate || 15);

                        let displayPrice = unitPrice;
                        let vatAmt = 0;
                        let displayTotalIncl = 0;
                        let displayAmtExcl = 0;

                        if (isExclusive) {
                            // Exclusive Logic: Price is Excl.
                            // Amount (Excl) = Price * Qty
                            // VAT = Amount * Rate
                            // Total = Amount + VAT
                            displayAmtExcl = unitPrice * qty;
                            vatAmt = displayAmtExcl * (taxRate / 100);
                            displayTotalIncl = displayAmtExcl + vatAmt;
                        } else {
                            // Inclusive Logic: Price is Incl.
                            // Total (Incl) = Price * Qty
                            // VAT = Total - (Total / 1.15)
                            displayTotalIncl = unitPrice * qty; // item.lineTotal should match this
                            vatAmt = displayTotalIncl - (displayTotalIncl / (1 + taxRate / 100));
                        }

                        // ZIMRA Spec: "Price" column. Is it Unit Price? Yes usually.

                        return (
                            <View key={i} style={styles.tableRow}>
                                {isExclusive ? (
                                    <>
                                        <Text style={styles.colExCode}>{item.product?.hsCode || "0000"}</Text>
                                        <Text style={styles.colExDesc}>{item.description}</Text>
                                        <Text style={styles.colExQty}>{qty}</Text>
                                        <Text style={styles.colExPrice}>{displayPrice.toFixed(2)}</Text>
                                        <Text style={styles.colExAmt}>{displayAmtExcl.toFixed(2)}</Text>
                                        <Text style={styles.colExVat}>{vatAmt.toFixed(2)}</Text>
                                        <Text style={styles.colExTotal}>{displayTotalIncl.toFixed(2)}</Text>
                                    </>
                                ) : (
                                    <>
                                        <Text style={styles.colCode}>{item.product?.hsCode || "0000"}</Text>
                                        <Text style={styles.colDesc}>{item.description}</Text>
                                        <Text style={styles.colQty}>{qty}</Text>
                                        <Text style={styles.colPrice}>{displayPrice.toFixed(2)}</Text>
                                        <Text style={styles.colVat}>{vatAmt.toFixed(2)}</Text>
                                        <Text style={styles.colTotal}>{displayTotalIncl.toFixed(2)}</Text>
                                    </>
                                )}
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
                        {(isExclusive) && (
                            <View style={styles.totalRow}>
                                <Text>Total (excl. tax)</Text>
                                <Text>{Number(invoice.subtotal).toFixed(2)}</Text>
                            </View>
                        )}
                        <View style={styles.totalRow}>
                            <Text>Total VAT</Text>
                            <Text>{Number(invoice.taxAmount).toFixed(2)}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text>Invoice total, {invoice.currency}</Text>
                            <Text>{Number(invoice.total).toFixed(2)}</Text>
                        </View>
                        <View style={styles.grandTotal}>
                            <Text>Total amount{"\n"}(incl. tax)</Text>
                            <Text>{Number(invoice.total).toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                {/* Notes Section */}
                {invoice.notes && (
                    <View style={{ marginTop: 20, padding: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' }}>
                        <Text style={{ fontSize: 9, fontWeight: 700, color: '#1e293b', marginBottom: 4, textTransform: 'uppercase' }}>Notes</Text>
                        <Text style={{ fontSize: 9, color: '#475569' }}>{invoice.notes}</Text>
                    </View>
                )}

                {/* Banking Details Section (Compact) */}
                {(company?.bankName || company?.accountNumber) && (
                    <View style={{ marginTop: 10, padding: 6, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4 }}>
                        <Text style={{ fontSize: 8, fontWeight: 700, color: '#1e293b', textAlign: 'center', marginBottom: 2 }}>PAYMENT DETAILS</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {company.bankName && (
                                <Text style={{ fontSize: 8, color: '#475569', marginRight: 8 }}>
                                    Bank: <Text style={{ fontWeight: 700, color: '#1e293b' }}>{company.bankName}</Text>
                                </Text>
                            )}
                            {company.accountName && (
                                <>
                                    <Text style={{ fontSize: 8, color: '#cbd5e1', marginRight: 8 }}>|</Text>
                                    <Text style={{ fontSize: 8, color: '#475569', marginRight: 8 }}>
                                        Acc Name: <Text style={{ fontWeight: 700, color: '#1e293b' }}>{company.accountName || company.name}</Text>
                                    </Text>
                                </>
                            )}
                            {company.accountNumber && (
                                <>
                                    <Text style={{ fontSize: 8, color: '#cbd5e1', marginRight: 8 }}>|</Text>
                                    <Text style={{ fontSize: 8, color: '#475569', marginRight: 8 }}>
                                        Acc No: <Text style={{ fontWeight: 700, color: '#1e293b', fontFamily: 'Courier' }}>{company.accountNumber}</Text>
                                    </Text>
                                </>
                            )}
                            {company.branchCode && (
                                <>
                                    <Text style={{ fontSize: 8, color: '#cbd5e1', marginRight: 8 }}>|</Text>
                                    <Text style={{ fontSize: 8, color: '#475569' }}>
                                        Branch: <Text style={{ fontWeight: 700, color: '#1e293b' }}>{company.branchCode}</Text>
                                    </Text>
                                </>
                            )}
                        </View>
                        <Text style={{ fontSize: 6, color: '#94a3b8', textAlign: 'center', fontStyle: 'italic', marginTop: 2 }}>
                            Please use Invoice Number as payment reference
                        </Text>
                    </View>
                )}

                {/* 6. Footer */}
                <View style={styles.footerSection}>
                    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 8, color: '#64748b' }}>
                            {invoice.fiscalCode
                                ? "Issued via ZIMRA Fiscal Device"
                                : "PROFORMA - NOT VALID FOR TAX PURPOSES"}
                        </Text>

                        <Text style={{ fontSize: 8, color: '#64748b' }} render={({ pageNumber, totalPages }) => (
                            `${pageNumber} of ${totalPages}`
                        )} fixed />
                    </View>
                </View>

            </Page>
        </Document >
    )
};
