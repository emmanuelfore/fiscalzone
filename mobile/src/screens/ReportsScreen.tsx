import React, { useState, useMemo, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Menu, PieChart, TrendingUp, DollarSign, Calendar,
  ChevronDown, ChevronUp, Receipt, Package, Clock,
  User as UserIcon, Filter, Search, X, Printer, Download
} from "lucide-react-native";
import { StatusBar } from "expo-status-bar";
import { Modal, ScrollView } from "react-native";
import { usePosSales, useInvoiceItems, useCurrencies, useCompany } from "../hooks/usePosData";
import { apiJson } from "../lib/api";
import { printReceipt, printToBluetooth } from "../lib/printing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { NoteModal } from "../components/NoteModal";

import { PremiumColors as C } from "../ui/PremiumColors";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg.base },
  header: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: C.border.default },
  iconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.bg.hover, borderWidth: 1, borderColor: C.border.default, alignItems: "center", justifyContent: "center" },
  title: { color: C.text.primary, fontSize: 18, fontWeight: "800" },
  tabRow: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: C.bg.hover, alignItems: "center", borderWidth: 1, borderColor: C.border.default },
  tabActive: { backgroundColor: `${C.amber.primary}20`, borderColor: C.amber.primary },
  tabText: { color: C.text.secondary, fontSize: 13, fontWeight: "700" },
  tabTextActive: { color: C.amber.primary },
  filterRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  periodBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: C.bg.hover, borderWidth: 1, borderColor: C.border.default, flex: 1 },
  periodText: { color: C.text.primary, fontSize: 12, fontWeight: "600", flex: 1 },
  customDateRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  dateInput: { flex: 1, backgroundColor: C.bg.hover, color: C.text.primary, borderRadius: 8, paddingHorizontal: 10, height: 36, borderWidth: 1, borderColor: C.border.default, fontSize: 12 },
  dropdown: { backgroundColor: C.bg.card, borderRadius: 12, borderWidth: 1, borderColor: C.border.default, marginTop: 8, overflow: "hidden" },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border.default },
  dropdownItemActive: { backgroundColor: `${C.amber.primary}10` },
  dropdownText: { color: C.text.primary, fontSize: 13, fontWeight: "600" },
  statsGrid: { flexDirection: "row", gap: 10, marginVertical: 20 },
  statCard: { flex: 1, backgroundColor: C.bg.hover, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: C.border.default },
  statIconContainer: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statLabel: { color: C.text.secondary, fontSize: 9, fontWeight: "600", marginBottom: 3 },
  statValue: { color: C.text.primary, fontSize: 12, fontWeight: "800" },
  sectionTitle: { color: C.text.primary, fontSize: 15, fontWeight: "800", marginBottom: 14 },
  dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, paddingHorizontal: 4, marginTop: 4 },
  dayTitle: { color: C.amber.primary, fontSize: 13, fontWeight: "700" },
  dayTotal: { color: C.text.secondary, fontSize: 11, fontWeight: "600" },
  saleCard: { backgroundColor: C.bg.hover, borderRadius: 14, borderWidth: 1, borderColor: C.border.default, overflow: "hidden", marginBottom: 6 },
  saleCardExpanded: { borderColor: `${C.amber.primary}40` },
  saleHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12 },
  saleMainInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  saleIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(240,165,0,0.1)", alignItems: "center", justifyContent: "center" },
  saleNumber: { color: C.text.primary, fontSize: 12, fontWeight: "700" },
  saleMeta: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  saleMetaText: { color: C.text.secondary, fontSize: 10, marginLeft: 4 },
  saleRight: { alignItems: "flex-end", gap: 4 },
  saleTotal: { color: C.text.primary, fontSize: 14, fontWeight: "800" },
  saleDetails: { paddingHorizontal: 12, paddingBottom: 12 },
  detailsDivider: { height: 1, backgroundColor: C.border.default, marginBottom: 10 },
  itemsList: { marginBottom: 10 },
  itemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6, gap: 6 },
  itemInfo: { flexDirection: "row", alignItems: "flex-start", gap: 6, flex: 1 },
  itemName: { color: C.text.primary, fontSize: 12, fontWeight: "600" },
  itemUnitPrice: { color: C.text.secondary, fontSize: 10, marginTop: 1 },
  itemQty: { color: C.text.secondary, fontSize: 11, minWidth: 28, textAlign: "right", flexShrink: 0 },
  itemPrice: { color: C.text.primary, fontSize: 12, fontWeight: "700", textAlign: "right" },
  itemDiscount: { color: C.status.error, fontSize: 10, fontWeight: "600", textAlign: "right" },
  saleFooter: { flexDirection: "row", justifyContent: "space-between", paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border.default },
  paymentMethod: { color: C.text.secondary, fontSize: 10, fontStyle: "italic" },
  customerName: { color: C.text.secondary, fontSize: 10 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 40, backgroundColor: C.bg.card, borderRadius: 20, borderWidth: 1, borderColor: C.border.default, borderStyle: "dashed" },
  emptyText: { color: C.text.secondary, fontSize: 13, marginTop: 10 },
  pnlCard: { backgroundColor: C.bg.hover, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border.default, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  pnlTitle: { color: C.text.primary, fontSize: 18, fontWeight: "900", letterSpacing: -0.5 },
  pnlPeriod: { color: C.text.secondary, fontSize: 13, marginTop: 4, fontWeight: "600" },
  pnlRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.bg.card, paddingHorizontal: 16, paddingVertical: 18, borderRadius: 16, borderWidth: 1, borderColor: C.border.default, marginBottom: 10 },
  pnlRowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  pnlLabel: { color: C.text.primary, fontSize: 15, fontWeight: "700" },
  pnlValue: { fontSize: 16, fontWeight: "800" },
  pnlDivider: { height: 1, backgroundColor: C.border.default, marginVertical: 12, opacity: 0.5 },
  expenseCard: { backgroundColor: C.bg.hover, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border.default, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  expenseDesc: { color: C.text.primary, fontSize: 14, fontWeight: "600" },
  expenseAmount: { color: C.status.error, fontSize: 14, fontWeight: "800" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: C.bg.base, borderTopLeftRadius: 32, borderTopRightRadius: 32, height: "85%", padding: 24 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { color: C.text.primary, fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  closeBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.bg.hover, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border.default },
  modalScroll: { flex: 1 },
  drillRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border.default, gap: 10 },
  drillInfo: { flex: 1, flexShrink: 1 },
  drillMainText: { color: C.text.primary, fontSize: 15, fontWeight: "700" },
  drillSubText: { color: C.text.secondary, fontSize: 12, marginTop: 3 },
  drillAmount: { fontSize: 16, fontWeight: "900", flexShrink: 0 },
  subTabRow: { flexDirection: "row", gap: 10, marginVertical: 20 },
  subTab: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: C.bg.hover, alignItems: "center", borderWidth: 1, borderColor: C.border.default },
  subTabActive: { backgroundColor: `${C.amber.primary}20`, borderColor: C.amber.primary },
  subTabText: { color: C.text.secondary, fontSize: 13, fontWeight: "700" },
  subTabTextActive: { color: C.amber.primary },
  inventoryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border.default, gap: 12 },
  itemSku: { color: C.text.secondary, fontSize: 11, marginTop: 4, fontWeight: "500" },
  itemValue: { color: C.text.secondary, fontSize: 12, marginTop: 4, fontWeight: "600" },
  itemDate: { color: C.text.secondary, fontSize: 11, marginTop: 4 },
  typeBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 6 },
  typeBadgeText: { fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  itemRef: { color: C.text.secondary, fontSize: 11, marginTop: 4, fontStyle: "italic" },
  netProfitCard: { padding: 20, borderRadius: 20, borderWidth: 1.5, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 15, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  abcHeaderCard: { backgroundColor: C.bg.card, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: C.border.default },
  abcHeaderTitle: { fontSize: 20, fontWeight: '900', color: C.text.primary, marginBottom: 5 },
  abcHeaderSubtitle: { fontSize: 13, color: C.text.secondary, marginBottom: 15 },
  abcLegend: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 15 },
  abcLegendItem: { alignItems: 'center' },
  abcLegendText: { fontSize: 11, color: C.text.secondary, marginTop: 5 },
  abcBadge: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  abcBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  abcSection: { marginBottom: 25 },
  abcSectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 },
  abcBadgeLarge: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  abcBadgeTextLarge: { color: '#fff', fontSize: 16, fontWeight: '900' },
  abcSectionTitle: { fontSize: 16, fontWeight: '800', color: C.text.primary },
  abcItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border.default, marginHorizontal: 5 },
  abcItemName: { fontSize: 14, fontWeight: '600', color: C.text.primary },
  abcItemSku: { fontSize: 11, color: C.text.secondary, marginTop: 2 },
  abcItemRevenue: { fontSize: 15, fontWeight: '800', color: C.text.primary },
  abcItemShare: { fontSize: 10, color: C.text.secondary, marginTop: 2 },
  abcEmptyText: { fontSize: 13, color: C.text.secondary, textAlign: 'center', paddingVertical: 15 },
});

