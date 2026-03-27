import React, { useState, useEffect, useMemo } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, ActivityIndicator, Alert, Modal
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft, Search, Scan, Package, Plus, Minus,
  Trash2, Save, CheckCircle, Info, ChevronRight, X
} from "lucide-react-native";
import { PremiumColors as C } from "../ui/PremiumColors";
import { apiJson } from "../lib/api";
import { Button } from "../ui/Button";
import { useProducts } from "../hooks/usePosData";

interface StockTakeItem {
  productId: number;
  name: string;
  sku: string | null;
  systemCount: number;
  physicalCount: number;
  unitCost: number;
}

interface StockTakeScreenProps {
  companyId: number;
  onClose: () => void;
}

export function StockTakeScreen({ companyId, onClose }: StockTakeScreenProps) {
  const insets = useSafeAreaInsets();
  const { data: products, isLoading: loadingProducts } = useProducts(companyId);
  
  const [items, setItems] = useState<StockTakeItem[]>([]);
  const [search, setSearch] = useState("");
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState("");

  const filteredProducts = useMemo(() => {
    if (!products || !search) return [];
    const s = search.toLowerCase();
    return products.filter(p => 
      p.isTracked && (
        p.name.toLowerCase().includes(s) || 
        (p.sku && p.sku.toLowerCase().includes(s))
      )
    ).slice(0, 10);
  }, [products, search]);

  const addItem = (product: any) => {
    if (items.find(it => it.productId === product.id)) {
      Alert.alert("Already Added", "This product is already in the count list.");
      return;
    }
    const newItem: StockTakeItem = {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      systemCount: parseFloat(product.stockLevel || "0"),
      physicalCount: parseFloat(product.stockLevel || "0"),
      unitCost: parseFloat(product.costPrice || "0"),
    };
    setItems([newItem, ...items]);
    setShowProductSearch(false);
    setSearch("");
  };

  const updateCount = (productId: number, count: number) => {
    setItems(items.map(it => 
      it.productId === productId ? { ...it, physicalCount: Math.max(0, count) } : it
    ));
  };

  const removeItem = (productId: number) => {
    setItems(items.filter(it => it.productId !== productId));
  };

  const handleComplete = async () => {
    if (items.length === 0) {
      Alert.alert("Empty List", "Please add at least one product to the stock take.");
      return;
    }

    Alert.alert(
      "Complete Stock Take",
      "This will adjust the system stock levels to match your physical counts. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          style: "default",
          onPress: async () => {
            setIsSubmitting(true);
            try {
              // 1. Create stock take session with items
              const session = await apiJson<any>(`/api/companies/${companyId}/stock-takes`, {
                method: "POST",
                body: JSON.stringify({
                  notes,
                  items: items.map(it => ({
                    productId: it.productId,
                    physicalCount: it.physicalCount,
                    systemCount: it.systemCount,
                    unitCost: it.unitCost,
                  }))
                })
              });

              // 2. Process/Complete the session
              await apiJson(`/api/stock-takes/${session.id}/complete`, {
                method: "POST",
                body: JSON.stringify({ companyId })
              });

              Alert.alert("Success", "Stock take completed successfully.");
              onClose();
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to complete stock take.");
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const totals = useMemo(() => {
    let gains = 0;
    let losses = 0;
    items.forEach(it => {
      const variance = it.physicalCount - it.systemCount;
      const value = variance * it.unitCost;
      if (value > 0) gains += value;
      else losses += Math.abs(value);
    });
    return { gains, losses, net: gains - losses };
  }, [items]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <ArrowLeft size={20} color={C.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>New Stock Take</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.searchBar}
            onPress={() => setShowProductSearch(true)}
          >
            <Search size={18} color={C.text.secondary} />
            <Text style={styles.searchPlaceholder}>Search products to count...</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.scanBtn}>
            <Scan size={20} color={C.amber.primary} />
          </TouchableOpacity>
        </View>

        {items.length > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Items</Text>
              <Text style={styles.summaryValue}>{items.length}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Net Variance</Text>
              <Text style={[styles.summaryValue, { color: totals.net >= 0 ? C.status.success : C.status.error }]}>
                {totals.net >= 0 ? "+" : "-"}${Math.abs(totals.net).toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        <FlatList
          data={items}
          keyExtractor={item => item.productId.toString()}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => {
            const variance = item.physicalCount - item.systemCount;
            return (
              <View style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemSku}>{item.sku || "No SKU"}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeItem(item.productId)}>
                    <Trash2 size={18} color={C.status.error} opacity={0.7} />
                  </TouchableOpacity>
                </View>

                <View style={styles.countRow}>
                  <View style={styles.systemBox}>
                    <Text style={styles.boxLabel}>System</Text>
                    <Text style={styles.boxValue}>{item.systemCount}</Text>
                  </View>
                  
                  <View style={styles.physicalBox}>
                    <Text style={styles.boxLabel}>Actual Count</Text>
                    <View style={styles.counter}>
                      <TouchableOpacity 
                        onPress={() => updateCount(item.productId, item.physicalCount - 1)}
                        style={styles.counterBtn}
                      >
                        <Minus size={16} color={C.text.primary} />
                      </TouchableOpacity>
                      <TextInput
                        style={styles.counterInput}
                        keyboardType="numeric"
                        value={item.physicalCount.toString()}
                        onChangeText={(v) => updateCount(item.productId, parseFloat(v) || 0)}
                      />
                      <TouchableOpacity 
                        onPress={() => updateCount(item.productId, item.physicalCount + 1)}
                        style={styles.counterBtn}
                      >
                        <Plus size={16} color={C.text.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={[styles.varianceBox, { backgroundColor: variance === 0 ? C.bg.card : variance > 0 ? `${C.status.success}10` : `${C.status.error}10` }]}>
                    <Text style={styles.boxLabel}>Variance</Text>
                    <Text style={[styles.boxValue, { color: variance === 0 ? C.text.secondary : variance > 0 ? C.status.success : C.status.error }]}>
                      {variance > 0 ? "+" : ""}{variance}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Package size={48} color={C.text.secondary} strokeWidth={1} />
              <Text style={styles.emptyTitle}>Empty Count List</Text>
              <Text style={styles.emptySubtitle}>Search or scan products to start counting your physical inventory.</Text>
            </View>
          }
        />
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Button
          title={isSubmitting ? "Processing..." : "Complete Stock Take"}
          onPress={handleComplete}
          disabled={isSubmitting || items.length === 0}
          style={{ flex: 1 }}
        />
      </View>

      {/* Product Search Modal */}
      <Modal visible={showProductSearch} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Product</Text>
              <TouchableOpacity onPress={() => setShowProductSearch(false)} style={styles.closeBtn}>
                <X size={20} color={C.text.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalSearchBox}>
              <Search size={20} color={C.text.secondary} />
              <TextInput
                autoFocus
                style={styles.modalSearchInput}
                placeholder="Search by name or SKU..."
                placeholderTextColor={C.text.secondary}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            {loadingProducts ? (
              <ActivityIndicator color={C.amber.primary} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={filteredProducts}
                keyExtractor={p => p.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.productItem} onPress={() => addItem(item)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productName}>{item.name}</Text>
                      <Text style={styles.productSku}>{item.sku || "No SKU"}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.productStock}>{item.stockLevel} in stock</Text>
                      <Plus size={20} color={C.amber.primary} />
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  search.length > 0 ? (
                    <Text style={styles.modalEmptyText}>No matching tracked products found.</Text>
                  ) : null
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg.base },
  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border.default,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { color: C.text.primary, fontSize: 18, fontWeight: "800" },
  content: { flex: 1, padding: 16 },
  actionRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  searchBar: {
    flex: 1,
    height: 48,
    backgroundColor: C.bg.hover,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border.default,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10
  },
  searchPlaceholder: { color: C.text.secondary, fontSize: 14 },
  scanBtn: {
    width: 48,
    height: 48,
    backgroundColor: `${C.amber.primary}15`,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${C.amber.primary}30`,
    alignItems: "center",
    justifyContent: "center"
  },
  summaryCard: {
    flexDirection: "row",
    backgroundColor: C.bg.hover,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border.default,
    alignItems: "center"
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryLabel: { color: C.text.secondary, fontSize: 11, fontWeight: "600", marginBottom: 4 },
  summaryValue: { color: C.text.primary, fontSize: 16, fontWeight: "800" },
  summaryDivider: { width: 1, height: 24, backgroundColor: C.border.default },
  itemCard: {
    backgroundColor: C.bg.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border.default,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2
  },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  itemName: { color: C.text.primary, fontSize: 15, fontWeight: "700" },
  itemSku: { color: C.text.secondary, fontSize: 12, marginTop: 2 },
  countRow: { flexDirection: "row", gap: 10 },
  systemBox: { flex: 1, backgroundColor: C.bg.hover, borderRadius: 12, padding: 10, alignItems: "center" },
  physicalBox: { flex: 2, backgroundColor: C.bg.hover, borderRadius: 12, padding: 10, alignItems: "center" },
  varianceBox: { flex: 1, borderRadius: 12, padding: 10, alignItems: "center" },
  boxLabel: { color: C.text.secondary, fontSize: 9, fontWeight: "700", textTransform: "uppercase", marginBottom: 6 },
  boxValue: { color: C.text.primary, fontSize: 15, fontWeight: "800" },
  counter: { flexDirection: "row", alignItems: "center", gap: 10 },
  counterBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.bg.card, borderWidth: 1, borderColor: C.border.default, alignItems: "center", justifyContent: "center" },
  counterInput: { color: C.text.primary, fontSize: 16, fontWeight: "800", minWidth: 40, textAlign: "center", padding: 0 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: C.bg.base,
    borderTopWidth: 1,
    borderTopColor: C.border.default,
    flexDirection: "row"
  },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: 60, paddingHorizontal: 40 },
  emptyTitle: { color: C.text.primary, fontSize: 18, fontWeight: "800", marginTop: 16 },
  emptySubtitle: { color: C.text.secondary, fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: C.bg.base, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: "80%", padding: 24 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { color: C.text.primary, fontSize: 20, fontWeight: "800" },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.bg.hover, alignItems: "center", justifyContent: "center" },
  modalSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg.hover,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: C.border.default,
    marginBottom: 20
  },
  modalSearchInput: { flex: 1, color: C.text.primary, fontSize: 15, marginLeft: 10 },
  productItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border.default
  },
  productName: { color: C.text.primary, fontSize: 14, fontWeight: "600" },
  productSku: { color: C.text.secondary, fontSize: 11, marginTop: 2 },
  productStock: { color: C.text.secondary, fontSize: 12, marginBottom: 4 },
  modalEmptyText: { color: C.text.secondary, fontSize: 14, textAlign: "center", marginTop: 40 }
});
