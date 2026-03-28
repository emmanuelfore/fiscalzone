import React, { useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, ActivityIndicator, Alert, ScrollView, Modal,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Menu, Search, Package, ChevronDown, Plus, X } from "lucide-react-native";
import { StatusBar } from "expo-status-bar";
import { useProducts, useSuppliers } from "../hooks/usePosData";
import { apiFetch } from "../lib/api";
import { Users } from "lucide-react-native";

import { PremiumColors as C } from "../ui/PremiumColors";

interface Props { onOpenDrawer: () => void; onClose?: () => void; companyId: number; }

export function StockInScreen({ onOpenDrawer, onClose, companyId }: Props) {
  const insets = useSafeAreaInsets();
  const { data: products, isLoading } = useProducts(companyId);
  const { data: suppliers, isLoading: loadingSuppliers } = useSuppliers(companyId);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showSupplierPicker, setShowSupplierPicker] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredSuppliers = (suppliers || []).filter((s: any) => {
    if (s.isActive === false) return false;
    if (!supplierSearch) return true;
    const searchLower = supplierSearch.toLowerCase();
    return s.name?.toLowerCase().includes(searchLower) || s.email?.toLowerCase().includes(searchLower);
  });

  const filteredProducts = (products || []).filter((p: any) => {
    if (p.isActive === false) return false;
    // Only show products that track stock
    if (!p.isTracked) return false;
    
    if (!productSearch) return true;
    const searchLower = productSearch.toLowerCase();
    const nameMatch = p.name?.toLowerCase().includes(searchLower) ?? false;
    const skuMatch = p.sku?.toLowerCase().includes(searchLower) ?? false;
    return nameMatch || skuMatch;
  });

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
          supplierId: selectedSupplier?.id,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || "Failed to record stock in");
      }
      // Feedback handled by clearing form or modal close
      setSelectedProduct(null);
      setSelectedSupplier(null);
      setQuantity("");
      setUnitCost("");
      setNotes("");
      Alert.alert("Success", "Stock recorded successfully!", [
        { text: "OK", onPress: () => { if (onClose) onClose(); } }
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setSaving(false); }
  }, [selectedProduct, quantity, unitCost, notes, companyId]);

  const currentStock = Number(selectedProduct?.stockLevel || 0);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
          <TouchableOpacity onPress={onOpenDrawer} style={styles.iconBtn}><Menu size={20} color={C.text.primary} /></TouchableOpacity>
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
                  <Package size={16} color={C.amber.primary} />
                  <Text style={styles.selectorText} numberOfLines={1}>{selectedProduct.name} ({selectedProduct.sku})</Text>
                </View>
              ) : (
                <Text style={[styles.selectorText, { color: C.text.secondary }]}>Tap to select product...</Text>
              )}
              <ChevronDown size={16} color={C.text.secondary} />
            </TouchableOpacity>

            <Text style={styles.label}>Select Supplier</Text>
            <TouchableOpacity style={styles.selector} onPress={() => setShowSupplierPicker(true)}>
              {selectedSupplier ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Users size={16} color={C.amber.primary} />
                  <Text style={styles.selectorText} numberOfLines={1}>{selectedSupplier.name}</Text>
                </View>
              ) : (
                <Text style={[styles.selectorText, { color: C.text.secondary }]}>Tap to select supplier (optional)...</Text>
              )}
              <ChevronDown size={16} color={C.text.secondary} />
            </TouchableOpacity>

            <Text style={styles.label}>Quantity *</Text>
            <TextInput style={styles.input} keyboardType="numeric" placeholder="0" placeholderTextColor={C.text.secondary} value={quantity} onChangeText={setQuantity} />
            
            <Text style={styles.label}>Unit Cost *</Text>
            <TextInput style={styles.input} keyboardType="numeric" placeholder="0.00" placeholderTextColor={C.text.secondary} value={unitCost} onChangeText={setUnitCost} />
            
            <Text style={styles.label}>Notes</Text>
            <TextInput style={[styles.input, { height: 72, textAlignVertical: "top" }]} multiline placeholder="Optional notes..." placeholderTextColor={C.text.secondary} value={notes} onChangeText={setNotes} />

            {selectedProduct && quantity ? (
              <View style={styles.summary}>
                <Text style={styles.summaryTitle}>Summary</Text>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Product</Text><Text style={styles.summaryValue}>{selectedProduct.name}</Text></View>
                {selectedSupplier && <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Supplier</Text><Text style={styles.summaryValue}>{selectedSupplier.name}</Text></View>}
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Current Stock</Text><Text style={styles.summaryValue}>{currentStock}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Adding</Text><Text style={[styles.summaryValue, { color: C.status.success }]}>+{quantity}</Text></View>
                <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: C.border.default, paddingTop: 8 }]}>
                  <Text style={[styles.summaryLabel, { fontWeight: "800" }]}>New Stock</Text>
                  <Text style={[styles.summaryValue, { fontWeight: "800" }]}>{currentStock + parseFloat(quantity || "0")}</Text>
                </View>
                {unitCost ? (
                  <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Total Cost</Text><Text style={styles.summaryValue}>${(parseFloat(quantity || "0") * parseFloat(unitCost || "0")).toFixed(2)}</Text></View>
                ) : null}
              </View>
            ) : null}

          </ScrollView>
          <View style={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 20), paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border.default }}>
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
            <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Product</Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}><X size={20} color={C.text.primary} /></TouchableOpacity>
              </View>
              <View style={styles.pickerSearch}>
                <Search size={16} color={C.text.secondary} />
                <TextInput style={styles.pickerSearchInput} placeholder="Search by name or SKU..." placeholderTextColor={C.text.secondary} value={productSearch} onChangeText={setProductSearch} />
              </View>
              {isLoading ? (
                <ActivityIndicator color={C.amber.primary} style={{ padding: 40 }} />
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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

        {/* Supplier Picker Modal */}
        <Modal visible={showSupplierPicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Supplier</Text>
                <TouchableOpacity onPress={() => setShowSupplierPicker(false)}><X size={20} color={C.text.primary} /></TouchableOpacity>
              </View>
              <View style={styles.pickerSearch}>
                <Search size={16} color={C.text.secondary} />
                <TextInput style={styles.pickerSearchInput} placeholder="Search suppliers..." placeholderTextColor={C.text.secondary} value={supplierSearch} onChangeText={setSupplierSearch} />
              </View>
              {loadingSuppliers ? (
                <ActivityIndicator color={C.amber.primary} style={{ padding: 40 }} />
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {filteredSuppliers.map((item: any) => (
                    <TouchableOpacity 
                      key={item.id} 
                      style={[styles.pickerItem, selectedSupplier?.id === item.id && styles.pickerItemActive]}
                      onPress={() => { setSelectedSupplier(item); setShowSupplierPicker(false); setSupplierSearch(""); }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pickerItemText}>{item.name}</Text>
                        <Text style={styles.pickerItemSub}>{item.email || "No email"}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.pickerItemSub}>{item.phone || ""}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {filteredSuppliers.length === 0 && (
                    <Text style={styles.emptyText}>No suppliers found.</Text>
                  )}
                  <View style={{ height: 40 }} />
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg.base },
  header: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: C.border.default },
  iconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.bg.hover, borderWidth: 1, borderColor: C.border.default, alignItems: "center", justifyContent: "center" },
  title: { color: C.text.primary, fontSize: 18, fontWeight: "800" },
  label: { color: C.text.secondary, fontSize: 11, fontWeight: "600", marginBottom: 5, marginTop: 14 },
  input: { backgroundColor: C.bg.hover, color: C.text.primary, borderRadius: 12, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: C.border.default, fontSize: 14 },
  selector: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.bg.hover, borderRadius: 12, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: C.border.default },
  selectorText: { color: C.text.primary, fontSize: 14, flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: C.bg.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, height: "85%", borderWidth: 1, borderColor: C.border.default },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { color: C.text.primary, fontSize: 18, fontWeight: "800" },
  pickerSearch: { flexDirection: "row", alignItems: "center", backgroundColor: C.bg.hover, borderRadius: 12, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: C.border.default, gap: 10, marginBottom: 16 },
  pickerSearchInput: { flex: 1, color: C.text.primary, fontSize: 14 },
  pickerItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border.default },
  pickerItemActive: { backgroundColor: `${C.amber.primary}10` },
  pickerItemText: { color: C.text.primary, fontSize: 14, fontWeight: "600" },
  pickerItemSub: { color: C.text.secondary, fontSize: 11, marginTop: 2 },
  pickerStockText: { color: C.amber.primary, fontSize: 12, fontWeight: "700" },
  pickerPriceText: { color: C.text.secondary, fontSize: 11, marginTop: 2 },
  emptyText: { color: C.text.secondary, textAlign: "center", marginTop: 40, fontSize: 14 },
  summary: { backgroundColor: C.bg.hover, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border.default, marginTop: 20 },
  summaryTitle: { color: C.text.primary, fontWeight: "800", fontSize: 14, marginBottom: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  summaryLabel: { color: C.text.secondary, fontSize: 13 },
  summaryValue: { color: C.text.primary, fontSize: 13, fontWeight: "600" },
  submitBtn: { backgroundColor: C.amber.primary, borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 20, marginBottom: 40 },
  submitBtnText: { color: "#000", fontWeight: "800", fontSize: 15 },
});
