import React, { useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, ActivityIndicator, Alert, ScrollView, Modal,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { Menu, Search, Package, ChevronDown, Plus, X } from "lucide-react-native";
import { StatusBar } from "expo-status-bar";
import { useProducts } from "../hooks/usePosData";
import { apiFetch } from "../lib/api";

const C = {
  bg: "#07090c", s1: "#0d1117", s2: "#141b24",
  border: "#1f2d3d", accent: "#f0a500", text: "#e8edf5",
  muted: "#3d5166", green: "#00d084",
} as const;

interface Props { onOpenDrawer: () => void; companyId: number; }

export function StockInScreen({ onOpenDrawer, companyId }: Props) {
  const { data: products, isLoading } = useProducts(companyId);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredProducts = (products || []).filter((p: any) =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleSubmit = useCallback(async () => {
    if (!selectedProduct) return Alert.alert("Error", "Please select a product");
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) return Alert.alert("Error", "Please enter a valid quantity");
    const cost = parseFloat(unitCost);
    if (!cost || cost < 0) return Alert.alert("Error", "Please enter a valid unit cost");

    setSaving(true);
    try {
      const res = await apiFetch(`/api/companies/${companyId}/inventory/stock-in`, {
        method: "POST",
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity: qty,
          unitCost: cost,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || "Failed to record stock in");
      }
      // Feedback handled by clearing form or modal close
      setSelectedProduct(null);
      setQuantity("");
      setUnitCost("");
      setNotes("");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setSaving(false); }
  }, [selectedProduct, quantity, unitCost, notes, companyId]);

  const currentStock = Number(selectedProduct?.stockLevel || 0);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onOpenDrawer} style={styles.iconBtn}><Menu size={20} color={C.text} /></TouchableOpacity>
          <Text style={styles.title}>Stock In</Text>
          <View style={{ width: 34 }} />
        </View>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={styles.label}>Select Product *</Text>
            <TouchableOpacity style={styles.selector} onPress={() => setShowPicker(true)}>
              {selectedProduct ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Package size={16} color={C.accent} />
                  <Text style={styles.selectorText} numberOfLines={1}>{selectedProduct.name} ({selectedProduct.sku})</Text>
                </View>
              ) : (
                <Text style={[styles.selectorText, { color: C.muted }]}>Tap to select product...</Text>
              )}
              <ChevronDown size={16} color={C.muted} />
            </TouchableOpacity>

            <Text style={styles.label}>Quantity *</Text>
            <TextInput style={styles.input} keyboardType="numeric" placeholder="0" placeholderTextColor={C.muted} value={quantity} onChangeText={setQuantity} />
            
            <Text style={styles.label}>Unit Cost *</Text>
            <TextInput style={styles.input} keyboardType="numeric" placeholder="0.00" placeholderTextColor={C.muted} value={unitCost} onChangeText={setUnitCost} />
            
            <Text style={styles.label}>Notes</Text>
            <TextInput style={[styles.input, { height: 72, textAlignVertical: "top" }]} multiline placeholder="Optional notes..." placeholderTextColor={C.muted} value={notes} onChangeText={setNotes} />

            {selectedProduct && quantity ? (
              <View style={styles.summary}>
                <Text style={styles.summaryTitle}>Summary</Text>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Product</Text><Text style={styles.summaryValue}>{selectedProduct.name}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Current Stock</Text><Text style={styles.summaryValue}>{currentStock}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Adding</Text><Text style={[styles.summaryValue, { color: C.green }]}>+{quantity}</Text></View>
                <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8 }]}>
                  <Text style={[styles.summaryLabel, { fontWeight: "800" }]}>New Stock</Text>
                  <Text style={[styles.summaryValue, { fontWeight: "800" }]}>{currentStock + parseFloat(quantity || "0")}</Text>
                </View>
                {unitCost ? (
                  <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Total Cost</Text><Text style={styles.summaryValue}>${(parseFloat(quantity || "0") * parseFloat(unitCost || "0")).toFixed(2)}</Text></View>
                ) : null}
              </View>
            ) : null}

          </ScrollView>
          <View style={{ paddingHorizontal: 16, paddingBottom: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border }}>
            <TouchableOpacity style={[styles.submitBtn, { marginTop: 0, marginBottom: 0 }]} onPress={handleSubmit} disabled={saving}>
              {saving ? <ActivityIndicator color="#000" /> : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Plus size={18} color="#000" />
                  <Text style={styles.submitBtnText}>Receive Stock</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Product Picker Modal */}
        <Modal visible={showPicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Product</Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}><X size={20} color={C.text} /></TouchableOpacity>
              </View>
              <View style={styles.pickerSearch}>
                <Search size={16} color={C.muted} />
                <TextInput style={styles.pickerSearchInput} placeholder="Search by name or SKU..." placeholderTextColor={C.muted} value={productSearch} onChangeText={setProductSearch} />
              </View>
              {isLoading ? (
                <ActivityIndicator color={C.accent} style={{ padding: 40 }} />
              ) : (
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                  {filteredProducts.map((item: any) => (
                    <TouchableOpacity 
                      key={item.id} 
                      style={[styles.pickerItem, selectedProduct?.id === item.id && styles.pickerItemActive]}
                      onPress={() => { setSelectedProduct(item); setShowPicker(false); setProductSearch(""); setUnitCost(String(item.costPrice || "")); }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pickerItemText}>{item.name}</Text>
                        <Text style={styles.pickerItemSub}>SKU: {item.sku}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.pickerStockText}>Stock: {Number(item.stockLevel || 0)}</Text>
                        <Text style={styles.pickerPriceText}>Cost: ${Number(item.costPrice || 0).toFixed(2)}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {filteredProducts.length === 0 && (
                    <Text style={styles.emptyText}>No products found.</Text>
                  )}
                  <View style={{ height: 40 }} />
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: C.border },
  iconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.s2, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  title: { color: C.text, fontSize: 18, fontWeight: "800" },
  label: { color: C.muted, fontSize: 11, fontWeight: "600", marginBottom: 5, marginTop: 14 },
  input: { backgroundColor: C.s2, color: C.text, borderRadius: 12, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: C.border, fontSize: 14 },
  selector: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.s2, borderRadius: 12, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: C.border },
  selectorText: { color: C.text, fontSize: 14, flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: C.s1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "85%", borderWidth: 1, borderColor: C.border },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { color: C.text, fontSize: 18, fontWeight: "800" },
  pickerSearch: { flexDirection: "row", alignItems: "center", backgroundColor: C.s2, borderRadius: 12, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: C.border, gap: 10, marginBottom: 16 },
  pickerSearchInput: { flex: 1, color: C.text, fontSize: 14 },
  pickerItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  pickerItemActive: { backgroundColor: `${C.accent}10` },
  pickerItemText: { color: C.text, fontSize: 14, fontWeight: "600" },
  pickerItemSub: { color: C.muted, fontSize: 11, marginTop: 2 },
  pickerStockText: { color: C.accent, fontSize: 12, fontWeight: "700" },
  pickerPriceText: { color: C.muted, fontSize: 11, marginTop: 2 },
  emptyText: { color: C.muted, textAlign: "center", marginTop: 40, fontSize: 14 },
  summary: { backgroundColor: C.s2, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border, marginTop: 20 },
  summaryTitle: { color: C.text, fontWeight: "800", fontSize: 14, marginBottom: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  summaryLabel: { color: C.muted, fontSize: 13 },
  summaryValue: { color: C.text, fontSize: 13, fontWeight: "600" },
  submitBtn: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 20, marginBottom: 40 },
  submitBtnText: { color: "#000", fontWeight: "800", fontSize: 15 },
});