type Period = "Today" | "This Week" | "This Month" | "All Time" | "Custom";
type ActiveTab = "sales" | "pnl" | "inventory" | "abc" | "collections";
type InventorySubTab = "valuation" | "movements" | "purchases";

function getDateRange(period: Period, customStart?: string, customEnd?: string): { start: Date; end: Date } {
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const start = new Date(); start.setHours(0, 0, 0, 0);

  if (period === "This Week") { start.setDate(start.getDate() - start.getDay()); }
  else if (period === "This Month") { start.setDate(1); }
  else if (period === "All Time") { start.setFullYear(2020, 0, 1); }
  else if (period === "Custom" && customStart && customEnd) {
    const s = new Date(customStart); s.setHours(0, 0, 0, 0);
    const e = new Date(customEnd); e.setHours(23, 59, 59, 999);
    return { start: isNaN(s.getTime()) ? start : s, end: isNaN(e.getTime()) ? end : e };
  }
  return { start, end };
}

interface ReportsScreenProps {
  onOpenDrawer: () => void;
  companyId: number;
  userRole?: string;
  userId?: string;
  userName?: string;
  onNavigate?: (screen: any) => void;
}

interface ExpandedSaleContentProps {
  sale: any;
  currencySymbols: Record<string, string>;
  onReprint: (sale: any, items: any[]) => void;
  isPrinting: boolean;
  onCreditNote?: (sale: any, items: any[]) => void;
  onDebitNote?: (sale: any, items: any[]) => void;
  isPrintingEnabled?: boolean;
}

