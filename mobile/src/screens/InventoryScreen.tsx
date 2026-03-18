import React, { useState, useMemo, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, ActivityIndicator, Alert, ScrollView, Modal,
  KeyboardAvoidingView, Platform,
} from "react-native";
import {
  Menu, Search, Plus, Package, X, Edit2, Check,
} from "lucide-react-native";
import { StatusBar } from "expo-status-bar";
import { useProducts, useTaxTypes } from "../hooks/usePosData";
import { apiFetch } from "../lib/api";

import { PremiumColors as C } from "../ui/PremiumColors";

const PRODUCT_TYPES = [
  { value: "good", label: "Good" },
  { value: "service", label: "Service" },
];

interface Props { onOpenDrawer: () => void; companyId: number; }

const emptyProduct = { 
  name: "", sku: "", barcode: "", hsCode: "0000.00.00", price: "", costPrice: "", 
  category: "", description: "", productType: "good", 
  isTracked: true, stockLevel: "0", lowStockThreshold: "10",
  taxTypeId: null as number | null, isActive: true 
};

export function InventoryScreen({ onOpenDrawer, companyId }: Props) {
  const { data: products, isLoading, error, refresh: refreshProducts } = useProducts(companyId);
  const { data: taxTypes } = useTaxTypes(companyId);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = search.toLowerCase();
    return products.filter((p: any) =>
      p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)
    );
  }, [products, search]);

  const categories = useMemo(() => {
    if (!products) return [];
    const cats = new Set(products.map((p: any) => p.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [products]);

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      name: item.name || "", sku: item.sku || "", barcode: item.barcode || "", 
      hsCode: item.hsCode || "0000.00.00",
      price: String(item.price || ""),
      costPrice: String(item.costPrice || ""), category: item.category || "",
      description: item.description || "", productType: item.productType || "good",
      isTracked: item.isTracked ?? true, stockLevel: String(item.stockLevel || 0),
      lowStockThreshold: String(item.lowStockThreshold || 10),
      taxTypeId: item.taxTypeId || null,
      isActive: item.isActive ?? true,
    });
    setShowForm(true);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyProduct);
    setShowForm(true);
  };

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) return Alert.alert("Error", "Product name is required");
    if (!form.sku.trim()) return Alert.alert("Error", "Product Code/SKU is required");
    if (!form.price || parseFloat(form.price) < 0) return Alert.alert("Error", "Valid selling price is required");
    setSaving(true);
    try {
      const body: any = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        price: form.price,
        costPrice: form.costPrice || "0",
        category: form.category || null,
        description: form.description || null,
        productType: form.productType,
        isTracked: form.isTracked,
        stockLevel: form.stockLevel || "0",
        lowStockThreshold: form.lowStockThreshold || "10",
        taxTypeId: form.taxTypeId,
        barcode: form.barcode || null,
        hsCode: form.hsCode || "0000.00.00",
        isActive: form.isActive,
        companyId,
      };
      const url = editingId
        ? `/api/products/${editingId}`
        : `/api/companies/${companyId}/products`;
      const method = editingId ? "PATCH" : "POST";
      const res = await apiFetch(url, { method, body: JSON.stringify(body) });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || `Failed to ${editingId ? "update" : "create"} product`);
      }
      setShowForm(false);
      refreshProducts();
      Alert.alert("Success", `Product ${editingId ? "updated" : "saved"} successfully`);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setSaving(false); }
  }, [form, companyId, editingId]);

  const renderItem = ({ item }: { item: any }) => {
    const stock = Number(item.stockLevel || 0);
    const lowThreshold = Number(item.lowStockThreshold || 10);
    const stockColor = stock <= 0 ? C.status.error : stock <= lowThreshold ? C.amber.primary : C.status.success;
    return (
      <TouchableOpacity style={styles.card} onPress={() => openEdit(item)} activeOpacity={0.7}>
        <View style={styles.cardIcon}><Package size={18} color={C.amber.primary} /></View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardSub}>{item.sku || "No SKU"}{item.category ? ` · ${item.category}` : ""}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.cardPrice}>${Number(item.price || 0).toFixed(2)}</Text>
          <Text style={[styles.cardStock, { color: stockColor }]}>
            {item.isTracked ? `${stock} in stock` : "Not tracked"}
          </Text>
        </View>
        <Edit2 size={14} color={C.text.secondary} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onOpenDrawer} style={styles.iconBtn}><Menu size={20} color={C.text.primary} /></TouchableOpacity>
          <Text style={styles.title}>Inventory</Text>
          <TouchableOpacity onPress={openAdd} style={[styles.iconBtn, { backgroundColor: C.amber.primary }]}><Plus size={20} color="#000" /></TouchableOpacity>
        </View>
        <View style={styles.searchRow}>
          <Package size={14} color={C.text.secondary} />
          <TextInput style={styles.searchInput} placeholder="Search products..." placeholderTextColor={C.text.secondary} value={search} onChangeText={setSearch} />
        </View>
        {isLoading ? (
          <ActivityIndicator size="small" color={C.amber.primary} style={{ marginVertical: 10 }} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <FlatList data={filtered} keyExtractor={(item) => String(item.id)} renderItem={renderItem} contentContainerStyle={{ padding: 16, paddingBottom: 80 }} ListEmptyComponent={<Text style={styles.emptyText}>No products found.</Text>} />
        )}

        <Modal visible={showForm} transparent animationType="slide">
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingId ? "Edit Product" : "Add Product"}</Text>
                <TouchableOpacity onPress={() => setShowForm(false)}><X size={20} color={C.text.primary} /></TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                {/* Name */}
                <View style={styles.field}><Text style={styles.fieldLabel}>Product Name *</Text>
                  <TextInput style={styles.fieldInput} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholderTextColor={C.text.secondary} /></View>
                {/* Barcode */}
                <View style={styles.field}><Text style={styles.fieldLabel}>Barcode</Text>
                  <TextInput style={styles.fieldInput} value={form.barcode} onChangeText={(v) => setForm({ ...form, barcode: v })} placeholder="Optional" placeholderTextColor={C.text.secondary} /></View>
                {/* HS Code */}
                <View style={styles.field}><Text style={styles.fieldLabel}>HS Code</Text>
                  <TextInput style={styles.fieldInput} value={form.hsCode} onChangeText={(v) => setForm({ ...form, hsCode: v })} placeholder="0000.00.00" placeholderTextColor={C.text.secondary} /></View>
                {/* SKU */}
                <View style={styles.field}><Text style={styles.fieldLabel}>Code / SKU *</Text>
                  <TextInput style={styles.fieldInput} value={form.sku} onChangeText={(v) => setForm({ ...form, sku: v })} placeholderTextColor={C.text.secondary} /></View>
                {/* Category */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Category</Text>
                  <TextInput style={styles.fieldInput} value={form.category} onChangeText={(v) => setForm({ ...form, category: v })} placeholder="e.g. Beverages, Electronics" placeholderTextColor={C.text.secondary} />
                  {categories.length > 0 && (
                    <View style={styles.chipRow}>
                      {categories.slice(0, 6).map((cat) => (
                        <TouchableOpacity key={cat} style={[styles.chip, form.category === cat && styles.chipActive]} onPress={() => setForm({ ...form, category: cat })}>
                          <Text style={[styles.chipText, form.category === cat && styles.chipTextActive]}>{cat}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                {/* Tax Type */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Tax Type</Text>
                  <View style={styles.chipRow}>
                    {taxTypes?.map((t: any) => (
                      <TouchableOpacity key={t.id} style={[styles.chip, form.taxTypeId === t.id && styles.chipActive]} onPress={() => setForm({ ...form, taxTypeId: t.id })}>
                        <Text style={[styles.chipText, form.taxTypeId === t.id && styles.chipTextActive]}>{t.name} ({t.rate}%)</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                {/* Prices */}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={[styles.field, { flex: 1 }]}><Text style={styles.fieldLabel}>Selling Price *</Text>
                    <TextInput style={styles.fieldInput} keyboardType="numeric" value={form.price} onChangeText={(v) => setForm({ ...form, price: v })} placeholderTextColor={C.text.secondary} /></View>
                  <View style={[styles.field, { flex: 1 }]}><Text style={styles.fieldLabel}>Cost Price</Text>
                    <TextInput style={styles.fieldInput} keyboardType="numeric" value={form.costPrice} onChangeText={(v) => setForm({ ...form, costPrice: v })} placeholderTextColor={C.text.secondary} /></View>
                </View>
                {/* Track inventory toggle */}
                <TouchableOpacity style={styles.toggleRow} onPress={() => setForm({ ...form, isTracked: !form.isTracked })}>
                  <View style={[styles.toggleBox, form.isTracked && styles.toggleBoxActive]}>
                    {form.isTracked && <Check size={14} color="#000" />}
                  </View>
                  <Text style={styles.toggleLabel}>Track Inventory</Text>
                </TouchableOpacity>
                {form.isTracked && (
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={[styles.field, { flex: 1 }]}><Text style={styles.fieldLabel}>Opening Stock</Text>
                      <TextInput style={styles.fieldInput} keyboardType="numeric" value={form.stockLevel} onChangeText={(v) => setForm({ ...form, stockLevel: v })} placeholderTextColor={C.text.secondary} /></View>
                    <View style={[styles.field, { flex: 1 }]}><Text style={styles.fieldLabel}>Low Stock Alert</Text>
                      <TextInput style={styles.fieldInput} keyboardType="numeric" value={form.lowStockThreshold} onChangeText={(v) => setForm({ ...form, lowStockThreshold: v })} placeholderTextColor={C.text.secondary} /></View>
                  </View>
                )}
                {/* Description */}
                <View style={styles.field}><Text style={styles.fieldLabel}>Description</Text>
                  <TextInput style={[styles.fieldInput, { height: 70, textAlignVertical: "top" }]} multiline value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} placeholderTextColor={C.text.secondary} /></View>
                
                {/* Active Status */}
                <TouchableOpacity style={styles.toggleRow} onPress={() => setForm({ ...form, isActive: !form.isActive })}>
                  <View style={[styles.toggleBox, form.isActive && styles.toggleBoxActive]}>
                    {form.isActive && <Check size={14} color="#000" />}
                  </View>
                  <Text style={styles.toggleLabel}>Active Status</Text>
                </TouchableOpacity>
              </ScrollView>

              <View style={{ paddingTop: 16, borderTopWidth: 1, borderTopColor: C.border.default, marginTop: 10 }}>
                <TouchableOpacity style={[styles.saveBtn, { marginTop: 0, marginBottom: 0 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>{editingId ? "Update Product" : "Save Product"}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg.base },
  header: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: C.border.default },
  iconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.bg.hover, borderWidth: 1, borderColor: C.border.default, alignItems: "center", justifyContent: "center" },
  title: { color: C.text.primary, fontSize: 18, fontWeight: "800" },
  searchRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.bg.hover, margin: 16, marginBottom: 0, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border.default, gap: 8 },
  searchInput: { flex: 1, color: C.text.primary, height: 44, fontSize: 14 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: C.bg.hover, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: C.border.default, marginBottom: 10, gap: 10 },
  cardIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: "rgba(240,165,0,0.1)", alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1 },
  cardTitle: { color: C.text.primary, fontSize: 13, fontWeight: "700" },
  cardSub: { color: C.text.secondary, fontSize: 11, marginTop: 2 },
  cardRight: { alignItems: "flex-end", marginRight: 4 },
  cardPrice: { color: C.text.primary, fontSize: 13, fontWeight: "800" },
  cardStock: { color: C.status.success, fontSize: 10, marginTop: 2, fontWeight: "600" },
  errorText: { color: C.status.error, textAlign: "center", marginTop: 40 },
  emptyText: { color: C.text.secondary, textAlign: "center", marginTop: 40 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.7)" },
  modalContent: { backgroundColor: C.bg.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: C.border.default, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { color: C.text.primary, fontSize: 18, fontWeight: "800" },
  field: { marginBottom: 12 },
  fieldLabel: { color: C.text.secondary, fontSize: 11, fontWeight: "600", marginBottom: 5 },
  fieldInput: { backgroundColor: C.bg.hover, color: C.text.primary, borderRadius: 10, paddingHorizontal: 14, height: 42, borderWidth: 1, borderColor: C.border.default, fontSize: 14 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: C.bg.hover, borderWidth: 1, borderColor: C.border.default },
  chipActive: { backgroundColor: `${C.amber.primary}20`, borderColor: C.amber.primary },
  chipText: { color: C.text.secondary, fontSize: 11, fontWeight: "600" },
  chipTextActive: { color: C.amber.primary },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12, marginTop: 4 },
  toggleBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: C.text.secondary, alignItems: "center", justifyContent: "center" },
  toggleBoxActive: { backgroundColor: C.amber.primary, borderColor: C.amber.primary },
  toggleLabel: { color: C.text.primary, fontSize: 13, fontWeight: "600" },
  saveBtn: { backgroundColor: C.amber.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8, marginBottom: 20 },
  saveBtnText: { color: "#000", fontWeight: "800", fontSize: 15 },
});
