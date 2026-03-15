import React, { useState, useMemo, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, ActivityIndicator,
} from "react-native";
import {
  Menu, PieChart, TrendingUp, DollarSign, Calendar,
  ChevronDown, ChevronUp, Receipt, Package, Clock,
  User as UserIcon, Filter, Search,
} from "lucide-react-native";
import { StatusBar } from "expo-status-bar";
import { usePosSales, useInvoiceItems, useCurrencies } from "../hooks/usePosData";
import { apiJson } from "../lib/api";

const C = {
  bg: "#07090c", s1: "#0d1117", s2: "#141b24",
  border: "#1f2d3d", accent: "#f0a500", text: "#e8edf5",
  muted: "#3d5166", green: "#00d084", red: "#ff4757",
} as const;

type Period = "Today" | "This Week" | "This Month" | "All Time" | "Custom";
type Tab = "sales" | "pnl";

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
}

function InvoiceItemRow({ invoiceId, currencyCode, exchangeRate, symbols }: {
  invoiceId: number;
  currencyCode?: string;
  exchangeRate?: string;
  symbols?: Record<string, string>;
}) {
  const { data: items, isLoading } = useInvoiceItems(invoiceId);
  const rate = Number(exchangeRate || 1);
  const symbol = symbols?.[currencyCode || "USD"] || (currencyCode === "USD" ? "$" : currencyCode || "$");

  if (isLoading) return <ActivityIndicator size="small" color={C.accent} style={{ marginVertical: 10 }} />;
  if (!items || items.length === 0) return <Text style={{ color: C.muted, fontSize: 12, paddingVertical: 8 }}>No items found.</Text>;

  return (
    <View style={styles.itemsList}>
      {items.map((item: any, idx: number) => (
        <View key={idx} style={styles.itemRow}>
          <View style={styles.itemInfo}>
            <Package size={14} color={C.muted} />
            <Text style={styles.itemName} numberOfLines={1}>{item.description || item.product?.name || "Product"}</Text>
          </View>
          <Text style={styles.itemQty}>x{item.quantity}</Text>
          <Text style={styles.itemPrice}>{symbol}{Number(Number(item.lineTotal || 0) * rate).toFixed(2)}</Text>
        </View>
      ))}
    </View>
  );
}

