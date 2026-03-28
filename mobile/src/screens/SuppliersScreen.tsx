import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, ActivityIndicator, Modal, Alert, ScrollView,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Menu, Search, Plus, Truck, X, Phone, Mail, Edit2 } from "lucide-react-native";
import { StatusBar } from "expo-status-bar";
import { useSuppliers } from "../hooks/usePosData";
import { apiFetch } from "../lib/api";
import { Check } from "lucide-react-native";

import { PremiumColors as C } from "../ui/PremiumColors";

interface Props { onOpenDrawer: () => void; companyId: number; }


const emptySupplier = { name: "", contactPerson: "", email: "", phone: "", address: "", tin: "", vatNumber: "", isActive: true };

export function SuppliersScreen({ onOpenDrawer, companyId }: Props) {
  const insets = useSafeAreaInsets();
  const { data: suppliers, isLoading, refresh: refreshSuppliers } = useSuppliers(companyId);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptySupplier);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!suppliers) return [];
    const q = search.toLowerCase();
    return suppliers.filter((s: any) =>
      s.name?.toLowerCase().includes(q) || s.contactPerson?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      name: item.name || "", contactPerson: item.contactPerson || "", email: item.email || "",
      phone: item.phone || "", address: item.address || "",
      tin: item.tin || "", vatNumber: item.vatNumber || "",
      isActive: item.isActive ?? true,
    });
    setShowForm(true);
  };

  const openAdd = () => { setEditingId(null); setForm(emptySupplier); setShowForm(true); };

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) return Alert.alert("Error", "Supplier name is required");
    setSaving(true);
    try {
      const body: any = {
        name: form.name.trim(),
        contactPerson: form.contactPerson || null,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        tin: form.tin || null,
        vatNumber: form.vatNumber || null,
        isActive: form.isActive,
        companyId,
      };
      const url = editingId ? `/api/suppliers/${editingId}` : `/api/companies/${companyId}/suppliers`;
      const method = editingId ? "PATCH" : "POST";
      const res = await apiFetch(url, { method, body: JSON.stringify(body) });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || `Failed to ${editingId ? "update" : "create"} supplier`);
      }
      setShowForm(false);
      refreshSuppliers();
      // Success feedback via modal closure
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setSaving(false); }
  }, [form, companyId, editingId]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.card, !item.isActive && { opacity: 0.5 }]} onPress={() => openEdit(item)} activeOpacity={0.7}>
      <View style={styles.cardIcon}><Truck size={18} color={C.amber.primary} /></View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        {item.contactPerson && <Text style={styles.cardSub}>{item.contactPerson}</Text>}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 }}>
          {item.phone && <View style={styles.metaRow}><Phone size={10} color={C.text.secondary} /><Text style={styles.metaText}>{item.phone}</Text></View>}
          {item.email && <View style={styles.metaRow}><Mail size={10} color={C.text.secondary} /><Text style={styles.metaText} numberOfLines={1}>{item.email}</Text></View>}
        </View>
      </View>
      <Edit2 size={14} color={C.text.secondary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
          <TouchableOpacity onPress={onOpenDrawer} style={styles.iconBtn}><Menu size={20} color={C.text.primary} /></TouchableOpacity>
          <Text style={styles.title}>Suppliers</Text>
          <TouchableOpacity onPress={openAdd} style={[styles.iconBtn, { backgroundColor: C.amber.primary }]}><Plus size={20} color="#000" /></TouchableOpacity>
        </View>
        <View style={styles.searchRow}>
          <Search size={16} color={C.text.secondary} />
          <TextInput style={styles.searchInput} placeholder="Search suppliers..." placeholderTextColor={C.text.secondary} value={search} onChangeText={setSearch} />
        </View>
        {isLoading ? (<ActivityIndicator color={C.amber.primary} style={{ marginTop: 40 }} />) : (
          <FlatList data={filtered} keyExtractor={(item) => String(item.id)} renderItem={renderItem} contentContainerStyle={{ padding: 16, paddingBottom: 80 }} ListEmptyComponent={<Text style={styles.emptyText}>No suppliers found.</Text>} />
        )}

        <Modal visible={showForm} transparent animationType="slide">
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingId ? "Edit Supplier" : "Add Supplier"}</Text>
                <TouchableOpacity onPress={() => setShowForm(false)}><X size={20} color={C.text.primary} /></TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                {[
                  { label: "Name *", key: "name", kb: "default" as const },
                  { label: "Contact Person", key: "contactPerson", kb: "default" as const },
                  { label: "Email", key: "email", kb: "email-address" as const },
                  { label: "Phone", key: "phone", kb: "phone-pad" as const },
                  { label: "Address", key: "address", kb: "default" as const },
                  { label: "TIN", key: "tin", kb: "numeric" as const },
                  { label: "VAT Number", key: "vatNumber", kb: "numeric" as const },
                ].map((f) => (
                  <View key={f.key} style={styles.field}>
                    <Text style={styles.fieldLabel}>{f.label}</Text>
                    <TextInput style={styles.fieldInput} placeholderTextColor={C.text.secondary} keyboardType={f.kb} value={(form as any)[f.key]} onChangeText={(v) => setForm({ ...form, [f.key]: v })} />
                  </View>
                ))}
                
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
                  {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>{editingId ? "Update Supplier" : "Save Supplier"}</Text>}
                </TouchableOpacity>
              </View>

            </View>
          </KeyboardAvoidingView>
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
  searchRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.bg.hover, margin: 16, marginBottom: 0, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border.default, gap: 8 },
  searchInput: { flex: 1, color: C.text.primary, height: 44, fontSize: 14 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: C.bg.hover, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: C.border.default, marginBottom: 10, gap: 10 },
  cardIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: "rgba(240,165,0,0.1)", alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1 },
  cardTitle: { color: C.text.primary, fontSize: 13, fontWeight: "700" },
  cardSub: { color: C.text.secondary, fontSize: 11, marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: C.text.secondary, fontSize: 10 },
  emptyText: { color: C.text.secondary, textAlign: "center", marginTop: 40, fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.7)" },
  modalContent: { backgroundColor: C.bg.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: C.border.default, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { color: C.text.primary, fontSize: 18, fontWeight: "800" },
  field: { marginBottom: 12 },
  fieldLabel: { color: C.text.secondary, fontSize: 11, fontWeight: "600", marginBottom: 5 },
  fieldInput: { backgroundColor: C.bg.hover, color: C.text.primary, borderRadius: 10, paddingHorizontal: 14, height: 42, borderWidth: 1, borderColor: C.border.default, fontSize: 14 },
  saveBtn: { backgroundColor: C.amber.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8, marginBottom: 20 },
  saveBtnText: { color: "#000", fontWeight: "800", fontSize: 15 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12, marginTop: 4 },
  toggleBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: C.text.secondary, alignItems: "center", justifyContent: "center" },
  toggleBoxActive: { backgroundColor: C.amber.primary, borderColor: C.amber.primary },
  toggleLabel: { color: C.text.primary, fontSize: 13, fontWeight: "600" },
});
