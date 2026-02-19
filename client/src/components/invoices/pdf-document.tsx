
import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer";
import { format } from "date-fns";

const styles = StyleSheet.create({
    page: {
        padding: 20,
        fontFamily: 'Helvetica',
        fontSize: 9,
        color: '#333333',
        backgroundColor: '#FFFFFF',
    },
    verificationBlock: {
        textAlign: 'center',
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        marginBottom: 15,
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
        marginBottom: 15,
    },
    column: {
        width: '48%',
        flexDirection: 'column',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 8,
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
        marginBottom: 15,
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
        paddingVertical: 4,
    },
    // Column widths for Inclusive (Total 100%)
    colCode: { width: '10%', color: '#64748b' },
    colDesc: { width: '40%' },
    colQty: { width: '8%', textAlign: 'center' },
    colPrice: { width: '12%', textAlign: 'right' },
    colVat: { width: '15%', textAlign: 'right', fontSize: 8, color: '#64748b' },
    colTotal: { width: '15%', textAlign: 'right', fontWeight: 700 },

    // Column widths for Exclusive (Total 100%)
    colExCode: { width: '8%', color: '#64748b' },
    colExDesc: { width: '33%' },
    colExQty: { width: '8%', textAlign: 'center' },
    colExPrice: { width: '10%', textAlign: 'right' },
    colExAmt: { width: '13%', textAlign: 'right' }, // Amount (excl tax)
    colExVat: { width: '12%', textAlign: 'right', fontSize: 8 },
    colExTotal: { width: '16%', textAlign: 'right', fontWeight: 700 },

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
    invoice: any & { expiryDate?: string | Date | null };
    company: any;
    customer: any;
    qrCodeUrl?: string;
    taxTypes?: any[];
}

export const InvoicePDF = ({ invoice, company, customer, qrCodeUrl, taxTypes }: InvoicePDFProps) => {

    // Extract Verification Code logic same as frontend
    const verificationCodeRaw = invoice.qrCodeData ? invoice.qrCodeData.slice(-16) : "";
    const verificationCode = verificationCodeRaw.match(/.{1,4}/g)?.join("-") || "";

    const isExclusive = !invoice.taxInclusive;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* 0. Header: Logo (Left) - Verification (Center) - QR (Right) */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    {/* Left: Logo */}
                    <View style={{ width: '25%' }}>
                        {company?.logoUrl ? (
                            <Image src={company.logoUrl} style={{ width: 80, height: 40, objectFit: 'contain' }} />
                        ) : null}
                    </View>

                    {/* Center: Verification Text */}
                    <View style={{ width: '50%', alignItems: 'center' }}>
                        {invoice.fiscalCode && invoice.status !== 'quote' ? (
                            <>
                                <Text style={{ fontSize: 9, fontWeight: 700, color: '#1e293b', marginBottom: 1 }}>
                                    Verification Code: {verificationCode}
                                </Text>
                                <Text style={{ fontSize: 7, color: 'blue', textDecoration: 'none' }}>
                                    Verify at {company?.qrUrl || "https://receipt.zimra.org"}
                                </Text>
                            </>
                        ) : null}
                    </View>

                    {/* Right: QR Code */}
                    <View style={{ width: '25%', alignItems: 'flex-end' }}>
                        {qrCodeUrl ? (
                            <Image style={{ width: 60, height: 60 }} src={qrCodeUrl} />
                        ) : null}
                    </View>
                </View>

                {/* Title */}
                <Text style={{ textAlign: 'center', fontSize: 14, fontWeight: 'bold', marginVertical: 6, textTransform: 'uppercase' }}>
                    {invoice.status === 'quote'
                        ? "OFFICIAL QUOTATION"
                        : (invoice.transactionType === 'CreditNote'
                            ? "CREDIT NOTE"
                            : (invoice.transactionType === 'DebitNote'
                                ? "DEBIT NOTE"
                                : (invoice.fiscalCode
                                    ? (company?.vatRegistered ? "FISCAL TAX INVOICE" : "FISCAL INVOICE")
                                    : (invoice.status === 'draft' ? "DRAFT INVOICE" : "PROFORMA INVOICE"))))}
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
                            {company?.phone ? <Text>Phone: {company?.phone}</Text> : null}
                            {company?.email ? <Text>Email: {company?.email}</Text> : null}
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
                                    {customer.email ? <Text>Email: {customer.email}</Text> : null}
                                    {customer.phone ? <Text>Phone: {customer.phone}</Text> : null}
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
                                <Text style={styles.fiscalLabel}>{invoice.status === 'quote' ? "Quote No:" : "Invoice No:"}</Text>
                                <Text style={styles.fiscalValue}>
                                    {invoice.status !== 'quote' && invoice.receiptCounter !== null && invoice.receiptCounter !== undefined &&
                                        invoice.receiptGlobalNo !== null && invoice.receiptGlobalNo !== undefined
                                        ? `${invoice.receiptCounter}/${invoice.receiptGlobalNo}`
                                        : invoice.invoiceNumber}
                                </Text>
                            </View>
                            <View style={styles.fiscalRow}>
                                <Text style={styles.fiscalLabel}>{invoice.status === 'quote' ? "Reference No:" : "Customer Reference No:"}</Text>
                                <Text style={styles.fiscalValue}>{invoice.invoiceNumber}</Text>
                            </View>
                            {invoice.status !== 'quote' && (
                                <View style={styles.fiscalRow}>
                                    <Text style={styles.fiscalLabel}>Fiscal Day No:</Text>
                                    <Text style={styles.fiscalValue}>{invoice.fiscalDayNo || "N/A"}</Text>
                                </View>
                            )}
                        </View>
                        <View style={{ width: '48%' }}>
                            <View style={styles.fiscalRow}>
                                <Text style={styles.fiscalLabel}>Date:</Text>
                                <Text style={styles.fiscalValue}>{format(new Date(invoice.issueDate), "dd/MM/yyyy")}</Text>
                            </View>
                            {invoice.status === 'quote' && invoice.expiryDate && (
                                <View style={styles.fiscalRow}>
                                    <Text style={styles.fiscalLabel}>Valid Until:</Text>
                                    <Text style={styles.fiscalValue}>{format(new Date(invoice.expiryDate), "dd/MM/yyyy")}</Text>
                                </View>
                            )}
                            {invoice.status !== 'quote' && (
                                <>
                                    <View style={styles.fiscalRow}>
                                        <Text style={styles.fiscalLabel}>Fiscal Device ID:</Text>
                                        <Text style={styles.fiscalValue}>{company?.fdmsDeviceId || "N/A"}</Text>
                                    </View>
                                    <View style={styles.fiscalRow}>
                                        <Text style={styles.fiscalLabel}>Device Serial No:</Text>
                                        <Text style={styles.fiscalValue}>{company?.fdmsDeviceSerialNo || "N/A"}</Text>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                </View>

                {/* 3.1 Credit/Debit Note Reference Section - ZIMRA [24-28] */}
                {(invoice.transactionType === 'CreditNote' || invoice.transactionType === 'DebitNote') && Boolean(invoice.relatedInvoiceId) ? (
                    <View style={{ marginTop: 6, padding: 5, borderTopWidth: 1, borderTopColor: '#e2e8f0', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#f8fafc' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                            <Text style={{ fontSize: 7, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginRight: 8 }}>
                                {invoice.transactionType === 'CreditNote' ? "CREDITED INVOICE" : "DEBITED INVOICE"}
                            </Text>
                            <Text style={{ fontSize: 7, color: '#64748b' }}>|</Text>
                            <Text style={{ fontSize: 7, color: '#64748b', marginLeft: 8 }}>Original Fiscal Reference</Text>
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                            <Text style={{ fontSize: 7 }}>
                                <Text style={{ color: '#64748b' }}>Inv No: </Text>
                                <Text style={{ fontWeight: 700 }}>{invoice.relatedReceiptGlobalNo || "N/A"}</Text>
                            </Text>
                            <Text style={{ fontSize: 7 }}>
                                <Text style={{ color: '#64748b' }}>Date: </Text>
                                <Text style={{ fontWeight: 700 }}>{invoice.relatedInvoiceDate ? format(new Date(invoice.relatedInvoiceDate), "dd/MM/yyyy HH:mm") : "N/A"}</Text>
                            </Text>
                            <Text style={{ fontSize: 7 }}>
                                <Text style={{ color: '#64748b' }}>Ref: </Text>
                                <Text style={{ fontWeight: 700 }}>{invoice.relatedInvoiceNumber || "N/A"}</Text>
                            </Text>
                            <Text style={{ fontSize: 7 }}>
                                <Text style={{ color: '#64748b' }}>ID: </Text>
                                <Text style={{ fontWeight: 700 }}>{company?.fdmsDeviceId || "N/A"}</Text>
                            </Text>
                            <Text style={{ fontSize: 7 }}>
                                <Text style={{ color: '#64748b' }}>Serial: </Text>
                                <Text style={{ fontWeight: 700 }}>{company?.fdmsDeviceSerialNo || "N/A"}</Text>
                            </Text>
                        </View>
                    </View>
                ) : null}

                {/* 4. Items Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        {company?.vatRegistered ? (
                            isExclusive ? (
                                <>
                                    <Text style={[styles.colExCode, styles.headerText]}>Code</Text>
                                    <Text style={[styles.colExDesc, styles.headerText]}>Description</Text>
                                    <Text style={[styles.colExQty, styles.headerText]}>Qty</Text>
                                    <Text style={[styles.colExPrice, styles.headerText]}>Price</Text>
                                    <Text style={[styles.colExAmt, styles.headerText]}>Amount{"\n"}(excl.)</Text>
                                    <Text style={[styles.colExVat, styles.headerText]}>VAT</Text>
                                    <Text style={[styles.colExTotal, styles.headerText]}>Total{"\n"}(incl.)</Text>
                                </>
                            ) : (
                                <>
                                    <Text style={[styles.colCode, styles.headerText]}>Code</Text>
                                    <Text style={[styles.colDesc, styles.headerText]}>Description</Text>
                                    <Text style={[styles.colQty, styles.headerText]}>Qty</Text>
                                    <Text style={[styles.colPrice, styles.headerText]}>Price</Text>
                                    <Text style={[styles.colVat, styles.headerText]}>VAT</Text>
                                    <Text style={[styles.colTotal, styles.headerText]}>Total{"\n"}(incl.)</Text>
                                </>
                            )
                        ) : (
                            <>
                                <Text style={[styles.colCode, styles.headerText, { width: '15%' }]}>Code</Text>
                                <Text style={[styles.colDesc, styles.headerText, { width: '45%' }]}>Description</Text>
                                <Text style={[styles.colQty, styles.headerText, { width: '10%' }]}>Qty</Text>
                                <Text style={[styles.colPrice, styles.headerText, { width: '15%' }]}>Price</Text>
                                <Text style={[styles.colTotal, styles.headerText, { width: '15%' }]}>Total</Text>
                            </>
                        )}
                    </View>

                    {invoice.items?.map((item: any, i: number) => {
                        const lineTotal = Number(item.lineTotal); // This is usually Inclusive or Exclusive based on storage, but let's recalculate to be safe/consistent
                        const qty = Number(item.quantity);
                        const unitPrice = Number(item.unitPrice);
                        // If company is not VAT registered, effective tax rate is 0
                        const effectiveTaxRate = company?.vatRegistered ? Number(item.taxRate || 15) : 0;
                        const taxRate = effectiveTaxRate;

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
                        const matchingTax = taxTypes?.find(t => t.id == item.taxTypeId);

                        // Strict check for Exempt vs Zero Rated
                        const isExempt = matchingTax?.zimraTaxId == 1 || matchingTax?.zimraTaxId == "1" || matchingTax?.name?.toLowerCase().includes('exempt');
                        const isZeroRated = matchingTax?.zimraTaxId == 2 || matchingTax?.zimraTaxId == "2" || matchingTax?.name?.toLowerCase().includes('zero rated') || (!isExempt && taxRate === 0);

                        return (
                            <View key={i} style={styles.tableRow}>
                                {company?.vatRegistered ? (
                                    isExclusive ? (
                                        <>
                                            <Text style={styles.colExCode}>{item.product?.hsCode || "0000"}</Text>
                                            <Text style={styles.colExDesc}>{item.description}</Text>
                                            <Text style={styles.colExQty}>{qty}</Text>
                                            <Text style={styles.colExPrice}>{displayPrice.toFixed(2)}</Text>
                                            <Text style={styles.colExAmt}>{displayAmtExcl.toFixed(2)}</Text>
                                            <Text style={styles.colExVat}>{isExempt ? "-" : (isZeroRated || vatAmt === 0 ? "0.00" : vatAmt.toFixed(2))}</Text>
                                            <Text style={styles.colExTotal}>{displayTotalIncl.toFixed(2)}</Text>
                                        </>
                                    ) : (
                                        <>
                                            <Text style={styles.colCode}>{item.product?.hsCode || "0000"}</Text>
                                            <Text style={styles.colDesc}>{item.description}</Text>
                                            <Text style={styles.colQty}>{qty}</Text>
                                            <Text style={styles.colPrice}>{displayPrice.toFixed(2)}</Text>
                                            <Text style={styles.colVat}>{isExempt ? "-" : (isZeroRated || vatAmt === 0 ? "0.00" : vatAmt.toFixed(2))}</Text>
                                            <Text style={styles.colTotal}>{displayTotalIncl.toFixed(2)}</Text>
                                        </>
                                    )
                                ) : (
                                    <>
                                        <Text style={[styles.colCode, { width: '15%' }]}>{item.product?.hsCode || "0000"}</Text>
                                        <Text style={[styles.colDesc, { width: '45%' }]}>{item.description}</Text>
                                        <Text style={[styles.colQty, { width: '10%' }]}>{qty}</Text>
                                        <Text style={[styles.colPrice, { width: '15%' }]}>{displayPrice.toFixed(2)}</Text>
                                        <Text style={[styles.colTotal, { width: '15%' }]}>{displayTotalIncl.toFixed(2)}</Text>
                                    </>
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* 5. Summary & Totals */}
                <View style={styles.summarySection}>
                    {/* Tax Analysis */}
                    {company?.vatRegistered ? (
                        <View style={styles.taxTable}>
                            <Text style={[styles.sectionTitle, { marginBottom: 4, borderBottomWidth: 0 }]}>Tax Analysis</Text>
                            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e2e8f0', paddingBottom: 2 }}>
                                <Text style={{ fontSize: 8, width: '25%', color: '#64748b' }}>VAT %</Text>
                                <Text style={{ fontSize: 8, width: '25%', textAlign: 'right', color: '#64748b' }}>Net.Amt</Text>
                                <Text style={{ fontSize: 8, width: '25%', textAlign: 'right', color: '#64748b' }}>VAT</Text>
                                <Text style={{ fontSize: 8, width: '25%', textAlign: 'right', color: '#64748b' }}>Amount</Text>
                            </View>
                            {(() => {
                                // ... existing tax calculation ...
                                const taxSummary = invoice.items?.reduce((acc: any, item: any) => {
                                    const taxRate = company?.vatRegistered ? Number(item.taxRate || item.product?.taxRate || 0) : 0;
                                    const lineTotal = Number(item.lineTotal);
                                    let netAmount = 0;
                                    let taxAmount = 0;

                                    if (invoice.taxInclusive) {
                                        netAmount = lineTotal / (1 + taxRate / 100);
                                        taxAmount = lineTotal - netAmount;
                                    } else {
                                        const qty = Number(item.quantity);
                                        const unitPrice = Number(item.unitPrice);
                                        const lineExcl = qty * unitPrice; // Assuming exclusive price here for consistency if !taxInclusive
                                        taxAmount = lineExcl * (taxRate / 100);
                                        netAmount = lineExcl;
                                    }

                                    const taxTypeId = item.taxTypeId || 0;
                                    const key = `${taxRate}-${taxTypeId}`;
                                    if (!acc[key]) {
                                        acc[key] = { taxRate, taxTypeId, netAmount: 0, taxAmount: 0, totalAmount: 0 };
                                    }
                                    acc[key].netAmount += netAmount;
                                    acc[key].taxAmount += taxAmount;
                                    acc[key].totalAmount += netAmount + taxAmount;
                                    return acc;
                                }, {} as Record<string, { taxRate: number; taxTypeId: number; netAmount: number; taxAmount: number; totalAmount: number }>) || {};

                                return Object.entries(taxSummary).map(([key, data]: [string, any]) => (
                                    <View key={key} style={{ flexDirection: 'row', paddingTop: 2 }}>
                                        <Text style={{ fontSize: 8, width: '25%' }}>{(() => {
                                            const mTax = taxTypes?.find(t => t.id == data.taxTypeId);
                                            const isExempt = mTax?.zimraTaxId == 1 || mTax?.zimraTaxId == "1" || mTax?.name?.toLowerCase().includes('exempt');

                                            if (isExempt) return mTax?.name || "Exempt";
                                            return `${Number(data.taxRate).toFixed(2)}%`;
                                        })()}</Text>
                                        <Text style={{ fontSize: 8, width: '25%', textAlign: 'right' }}>{data.netAmount.toFixed(2)}</Text>
                                        <Text style={{ fontSize: 8, width: '25%', textAlign: 'right' }}>{(() => {
                                            const mTax = taxTypes?.find(t => t.id == data.taxTypeId);
                                            const isExempt = mTax?.zimraTaxId == 1 || mTax?.zimraTaxId == "1" || mTax?.name?.toLowerCase().includes('exempt');
                                            const isZeroRated = mTax?.zimraTaxId == 2 || mTax?.zimraTaxId == "2" || mTax?.name?.toLowerCase().includes('zero rated') || (!isExempt && data.taxRate === 0);

                                            return isExempt ? "-" : (isZeroRated || data.taxAmount === 0 ? "0.00" : data.taxAmount.toFixed(2));
                                        })()}</Text>
                                        <Text style={{ fontSize: 8, width: '25%', textAlign: 'right' }}>{data.totalAmount.toFixed(2)}</Text>
                                    </View>
                                ));
                            })()}
                        </View>
                    ) : (
                        <View style={styles.taxTable} />
                    )}

                    {/* Totals */}
                    <View style={styles.totalsBox}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2, paddingBottom: 2, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                            <Text style={{ color: '#64748b' }}>Number of Items</Text>
                            <Text style={{ fontWeight: 700, color: '#1e293b' }}>
                                {invoice.items?.reduce((sum: number, item: any) => sum + Number(item.quantity), 0) || 0}
                            </Text>
                        </View>

                        {company?.vatRegistered && (
                            <View style={styles.totalRow}>
                                <Text>Total (excl. tax)</Text>
                                <Text>{Number(invoice.subtotal).toFixed(2)}</Text>
                            </View>
                        )}

                        {company?.vatRegistered && (
                            <View style={styles.totalRow}>
                                <Text>Total VAT</Text>
                                <Text>{Number(invoice.taxAmount).toFixed(2)}</Text>
                            </View>
                        )}

                        {company?.vatRegistered && (
                            <View style={styles.totalRow}>
                                <Text>Invoice total, {invoice.currency}</Text>
                                <Text>{Number(invoice.total).toFixed(2)}</Text>
                            </View>
                        )}

                        <View style={styles.grandTotal}>
                            <Text>Total amount {company?.vatRegistered ? "(incl. tax)" : ""}</Text>
                            <Text>{Number(invoice.total).toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                {/* Notes Section */}
                {invoice.notes ? (
                    <View style={{ marginTop: 20, padding: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' }}>
                        <Text style={{ fontSize: 9, fontWeight: 700, color: '#1e293b', marginBottom: 4, textTransform: 'uppercase' }}>{invoice.status === 'quote' ? "Terms & Conditions" : "Notes"}</Text>
                        <Text style={{ fontSize: 9, color: '#475569' }}>{invoice.notes}</Text>
                    </View>
                ) : null}

                {/* Banking Details Section (Compact) */}
                {(company?.bankName || company?.accountNumber) ? (
                    <View style={{ marginTop: 10, padding: 6, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4 }}>
                        <Text style={{ fontSize: 8, fontWeight: 700, color: '#1e293b', textAlign: 'center', marginBottom: 2 }}>PAYMENT DETAILS</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {company.bankName ? (
                                <Text style={{ fontSize: 8, color: '#475569', marginRight: 8 }}>
                                    Bank: <Text style={{ fontWeight: 700, color: '#1e293b' }}>{company.bankName}</Text>
                                </Text>
                            ) : null}
                            {company.accountName ? (
                                <>
                                    <Text style={{ fontSize: 8, color: '#cbd5e1', marginRight: 8 }}>|</Text>
                                    <Text style={{ fontSize: 8, color: '#475569', marginRight: 8 }}>
                                        Acc Name: <Text style={{ fontWeight: 700, color: '#1e293b' }}>{company.accountName || company.name}</Text>
                                    </Text>
                                </>
                            ) : null}
                            {company.accountNumber ? (
                                <>
                                    <Text style={{ fontSize: 8, color: '#cbd5e1', marginRight: 8 }}>|</Text>
                                    <Text style={{ fontSize: 8, color: '#475569', marginRight: 8 }}>
                                        Acc No: <Text style={{ fontWeight: 700, color: '#1e293b', fontFamily: 'Courier' }}>{company.accountNumber}</Text>
                                    </Text>
                                </>
                            ) : null}
                            {company.branchCode ? (
                                <>
                                    <Text style={{ fontSize: 8, color: '#cbd5e1', marginRight: 8 }}>|</Text>
                                    <Text style={{ fontSize: 8, color: '#475569' }}>
                                        Branch: <Text style={{ fontWeight: 700, color: '#1e293b' }}>{company.branchCode}</Text>
                                    </Text>
                                </>
                            ) : null}
                        </View>
                        <Text style={{ fontSize: 6, color: '#94a3b8', textAlign: 'center', fontStyle: 'italic', marginTop: 2 }}>
                            Please use Invoice Number as payment reference
                        </Text>
                    </View>
                ) : null}

                {/* 6. Footer */}
                <View style={styles.footerSection}>
                    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 8, color: '#64748b' }}>
                            {!invoice.fiscalCode && "PROFORMA - NOT VALID FOR TAX PURPOSES"}
                        </Text>
                    </View>
                </View>

            </Page>
        </Document >
    )
};