export function ReportsScreen({ onOpenDrawer, companyId, userRole = "member", userId, userName }: ReportsScreenProps) {
  const isCashier = userRole.toLowerCase() === "cashier" || userRole.toLowerCase() === "member";
  
  const [period, setPeriod] = useState<Period>("Today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(isCashier ? "sales" : "sales"); // Default to sales
  const [cashierFilter, setCashierFilter] = useState<string>(isCashier ? (userName || "me") : "all");
  const [showCashierPicker, setShowCashierPicker] = useState(false);

  const { start, end } = useMemo(() => getDateRange(period, customStart, customEnd), [period, customStart, customEnd]);
  const { data: sales, isLoading: loadingSales } = usePosSales(companyId, start, end);
  const { data: currencies } = useCurrencies(companyId);

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
    const startStr = start.toISOString();
    const endStr = end.toISOString();
    let url = `/api/companies/${companyId}/reports/financial-summary?from=${startStr}&to=${endStr}`;
    if (selectedCashierId) url += `&cashierId=${selectedCashierId}`;

    apiJson<any>(url)
      .then((data) => { setFinancialData(data); setLoadingFinancial(false); })
      .catch(() => { setFinancialData(null); setLoadingFinancial(false); });
  }, [companyId, start, end, selectedCashierId]);

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

  const renderHeader = () => (
    <View>
      {/* Tabs */}
      {!isCashier && (
        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tab, activeTab === "sales" && styles.tabActive]} onPress={() => setActiveTab("sales")}>
            <Text style={[styles.tabText, activeTab === "sales" && styles.tabTextActive]}>Sales</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === "pnl" && styles.tabActive]} onPress={() => setActiveTab("pnl")}>
            <Text style={[styles.tabText, activeTab === "pnl" && styles.tabTextActive]}>Profit & Loss</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ padding: 16 }}>
        {/* Filters Row */}
        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.periodBtn} onPress={() => { setShowPeriodPicker(!showPeriodPicker); setShowCashierPicker(false); }}>
            <Calendar size={14} color={C.muted} />
            <Text style={styles.periodText}>{period}</Text>
            <ChevronDown size={14} color={C.muted} />
          </TouchableOpacity>
          {!isCashier && (
            <TouchableOpacity style={styles.periodBtn} onPress={() => { setShowCashierPicker(!showCashierPicker); setShowPeriodPicker(false); }}>
              <Filter size={14} color={C.muted} />
              <Text style={styles.periodText} numberOfLines={1}>{cashierFilter === "all" ? "All Cashiers" : cashierFilter}</Text>
              <ChevronDown size={14} color={C.muted} />
            </TouchableOpacity>
          )}
        </View>

        {showPeriodPicker && (
          <View style={styles.dropdown}>
            {periods.map((p) => (
              <TouchableOpacity key={p} style={[styles.dropdownItem, period === p && styles.dropdownItemActive]} onPress={() => { setPeriod(p); setShowPeriodPicker(false); }}>
                <Text style={[styles.dropdownText, period === p && { color: C.accent }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {period === "Custom" && (
          <View style={styles.customDateRow}>
            <TextInput style={styles.dateInput} placeholder="YYYY-MM-DD" placeholderTextColor={C.muted} value={customStart} onChangeText={setCustomStart} />
            <Text style={{ color: C.muted }}>to</Text>
            <TextInput style={styles.dateInput} placeholder="YYYY-MM-DD" placeholderTextColor={C.muted} value={customEnd} onChangeText={setCustomEnd} />
          </View>
        )}

        {showCashierPicker && (
          <View style={styles.dropdown}>
            <TouchableOpacity style={[styles.dropdownItem, cashierFilter === "all" && styles.dropdownItemActive]} onPress={() => { setCashierFilter("all"); setShowCashierPicker(false); }}>
              <Text style={[styles.dropdownText, cashierFilter === "all" && { color: C.accent }]}>All Cashiers</Text>
            </TouchableOpacity>
            {cashiers.map((c) => (
              <TouchableOpacity key={c} style={[styles.dropdownItem, cashierFilter === c && styles.dropdownItemActive]} onPress={() => { setCashierFilter(c); setShowCashierPicker(false); }}>
                <Text style={[styles.dropdownText, cashierFilter === c && { color: C.accent }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === "sales" && (
          <>
            <View style={styles.statsGrid}>
              {[
                { label: "Total Sales", value: `${baseSymbol}${stats.total.toFixed(2)}`, icon: DollarSign, color: C.accent },
                { label: "Transactions", value: stats.count.toString(), icon: TrendingUp, color: C.green },
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
            {loadingSales && <ActivityIndicator color={C.accent} style={{ marginVertical: 20 }} />}
            {!loadingSales && dailyGroups.length === 0 && (
              <View style={styles.emptyContainer}>
                <Receipt size={40} color={C.muted} strokeWidth={1} />
                <Text style={styles.emptyText}>No sales for this period.</Text>
              </View>
            )}
          </>
        )}

        {activeTab === "pnl" && (
          <View>
            {loadingFinancial ? (
              <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />
            ) : !financialData ? (
              <View style={styles.emptyContainer}>
                <TrendingUp size={40} color={C.muted} strokeWidth={1} />
                <Text style={styles.emptyText}>Unable to load financial data.</Text>
              </View>
            ) : (
              <>
                <View style={styles.pnlCard}>
                  <Text style={styles.pnlTitle}>Profit & Loss Statement</Text>
                  <Text style={styles.pnlPeriod}>{period === 'Custom' ? `${start.toLocaleDateString()} - ${end.toLocaleDateString()}` : period}</Text>
                </View>
                {[
                  { label: "Revenue", value: financialData.revenue, color: C.green, icon: DollarSign, prefix: "" },
                  { label: "Cost of Goods", value: financialData.cogs, color: C.red, icon: Package, prefix: "-" },
                  { label: "Gross Profit", value: financialData.grossProfit, color: C.green, icon: TrendingUp, prefix: "" },
                  { label: "Expenses", value: financialData.expenses, color: C.red, icon: Receipt, prefix: "-" },
                ].map((row, i) => (
                  <View key={i} style={styles.pnlRow}>
                    <View style={styles.pnlRowLeft}>
                      <row.icon size={16} color={row.color} />
                      <Text style={styles.pnlLabel}>{row.label}</Text>
                    </View>
                    <Text style={[styles.pnlValue, { color: row.color }]}>{row.prefix}{baseSymbol}{Number(row.value || 0).toFixed(2)}</Text>
                  </View>
                ))}
                <View style={styles.pnlDivider} />
                <View style={[styles.pnlRow, { backgroundColor: financialData.netProfit >= 0 ? `${C.green}10` : `${C.red}10` }]}>
                  <View style={styles.pnlRowLeft}>
                    <TrendingUp size={16} color={financialData.netProfit >= 0 ? C.green : C.red} />
                    <Text style={[styles.pnlLabel, { fontWeight: "800" }]}>Net Profit</Text>
                  </View>
                  <Text style={[styles.pnlValue, { fontWeight: "900", fontSize: 18, color: financialData.netProfit >= 0 ? C.green : C.red }]}>
                    {baseSymbol}{Number(financialData.netProfit || 0).toFixed(2)}
                  </Text>
                </View>
                {financialData.expenseBreakdown && financialData.expenseBreakdown.length > 0 && (
                  <View style={{ marginTop: 20 }}>
                    <Text style={styles.sectionTitle}>Expense Breakdown</Text>
                    {financialData.expenseBreakdown.map((exp: any, idx: number) => (
                      <View key={idx} style={styles.expenseRow}>
                        <Text style={styles.expenseDesc}>{exp.category || "Other"}</Text>
                        <Text style={styles.expenseAmount}>-{baseSymbol}{Number(exp.amount || 0).toFixed(2)}</Text>
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
              <Text key={cur} style={[styles.dayTotal, cur !== "USD" && { color: C.accent }]}>
                {currencySymbols[cur] || (cur === "USD" ? "$" : cur)} {Number(amt).toFixed(2)}
              </Text>
            ))}
            <Text style={{ color: C.muted, fontSize: 8, marginTop: 1 }}>{group.sales.length} sales</Text>
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
                  <View style={styles.saleIcon}><Receipt size={16} color={C.accent} /></View>
                  <View>
                    <Text style={styles.saleNumber}>{sale.invoiceNumber || `#${sale.id}`}</Text>
                    <View style={styles.saleMeta}>
                      <Clock size={10} color={C.muted} />
                      <Text style={styles.saleMetaText}>{timeStr}</Text>
                      <UserIcon size={10} color={C.muted} style={{ marginLeft: 6 }} />
                      <Text style={styles.saleMetaText}>{sale.cashierName || "System"}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.saleRight}>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.saleTotal}>
                      {currencySymbols[sale.currency || "USD"] || "$"}{Number(Number(sale.total || 0) * Number(sale.exchangeRate || 1)).toFixed(2)}
                    </Text>
                    {sale.currency !== "USD" && (
                      <View style={{ backgroundColor: `${C.accent}20`, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, marginTop: 2 }}>
                        <Text style={{ color: C.accent, fontSize: 8, fontWeight: "900" }}>{sale.currency}</Text>
                      </View>
                    )}
                  </View>
                  {isExpanded ? <ChevronUp size={14} color={C.muted} /> : <ChevronDown size={14} color={C.muted} />}
                </View>
              </TouchableOpacity>
              {isExpanded && (
                <View style={styles.saleDetails}>
                  <View style={styles.detailsDivider} />
                  <InvoiceItemRow
                    invoiceId={sale.id}
                    currencyCode={sale.currency}
                    exchangeRate={sale.exchangeRate}
                    symbols={currencySymbols}
                  />
                  <View style={styles.saleFooter}>
                    <Text style={styles.paymentMethod}>Paid via {sale.paymentMethod || "CASH"}</Text>
                    {sale.customerName && <Text style={styles.customerName}>Customer: {sale.customerName}</Text>}
                  </View>
                </View>
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
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onOpenDrawer} style={styles.iconBtn}><Menu size={20} color={C.text} /></TouchableOpacity>
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
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: C.border },
  iconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.s2, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  title: { color: C.text, fontSize: 18, fontWeight: "800" },
  tabRow: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: C.s2, alignItems: "center", borderWidth: 1, borderColor: C.border },
  tabActive: { backgroundColor: `${C.accent}20`, borderColor: C.accent },
  tabText: { color: C.muted, fontSize: 13, fontWeight: "700" },
  tabTextActive: { color: C.accent },
  filterRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  periodBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: C.s2, borderWidth: 1, borderColor: C.border, flex: 1 },
  periodText: { color: C.text, fontSize: 12, fontWeight: "600", flex: 1 },
  customDateRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  dateInput: { flex: 1, backgroundColor: C.s2, color: C.text, borderRadius: 8, paddingHorizontal: 10, height: 36, borderWidth: 1, borderColor: C.border, fontSize: 12 },
  dropdown: { backgroundColor: C.s1, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginTop: 8, overflow: "hidden" },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  dropdownItemActive: { backgroundColor: `${C.accent}10` },
  dropdownText: { color: C.text, fontSize: 13, fontWeight: "600" },
  statsGrid: { flexDirection: "row", gap: 10, marginVertical: 20 },
  statCard: { flex: 1, backgroundColor: C.s2, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: C.border },
  statIconContainer: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statLabel: { color: C.muted, fontSize: 9, fontWeight: "600", marginBottom: 3 },
  statValue: { color: C.text, fontSize: 12, fontWeight: "800" },
  sectionTitle: { color: C.text, fontSize: 15, fontWeight: "800", marginBottom: 14 },
  dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, paddingHorizontal: 4, marginTop: 4 },
  dayTitle: { color: C.accent, fontSize: 13, fontWeight: "700" },
  dayTotal: { color: C.muted, fontSize: 11, fontWeight: "600" },
  saleCard: { backgroundColor: C.s2, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: "hidden", marginBottom: 6 },
  saleCardExpanded: { borderColor: `${C.accent}40` },
  saleHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12 },
  saleMainInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  saleIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(240,165,0,0.1)", alignItems: "center", justifyContent: "center" },
  saleNumber: { color: C.text, fontSize: 12, fontWeight: "700" },
  saleMeta: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  saleMetaText: { color: C.muted, fontSize: 10, marginLeft: 4 },
  saleRight: { alignItems: "flex-end", gap: 4 },
  saleTotal: { color: C.text, fontSize: 14, fontWeight: "800" },
  saleDetails: { paddingHorizontal: 12, paddingBottom: 12 },
  detailsDivider: { height: 1, backgroundColor: C.border, marginBottom: 10 },
  itemsList: { marginBottom: 10 },
  itemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 5 },
  itemInfo: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  itemName: { color: C.text, fontSize: 12, fontWeight: "500" },
  itemQty: { color: C.muted, fontSize: 11, width: 30, textAlign: "right" },
  itemPrice: { color: C.text, fontSize: 12, fontWeight: "600", width: 65, textAlign: "right" },
  saleFooter: { flexDirection: "row", justifyContent: "space-between", paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border },
  paymentMethod: { color: C.muted, fontSize: 10, fontStyle: "italic" },
  customerName: { color: C.muted, fontSize: 10 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 40, backgroundColor: C.s1, borderRadius: 20, borderWidth: 1, borderColor: C.border, borderStyle: "dashed" },
  emptyText: { color: C.muted, fontSize: 13, marginTop: 10 },
  pnlCard: { backgroundColor: C.s2, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  pnlTitle: { color: C.text, fontSize: 16, fontWeight: "800" },
  pnlPeriod: { color: C.muted, fontSize: 12, marginTop: 4 },
  pnlRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.s2, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  pnlRowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  pnlLabel: { color: C.text, fontSize: 14, fontWeight: "600" },
  pnlValue: { fontSize: 15, fontWeight: "700" },
  pnlDivider: { height: 1, backgroundColor: C.border, marginVertical: 8 },
  expenseRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 14, backgroundColor: C.s2, borderRadius: 10, borderWidth: 1, borderColor: C.border, marginBottom: 6 },
  expenseDesc: { color: C.text, fontSize: 13, fontWeight: "500" },
  expenseAmount: { color: C.red, fontSize: 13, fontWeight: "700" },
});