function ExpandedSaleContent({ sale, currencySymbols, onReprint, isPrinting, onCreditNote, onDebitNote, isPrintingEnabled }: ExpandedSaleContentProps) {
  const { data: items, isLoading } = useInvoiceItems(sale.id);
  const canIssueNote = sale.status === "issued" || sale.status === "paid";
  return (
    <View style={styles.saleDetails}>
      <View style={styles.detailsDivider} />
      {isLoading ? (
        <ActivityIndicator size="small" color={C.amber.primary} style={{ marginVertical: 10 }} />
      ) : (
        <InvoiceItemRow
          invoiceId={sale.id}
          currencyCode={sale.currency}
          exchangeRate={sale.exchangeRate}
          symbols={currencySymbols}
          items={items || []}
        />
      )}
      <View style={[styles.saleFooter, { justifyContent: "space-between", flexWrap: "wrap", gap: 6 }]}>
        <View>
          <Text style={styles.paymentMethod}>Paid via {sale.paymentMethod || "CASH"}</Text>
          {sale.customerName && <Text style={styles.customerName}>Customer: {sale.customerName}</Text>}
        </View>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
          {canIssueNote && onCreditNote && (
            <TouchableOpacity
              onPress={() => onCreditNote(sale, items || [])}
              style={{
                flexDirection: "row", alignItems: "center", gap: 4,
                paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8,
                backgroundColor: "rgba(240,165,0,0.1)", borderWidth: 1, borderColor: "rgba(240,165,0,0.3)"
              }}>
              <Text style={{ color: "#f0a500", fontSize: 10, fontWeight: "700" }}>CN</Text>
            </TouchableOpacity>
          )}
          {canIssueNote && onDebitNote && (
            <TouchableOpacity
              onPress={() => onDebitNote(sale, items || [])}
              style={{
                flexDirection: "row", alignItems: "center", gap: 4,
                paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8,
                backgroundColor: "rgba(167,139,250,0.1)", borderWidth: 1, borderColor: "rgba(167,139,250,0.3)"
              }}>
              <Text style={{ color: "#a78bfa", fontSize: 10, fontWeight: "700" }}>DN</Text>
            </TouchableOpacity>
          )}
          {isPrintingEnabled && (
            <TouchableOpacity
              onPress={() => onReprint(sale, items || [])}
              disabled={isPrinting || isLoading}
              style={{
                flexDirection: "row", alignItems: "center", gap: 5,
                paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                backgroundColor: "rgba(240,165,0,0.1)", borderWidth: 1, borderColor: "rgba(240,165,0,0.3)"
              }}>
              <Printer size={13} color="#f0a500" />
              <Text style={{ color: "#f0a500", fontSize: 11, fontWeight: "700" }}>Reprint</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

function InvoiceItemRow({ invoiceId, currencyCode, exchangeRate, symbols, items }: {
  invoiceId: number;
  currencyCode?: string;
  exchangeRate?: string;
  symbols?: Record<string, string>;
  items: any[];
}) {
  const rate = Number(exchangeRate || 1);
  const symbol = symbols?.[currencyCode || "USD"] || (currencyCode === "USD" ? "$" : currencyCode || "$");

  if (!items || items.length === 0) return <Text style={{ color: C.text.secondary, fontSize: 12, paddingVertical: 8 }}>No items found.</Text>;

  return (
    <View style={styles.itemsList}>
      {items.map((item: any, idx: number) => {
        const unitPrice = Number(item.unitPrice || 0) * rate;
        const lineTotal = Number(item.lineTotal || 0) * rate;
        const discount = Number(item.discountAmount || 0) * rate;
        const qty = parseFloat(item.quantity || "0");
        return (
          <View key={idx} style={styles.itemRow}>
            {/* Left: name + unit price */}
            <View style={styles.itemInfo}>
              <Package size={13} color={C.text.secondary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={1}>{item.description || item.product?.name || "Product"}</Text>
                <Text style={styles.itemUnitPrice}>{symbol}{unitPrice.toFixed(2)} / unit</Text>
              </View>
            </View>
            {/* Middle: qty */}
            <Text style={styles.itemQty} numberOfLines={1}>x{qty}</Text>
            {/* Right: line total + discount badge */}
            <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
              <Text style={styles.itemPrice}>{symbol}{lineTotal.toFixed(2)}</Text>
              {discount > 0 && (
                <Text style={styles.itemDiscount}>-{symbol}{discount.toFixed(2)}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function InventoryContent({ tab, companyId, start, end, symbol, onNavigate }: { tab: InventorySubTab; companyId: number; start: Date; end: Date; symbol: string; onNavigate?: (screen: any) => void }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    let endpoint = "";
    if (tab === "valuation") endpoint = `/api/reports/inventory/stock-on-hand/${companyId}`;
    else if (tab === "movements") endpoint = `/api/reports/inventory/movements/${companyId}?startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
    else if (tab === "purchases") endpoint = `/api/reports/inventory/purchases/${companyId}?startDate=${start.toISOString()}&endDate=${end.toISOString()}`;

    apiJson<any[]>(endpoint)
      .then(res => { setData(res); setLoading(false); })
      .catch(() => { setData([]); setLoading(false); });
  }, [tab, companyId, start, end]);

  if (loading) return <ActivityIndicator color={C.amber.primary} style={{ marginTop: 40 }} />;

  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Package size={40} color={C.text.secondary} strokeWidth={1} />
        <Text style={styles.emptyText}>No inventory records found.</Text>
      </View>
    );
  }

  if (tab === "valuation") {
    const totalValuation = data.reduce((sum, item) => sum + Number(item.totalValue || 0), 0);
    return (
      <View style={{ marginTop: 10, paddingBottom: 20 }}>
        {/* Total Valuation Card with Stock Take Button */}
        <View style={[styles.netProfitCard, { backgroundColor: `${C.amber.primary}12`, borderColor: C.amber.primary, marginBottom: 20 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View>
              <Text style={{ color: C.text.secondary, fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginBottom: 6 }}>Total Inventory Value</Text>
              <Text style={{ color: C.text.primary, fontSize: 28, fontWeight: "900" }}>
                {symbol}{totalValuation.toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => onNavigate?.("stocktake")}
              style={{
                backgroundColor: C.amber.primary,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                flexDirection: "row",
                alignItems: "center",
                gap: 6
              }}
            >
              <Package size={16} color="#000" />
              <Text style={{ color: "#000", fontWeight: "800", fontSize: 12 }}>Stock Take</Text>
            </TouchableOpacity>
          </View>
        </View>

        {data.map((item, idx) => {
          const isLowStock = Number(item.stockLevel) <= 10;
          const isOutOfStock = Number(item.stockLevel) <= 0;
          return (
            <View key={idx} style={styles.inventoryRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemSku}>{item.sku || "No SKU"} • {item.category || "General"}</Text>
                <Text style={{ color: C.text.secondary, fontSize: 10, marginTop: 2 }}>Cost: {symbol}{Number(item.unitCost).toFixed(2)}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  {isLowStock && (
                    <View style={{
                      width: 8, height: 8, borderRadius: 4,
                      backgroundColor: isOutOfStock ? C.status.error : C.status.warning
                    }} />
                  )}
                  <Text style={[styles.itemPrice, { color: isOutOfStock ? C.status.error : isLowStock ? "#fbbf24" : C.text.primary }]}>
                    {Number(item.stockLevel).toFixed(0)} units
                  </Text>
                </View>
                <Text style={styles.itemValue}>{symbol}{Number(item.totalValue).toFixed(2)}</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  if (tab === "movements") {
    return (
      <View style={{ marginTop: 10, paddingBottom: 20 }}>
        {data.map((item, idx) => (
          <View key={idx} style={styles.inventoryRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.productName}</Text>
              <Text style={styles.itemDate}>
                {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <View style={[styles.typeBadge, { backgroundColor: item.type === "STOCK_IN" ? `${C.status.success}15` : item.type === "ADJUSTMENT" ? `${C.amber.primary}15` : `${C.status.error}15` }]}>
                <Text style={[styles.typeBadgeText, { color: item.type === "STOCK_IN" ? C.status.success : item.type === "ADJUSTMENT" ? C.amber.primary : C.status.error }]}>
                  {item.type === "STOCK_IN" ? "PURCHASE" : item.type === "STOCK_OUT" ? "SALE" : "ADJUST"}
                </Text>
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.itemQty, { color: item.type === "STOCK_IN" ? C.status.success : item.type === "STOCK_OUT" ? C.status.error : C.amber.primary, fontSize: 16, fontWeight: "900" }]}>
                {item.type === "STOCK_OUT" ? "−" : "+"}{Math.abs(Number(item.quantity)).toFixed(0)}
              </Text>
              <Text style={styles.itemRef} numberOfLines={1}>{item.reference || (item.notes || "System")}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (tab === "purchases") {
    return (
      <View style={{ marginTop: 10, paddingBottom: 20 }}>
        {data.map((item, idx) => (
          <View key={idx} style={styles.inventoryRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName} numberOfLines={1}>{item.supplierName || "Direct Vendor"}</Text>
              <Text style={styles.itemSku}>{item.productName}</Text>
              <Text style={styles.itemDate}>{new Date(item.date).toLocaleDateString()}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.itemPrice, { color: C.status.success, fontSize: 16, fontWeight: "900" }]}>{symbol}{Number(item.totalCost).toFixed(2)}</Text>
              <Text style={styles.itemQty}>{Number(item.quantity).toFixed(0)} units</Text>
            </View>
          </View>
        ))}
      </View>
    );
  }

  return null;
}

export function ReportsScreen({ onOpenDrawer, companyId, userRole = "member", userId, userName, onNavigate }: ReportsScreenProps) {
  const insets = useSafeAreaInsets();
  const isCashier = userRole.toLowerCase() === "cashier" || userRole.toLowerCase() === "member";
  const { data: company } = useCompany(companyId);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printerConfig, setPrinterConfig] = useState<any>({
    enabled: true,
    macAddress: "",
    targetPrinter: "",
    paperWidth: 58,
    terminalId: "POS-M01",
    autoPrint: true,
  });
  const [isOnline, setIsOnline] = useState(true);
  const [creditThreshold, setCreditThreshold] = useState(50);
  const [noteModal, setNoteModal] = useState<{
    visible: boolean;
    noteType: "credit" | "debit";
    sale: any;
    items: any[];
  } | null>(null);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(!!state.isConnected && !!state.isInternetReachable);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(`credit_threshold_${companyId}`).then((val) => {
      if (val) setCreditThreshold(parseFloat(val) || 50);
    });
  }, [companyId]);

  useEffect(() => {
    AsyncStorage.getItem(`printer_config_${userId}`).then(val => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          setPrinterConfig((prev: any) => ({ ...prev, ...parsed }));
        } catch (_) { }
      }
    });
  }, [userId]);

  const handleReprint = async (sale: any, items: any[]) => {
    if (!company) return;
    setIsPrinting(true);
    const ticketData = {
      invoice: sale,
      company,
      items,
      currencySymbol: currencySymbols[sale.currency || "USD"] || "$",
      cashierName: sale.cashierName,
      paidAmount: Number(sale.total || 0),
      paperWidth: printerConfig.paperWidth,
      terminalId: printerConfig.terminalId,
    };
    try {
      if (printerConfig.macAddress) {
        await printToBluetooth(ticketData, printerConfig.macAddress);
      } else {
        await printReceipt(ticketData, printerConfig.targetPrinter || undefined);
      }
    } catch (e: any) {
      if (e.message !== "Print preview was cancelled.") {
        Alert.alert("Print Error", e.message || "Could not print receipt");
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const [period, setPeriod] = useState<Period>("Today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("sales");
  const [activeInvTab, setActiveInvTab] = useState<InventorySubTab>("valuation");
  const [cashierFilter, setCashierFilter] = useState<string>(isCashier ? (userName || "me") : "all");
  const [showCashierPicker, setShowCashierPicker] = useState(false);

  // Drill-down State
  const [drillDownType, setDrillDownType] = useState<"Revenue" | "COGS" | "Expenses" | null>(null);
  const [showDrillDown, setShowDrillDown] = useState(false);

  // Date filter: hidden on valuation sub-tab and pnl (pnl is always all-time)
  const showDateFilter = activeTab === "sales" || (activeTab === "inventory" && activeInvTab !== "valuation") || activeTab === "abc";
  // Cashier filter only applies to sales
  const showCashierFilter = !isCashier && activeTab === "sales";

  // Close pickers when switching to a tab/subtab where they don't apply
  useEffect(() => {
    if (!showDateFilter) setShowPeriodPicker(false);
    if (!showCashierFilter) setShowCashierPicker(false);
    
    // Default to "All Time" for ABC and Movements as per user request
    if (activeTab === "abc" || (activeTab === "inventory" && activeInvTab === "movements")) {
      setPeriod("All Time");
    }
  }, [showDateFilter, showCashierFilter, activeTab, activeInvTab]);

  const { start, end } = useMemo(() => getDateRange(period, customStart, customEnd), [period, customStart, customEnd]);
  const { data: sales, isLoading: loadingSales } = usePosSales(companyId, start, end);
  const { data: currencies } = useCurrencies(companyId);

  const { data: expandedSaleItems, isLoading: loadingExpandedSaleItems } = useInvoiceItems(expandedSaleId);

  const currencySymbols = useMemo(() => {
    const map: Record<string, string> = { "USD": "$" };
    currencies?.forEach((c: any) => { map[c.code] = c.symbol; });
    return map;
  }, [currencies]);

  const baseCurrency = useMemo(() => {
    return currencies?.find((c: any) => c.isBase) || { code: "USD", symbol: "$" };
  }, [currencies]);
  const baseSymbol = baseCurrency.symbol;

  const [financialData, setFinancialData] = useState<any>(null);
  const [loadingFinancial, setLoadingFinancial] = useState(false);

  const [abcData, setAbcData] = useState<any[] | null>(null);
  const [loadingAbc, setLoadingAbc] = useState(false);

  const cashierIdMap = useMemo(() => {
    const map: Record<string, string> = {};
    sales?.forEach((s: any) => {
      if (s.cashierName && s.createdBy) {
        map[s.cashierName] = s.createdBy;
      }
    });
    return map;
  }, [sales]);

  const selectedCashierId = isCashier ? userId : (cashierFilter === "all" ? undefined : cashierIdMap[cashierFilter]);

  useEffect(() => {
    setLoadingFinancial(true);
    // PnL always shows all-time — ignore the period picker
    const allTimeStart = new Date(2020, 0, 1);
    const allTimeEnd = new Date(); allTimeEnd.setHours(23, 59, 59, 999);
    const startStr = allTimeStart.toISOString();
    const endStr = allTimeEnd.toISOString();
    let url = `/api/companies/${companyId}/reports/financial-summary?from=${startStr}&to=${endStr}&drillDown=true`;

    apiJson<any>(url)
      .then((data) => { setFinancialData(data); setLoadingFinancial(false); })
      .catch(() => { setFinancialData(null); setLoadingFinancial(false); });
  }, [companyId]);

  useEffect(() => {
    if (activeTab !== "abc") return;
    setLoadingAbc(true);
    const startStr = start.toISOString();
    const endStr = end.toISOString();
    apiJson<any[]>(`/api/companies/${companyId}/reports/abc-analysis?from=${startStr}&to=${endStr}`)
      .then(data => { setAbcData(data); setLoadingAbc(false); })
      .catch(() => { setAbcData(null); setLoadingAbc(false); });
  }, [companyId, activeTab, start, end]);

  const cashiers = useMemo(() => {
    if (!sales) return [];
    const names = new Set(sales.map((s: any) => s.cashierName || "Unknown"));
    return Array.from(names);
  }, [sales]);

  const filteredSales = useMemo(() => {
    if (!sales) return [];
    if (isCashier) return sales; // Already filtered by backend
    if (cashierFilter === "all") return sales;
    return sales.filter((s: any) => (s.cashierName || "Unknown") === cashierFilter);
  }, [sales, cashierFilter, isCashier]);

  const stats = useMemo(() => {
    const total = filteredSales.reduce((sum: number, s: any) => sum + Number(s.total || 0), 0);
    const count = filteredSales.length;
    const avg = count > 0 ? total / count : 0;
    return { total, count, avg };
  }, [filteredSales]);

  const dailyGroups = useMemo(() => {
    const groups: Record<string, { sales: any[]; total: number; currencyTotals: Record<string, number> }> = {};
    filteredSales.forEach((sale: any) => {
      const d = new Date(sale.issueDate || sale.createdAt);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!groups[dateKey]) groups[dateKey] = { sales: [], total: 0, currencyTotals: {} };
      groups[dateKey].sales.push(sale);
      groups[dateKey].total += Number(sale.total || 0);

      const cur = sale.currency || "USD";
      const rate = Number(sale.exchangeRate || 1);
      const localTotal = Number(sale.total || 0) * rate;
      groups[dateKey].currencyTotals[cur] = (groups[dateKey].currencyTotals[cur] || 0) + localTotal;
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredSales]);

  const periods: Period[] = ["Today", "This Week", "This Month", "All Time", "Custom"];

  const renderInventoryTab = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.subTabRow}>
        {(["valuation", "movements", "purchases"] as const).map((itab) => (
          <TouchableOpacity
            key={itab}
            style={[styles.subTab, activeInvTab === itab && styles.subTabActive]}
            onPress={() => setActiveInvTab(itab)}
          >
            <Text style={[styles.subTabText, activeInvTab === itab && styles.subTabTextActive]}>
              {itab.charAt(0).toUpperCase() + itab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <InventoryContent tab={activeInvTab} companyId={companyId} start={start} end={end} symbol={baseSymbol} onNavigate={onNavigate} />
    </View>
  );

  const renderAbcTab = () => {
    if (loadingAbc) return <ActivityIndicator style={{ marginTop: 50 }} color={C.amber.primary} />;
    if (!abcData?.length) {
      return (
        <View style={{ alignItems: 'center', marginTop: 50 }}>
          <Text style={{ color: C.text.secondary }}>No sales data for ABC analysis in this period.</Text>
        </View>
      );
    }

    const categories = {
      A: abcData.filter(p => p.category === "A"),
      B: abcData.filter(p => p.category === "B"),
      C: abcData.filter(p => p.category === "C"),
    };

    return (
      <View style={{ flex: 1, padding: 15 }}>
        <View style={styles.abcHeaderCard}>
          <Text style={styles.abcHeaderTitle}>Sales ABC Analysis</Text>
          <Text style={styles.abcHeaderSubtitle}>Categorized by revenue contribution ({baseSymbol})</Text>
          
          <View style={styles.abcLegend}>
            <View style={styles.abcLegendItem}>
              <View style={[styles.abcBadge, { backgroundColor: '#4CAF50' }]}><Text style={styles.abcBadgeText}>A</Text></View>
              <Text style={styles.abcLegendText}>Top 80%</Text>
            </View>
            <View style={styles.abcLegendItem}>
              <View style={[styles.abcBadge, { backgroundColor: '#FF9800' }]}><Text style={styles.abcBadgeText}>B</Text></View>
              <Text style={styles.abcLegendText}>Next 15%</Text>
            </View>
            <View style={styles.abcLegendItem}>
              <View style={[styles.abcBadge, { backgroundColor: '#F44336' }]}><Text style={styles.abcBadgeText}>C</Text></View>
              <Text style={styles.abcLegendText}>Bottom 5%</Text>
            </View>
          </View>
        </View>

        {(['A', 'B', 'C'] as const).map(cat => (
          <View key={cat} style={styles.abcSection}>
            <View style={styles.abcSectionHeader}>
              <View style={[styles.abcBadgeLarge, { backgroundColor: cat === 'A' ? '#4CAF50' : cat === 'B' ? '#FF9800' : '#F44336' }]}>
                <Text style={styles.abcBadgeTextLarge}>{cat}</Text>
              </View>
              <Text style={styles.abcSectionTitle}>Class {cat} Items ({categories[cat].length})</Text>
            </View>
            
            {categories[cat].map((item, idx) => (
              <View key={item.productId || idx} style={styles.abcItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.abcItemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.abcItemSku}>{item.sku}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.abcItemRevenue}>{baseSymbol}{item.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                  <Text style={styles.abcItemShare}>{item.share.toFixed(1)}% of total</Text>
                </View>
              </View>
            ))}
            {categories[cat].length === 0 && (
              <Text style={styles.abcEmptyText}>No items in this category</Text>
            )}
          </View>
        ))}
        <View style={{ height: 100 }} />
      </View>
    );
  };

  const renderCollectionsTab = () => {
    const [collections, setCollections] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      setLoading(true);
      const startStr = start.toISOString();
      const endStr = end.toISOString();
      apiJson<any[]>(`/api/companies/${companyId}/reports/cash-collections?from=${startStr}&to=${endStr}`)
        .then(data => { setCollections(data); setLoading(false); })
        .catch(() => { setCollections([]); setLoading(false); });
    }, [companyId, start, end]);

    if (loading) return <ActivityIndicator style={{ marginTop: 50 }} color={C.amber.primary} />;

    return (
      <View style={{ flex: 1, padding: 16 }}>
        <View style={[styles.abcHeaderCard, { marginBottom: 16 }]}>
          <Text style={styles.abcHeaderTitle}>Cash Collections</Text>
          <Text style={styles.abcHeaderSubtitle}>Money removed from the till</Text>
          <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: C.amber.primary }} />
            <Text style={{ color: C.text.primary, fontSize: 13, fontWeight: '700' }}>
              Total: {baseSymbol}{collections.reduce((sum, c) => sum + Number(c.amount), 0).toFixed(2)}
            </Text>
          </View>
        </View>

        {collections.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Download size={40} color={C.text.secondary} strokeWidth={1} />
            <Text style={styles.emptyText}>No collections in this period.</Text>
          </View>
        ) : (
          collections.map((item, idx) => (
            <View key={item.id || idx} style={styles.inventoryRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.cashierName || "System"}</Text>
                <Text style={styles.itemDate}>
                  {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={[styles.itemRef, { marginTop: 4 }]} numberOfLines={1}>Reason: {item.reason || "N/A"}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: C.amber.primary, fontSize: 18, fontWeight: '900' }}>
                  {baseSymbol}{Number(item.amount).toFixed(2)}
                </Text>
                <Text style={{ color: C.text.secondary, fontSize: 10, marginTop: 4 }}>Shift #{item.shiftId}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, activeTab === "sales" && styles.tabActive]} onPress={() => setActiveTab("sales")}>
          <Text style={[styles.tabText, activeTab === "sales" && styles.tabTextActive]}>Sales</Text>
        </TouchableOpacity>
        {!isCashier && (
          <TouchableOpacity style={[styles.tab, activeTab === "pnl" && styles.tabActive]} onPress={() => setActiveTab("pnl")}>
            <Text style={[styles.tabText, activeTab === "pnl" && styles.tabTextActive]}>PnL</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.tab, activeTab === "inventory" && styles.tabActive]} onPress={() => setActiveTab("inventory")}>
          <Text style={[styles.tabText, activeTab === "inventory" && styles.tabTextActive]}>Stock</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === "abc" && styles.tabActive]} onPress={() => setActiveTab("abc")}>
          <Text style={[styles.tabText, activeTab === "abc" && styles.tabTextActive]}>ABC</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === "collections" && styles.tabActive]} onPress={() => setActiveTab("collections")}>
          <Text style={[styles.tabText, activeTab === "collections" && styles.tabTextActive]}>Collect</Text>
        </TouchableOpacity>
      </View>

      <View style={{ padding: 16 }}>
        {/* Filters Row — date hidden on stock sub-tab, cashier only on sales/pnl */}
        {(showDateFilter || showCashierFilter) && (
          <View style={styles.filterRow}>
            {showDateFilter && (
              <TouchableOpacity
                style={styles.periodBtn}
                onPress={() => { setShowPeriodPicker(!showPeriodPicker); setShowCashierPicker(false); }}
              >
                <Calendar size={14} color={C.text.secondary} />
                <Text style={styles.periodText}>{period}</Text>
                <ChevronDown size={14} color={C.text.secondary} />
              </TouchableOpacity>
            )}
            {showCashierFilter && (
              <TouchableOpacity
                style={styles.periodBtn}
                onPress={() => { setShowCashierPicker(!showCashierPicker); setShowPeriodPicker(false); }}
              >
                <Filter size={14} color={C.text.secondary} />
                <Text style={styles.periodText} numberOfLines={1}>
                  {cashierFilter === "all" ? "All Cashiers" : cashierFilter}
                </Text>
                <ChevronDown size={14} color={C.text.secondary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {showPeriodPicker && showDateFilter && (
          <View style={styles.dropdown}>
            {periods.map((p) => (
              <TouchableOpacity key={p} style={[styles.dropdownItem, period === p && styles.dropdownItemActive]} onPress={() => { setPeriod(p); setShowPeriodPicker(false); }}>
                <Text style={[styles.dropdownText, period === p && { color: C.amber.primary }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {period === "Custom" && showDateFilter && (
          <View style={styles.customDateRow}>
            <TextInput style={styles.dateInput} placeholder="YYYY-MM-DD" placeholderTextColor={C.text.secondary} value={customStart} onChangeText={setCustomStart} />
            <Text style={{ color: C.text.secondary }}>to</Text>
            <TextInput style={styles.dateInput} placeholder="YYYY-MM-DD" placeholderTextColor={C.text.secondary} value={customEnd} onChangeText={setCustomEnd} />
          </View>
        )}

        {showCashierPicker && showCashierFilter && (
          <View style={styles.dropdown}>
            <TouchableOpacity style={[styles.dropdownItem, cashierFilter === "all" && styles.dropdownItemActive]} onPress={() => { setCashierFilter("all"); setShowCashierPicker(false); }}>
              <Text style={[styles.dropdownText, cashierFilter === "all" && { color: C.amber.primary }]}>All Cashiers</Text>
            </TouchableOpacity>
            {cashiers.map((c) => (
              <TouchableOpacity key={c} style={[styles.dropdownItem, cashierFilter === c && styles.dropdownItemActive]} onPress={() => { setCashierFilter(c); setShowCashierPicker(false); }}>
                <Text style={[styles.dropdownText, cashierFilter === c && { color: C.amber.primary }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === "sales" && (
          <>
            <View style={styles.statsGrid}>
              {[
                { label: "Total Sales", value: `${baseSymbol}${stats.total.toFixed(2)}`, icon: DollarSign, color: C.amber.primary },
                { label: "Transactions", value: stats.count.toString(), icon: TrendingUp, color: C.status.success },
                { label: "Avg. Sale", value: `${baseSymbol}${stats.avg.toFixed(2)}`, icon: PieChart, color: "#3b9eff" },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <View key={i} style={styles.statCard}>
                    <View style={[styles.statIconContainer, { backgroundColor: `${stat.color}15` }]}>
                      <Icon size={18} color={stat.color} />
                    </View>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                    <Text style={styles.statValue}>{stat.value}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.sectionTitle}>Daily Summary</Text>
            {loadingSales && <ActivityIndicator color={C.amber.primary} style={{ marginVertical: 20 }} />}
            {!loadingSales && dailyGroups.length === 0 && (
              <View style={styles.emptyContainer}>
                <Receipt size={40} color={C.text.secondary} strokeWidth={1} />
                <Text style={styles.emptyText}>No sales for this period.</Text>
              </View>
            )}
          </>
        )}

        {activeTab === "inventory" && renderInventoryTab()}
        {activeTab === "abc" && renderAbcTab()}
        {activeTab === "collections" && renderCollectionsTab()}

        {activeTab === "pnl" && (
          <View>
            {loadingFinancial ? (
              <ActivityIndicator color={C.amber.primary} style={{ marginTop: 40 }} />
            ) : !financialData ? (
              <View style={styles.emptyContainer}>
                <TrendingUp size={40} color={C.text.secondary} strokeWidth={1} />
                <Text style={styles.emptyText}>Unable to load financial data.</Text>
              </View>
            ) : (
              <>
                <View style={[styles.netProfitCard, {
                  backgroundColor: financialData.netProfit >= 0 ? `${C.status.success}12` : `${C.status.error}12`,
                  borderColor: financialData.netProfit >= 0 ? C.status.success : C.status.error
                }]}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View>
                      <Text style={{ color: C.text.secondary, fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginBottom: 6 }}>Net Profit</Text>
                      <Text style={{
                        color: financialData.netProfit >= 0 ? C.status.success : C.status.error,
                        fontSize: 32, fontWeight: "900", letterSpacing: -1
                      }}>
                        {baseSymbol}{Number(financialData.netProfit || 0).toFixed(2)}
                      </Text>
                    </View>
                    <View style={{
                      width: 54, height: 54, borderRadius: 18,
                      backgroundColor: financialData.netProfit >= 0 ? `${C.status.success}20` : `${C.status.error}20`,
                      alignItems: "center", justifyContent: "center"
                    }}>
                      <TrendingUp size={28} color={financialData.netProfit >= 0 ? C.status.success : C.status.error} />
                    </View>
                  </View>
                </View>

                <View style={{ gap: 10 }}>
                  {[
                    { label: "Total Revenue", value: financialData.revenue, color: C.text.primary, icon: DollarSign, type: "Revenue" },
                    { label: "Cost of Goods", value: financialData.cogs, color: C.status.error, icon: Package, type: "COGS" },
                    { label: "Total Expenses", value: financialData.expenses, color: C.status.error, icon: Receipt, type: "Expenses" },
                  ].map((row, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.pnlRow}
                      onPress={() => {
                        if (row.type) {
                          setDrillDownType(row.type as any);
                          setShowDrillDown(true);
                        }
                      }}
                    >
                      <View style={styles.pnlRowLeft}>
                        <View style={{
                          width: 36, height: 36, borderRadius: 10,
                          backgroundColor: `${row.color === C.text.primary ? C.amber.primary : row.color}15`,
                          alignItems: "center", justifyContent: "center"
                        }}>
                          <row.icon size={18} color={row.color === C.text.primary ? C.amber.primary : row.color} />
                        </View>
                        <Text style={styles.pnlLabel}>{row.label}</Text>
                      </View>
                      <Text style={[styles.pnlValue, { color: row.color }]}>
                        {baseSymbol}{Number(row.value || 0).toFixed(2)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {financialData.expenseBreakdown && financialData.expenseBreakdown.length > 0 && (
                  <View style={{ marginTop: 24, paddingBottom: 20 }}>
                    <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Expense Categories</Text>
                    {financialData.expenseBreakdown.map((exp: any, idx: number) => (
                      <View key={idx} style={styles.expenseCard}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.status.error }} />
                          <Text style={styles.expenseDesc}>{exp.category || "Other"}</Text>
                        </View>
                        <Text style={styles.expenseAmount}>{baseSymbol}{Number(exp.amount || 0).toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: [string, any] }) => {
    const [dateKey, group] = item;
    if (activeTab !== "sales") return null;
    return (
      <View style={{ paddingHorizontal: 16 }}>
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>{dateKey}</Text>
          <View style={{ alignItems: "flex-end" }}>
            {Object.entries(group.currencyTotals).map(([cur, amt]) => (
              <Text key={cur} style={[styles.dayTotal, cur !== "USD" && { color: C.amber.primary }]}>
                {currencySymbols[cur] || (cur === "USD" ? "$" : cur)} {Number(amt).toFixed(2)}
              </Text>
            ))}
            <Text style={{ color: C.text.secondary, fontSize: 8, marginTop: 1 }}>{group.sales.length} sales</Text>
          </View>
        </View>
        {group.sales.map((sale: any) => {
          const isExpanded = expandedSaleId === sale.id;
          const d = new Date(sale.issueDate || sale.createdAt);
          const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          return (
            <View key={sale.id} style={[styles.saleCard, isExpanded && styles.saleCardExpanded]}>
              <TouchableOpacity onPress={() => setExpandedSaleId(isExpanded ? null : sale.id)} style={styles.saleHeader}>
                <View style={styles.saleMainInfo}>
                  <View style={styles.saleIcon}><Receipt size={16} color={C.amber.primary} /></View>
                  <View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={styles.saleNumber}>{sale.invoiceNumber || `#${sale.id}`}</Text>
                      {sale.transactionType === "CreditNote" && (
                        <View style={{ backgroundColor: "rgba(240,165,0,0.15)", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                          <Text style={{ color: "#f0a500", fontSize: 9, fontWeight: "900" }}>CN</Text>
                        </View>
                      )}
                      {sale.transactionType === "DebitNote" && (
                        <View style={{ backgroundColor: "rgba(167,139,250,0.15)", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                          <Text style={{ color: "#a78bfa", fontSize: 9, fontWeight: "900" }}>DN</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.saleMeta}>
                      <Clock size={10} color={C.text.secondary} />
                      <Text style={styles.saleMetaText}>{timeStr}</Text>
                      <UserIcon size={10} color={C.text.secondary} style={{ marginLeft: 6 }} />
                      <Text style={styles.saleMetaText}>{sale.cashierName || "System"}</Text>
                    </View>
                    {(sale.transactionType === "CreditNote" || sale.transactionType === "DebitNote") && sale.relatedInvoiceId && (
                      <Text style={{ color: C.text.secondary, fontSize: 9, marginTop: 1 }}>
                        Ref: #{sale.relatedInvoiceId}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.saleRight}>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.saleTotal}>
                      {currencySymbols[sale.currency || "USD"] || "$"}{Number(Number(sale.total || 0) * Number(sale.exchangeRate || 1)).toFixed(2)}
                    </Text>
                    {sale.currency !== "USD" && (
                      <View style={{ backgroundColor: `${C.amber.primary}20`, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, marginTop: 2 }}>
                        <Text style={{ color: C.amber.primary, fontSize: 8, fontWeight: "900" }}>{sale.currency}</Text>
                      </View>
                    )}
                  </View>
                  {isExpanded ? <ChevronUp size={14} color={C.text.secondary} /> : <ChevronDown size={14} color={C.text.secondary} />}
                </View>
              </TouchableOpacity>
              {isExpanded && (
                <ExpandedSaleContent
                  sale={sale}
                  currencySymbols={currencySymbols}
                  onReprint={handleReprint}
                  isPrinting={isPrinting}
                  onCreditNote={(s, items) => setNoteModal({ visible: true, noteType: "credit", sale: s, items })}
                  onDebitNote={(s, items) => setNoteModal({ visible: true, noteType: "debit", sale: s, items })}
                  isPrintingEnabled={printerConfig.enabled}
                />
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
          <TouchableOpacity onPress={onOpenDrawer} style={styles.iconBtn}><Menu size={20} color={C.text.primary} /></TouchableOpacity>
          <Text style={styles.title}>Reports</Text>
          <View style={{ width: 34 }} />
        </View>

        <FlatList
          data={activeTab === "sales" ? dailyGroups : []}
          keyExtractor={(item) => item[0]}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
        <Modal
          visible={showDrillDown}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowDrillDown(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{drillDownType} Details</Text>
                <TouchableOpacity onPress={() => setShowDrillDown(false)} style={styles.closeBtn}>
                  <X size={20} color={C.text.primary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                {drillDownType === "Revenue" && (
                  <View style={{ gap: 4 }}>
                    {financialData?.drillDown?.revenueItems?.map((item: any, idx: number) => (
                      <View key={idx} style={styles.drillRow}>
                        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${C.status.success}10`, alignItems: "center", justifyContent: "center" }}>
                          <Receipt size={18} color={C.status.success} />
                        </View>
                        <View style={styles.drillInfo}>
                          <Text style={styles.drillMainText}>{item.invoiceNumber}</Text>
                          <Text style={styles.drillSubText}>{new Date(item.issueDate).toLocaleDateString()} • {item.paymentMethod || "CASH"}</Text>
                        </View>
                        <Text style={[styles.drillAmount, { color: C.status.success }]}>+{baseSymbol}{Number(item.total).toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {drillDownType === "COGS" && (
                  <View style={{ gap: 4 }}>
                    {financialData?.drillDown?.cogsItems?.map((item: any, idx: number) => (
                      <View key={idx} style={styles.drillRow}>
                        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${C.status.error}10`, alignItems: "center", justifyContent: "center" }}>
                          <Package size={18} color={C.status.error} />
                        </View>
                        <View style={styles.drillInfo}>
                          <Text style={styles.drillMainText}>{item.productName}</Text>
                          <Text style={styles.drillSubText}>{item.transactionCount} transactions sold</Text>
                        </View>
                        <Text style={[styles.drillAmount, { color: C.status.error }]}>-{baseSymbol}{Number(item.totalCost).toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {drillDownType === "Expenses" && (
                  <View style={{ gap: 4 }}>
                    {financialData?.drillDown?.expenseItems?.map((item: any, idx: number) => (
                      <View key={idx} style={styles.drillRow}>
                        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${C.status.error}10`, alignItems: "center", justifyContent: "center" }}>
                          <DollarSign size={18} color={C.status.error} />
                        </View>
                        <View style={styles.drillInfo}>
                          <Text style={styles.drillMainText}>{item.category || "Other Expense"}</Text>
                          <Text style={styles.drillSubText} numberOfLines={1}>{item.description || "No details"}</Text>
                          <Text style={styles.drillSubText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                        </View>
                        <Text style={[styles.drillAmount, { color: C.status.error }]}>-{baseSymbol}{Number(item.amount).toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {(!drillDownType || !financialData?.drillDown ||
                  (drillDownType === "Revenue" && !financialData.drillDown.revenueItems?.length) ||
                  (drillDownType === "COGS" && !financialData.drillDown.cogsItems?.length) ||
                  (drillDownType === "Expenses" && !financialData.drillDown.expenseItems?.length)
                ) && (
                    <View style={{ padding: 40, alignItems: "center" }}>
                      <Text style={{ color: C.text.secondary }}>No details found for this period.</Text>
                    </View>
                  )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
      {noteModal && (
        <NoteModal
          visible={noteModal.visible}
          noteType={noteModal.noteType}
          originalInvoice={noteModal.sale}
          originalItems={noteModal.items}
          companyId={companyId}
          company={company}
          creditThreshold={creditThreshold}
          currencySymbol={currencySymbols[noteModal.sale?.currency || "USD"] || "$"}
          cashierName={userName}
          printerConfig={printerConfig}
          isOnline={isOnline}
          onClose={() => setNoteModal(null)}
          onSuccess={() => setNoteModal(null)}
        />
      )}
    </View>
  );
}