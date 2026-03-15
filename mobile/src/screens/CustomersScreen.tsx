import React, { useState, useMemo, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, ActivityIndicator, Modal, Alert, ScrollView,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { Menu, Search, Plus, Users, X, Phone, Mail, Edit2, Check } from "lucide-react-native";
import { StatusBar } from "expo-status-bar";
import { useCustomers } from "../hooks/usePosData";
import { apiFetch } from "../lib/api";

const C = {
  bg: "#07090c", s1: "#0d1117", s2: "#141b24",
  border: "#1f2d3d", accent: "#f0a500", text: "#e8edf5",
  muted: "#3d5166", green: "#00d084",
} as const;

const CUSTOMER_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "business", label: "Business" },
];

interface Props { onOpenDrawer: () => void; companyId: number; }

const emptyCustomer = { 
  name: "", email: "", phone: "", mobile: "", address: "", 
  billingAddress: "", city: "", country: "Zimbabwe", 
  tin: "", vatNumber: "", bpNumber: "", 
  customerType: "individual", notes: "", isActive: true 
};

export function CustomersScreen({ onOpenDrawer, companyId }: Props) {
  const { data: customers, error, refresh: refreshCustomers } = useCustomers(companyId);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyCustomer);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!customers) return [];
    const q = search.toLowerCase();
    return customers.filter((c: any) =>
      c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q)
    );
  }, [customers, search]);

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      name: item.name || "", email: item.email || "", phone: item.phone || "",
      mobile: item.mobile || "", address: item.address || "", billingAddress: item.billingAddress || "",
      city: item.city || "", country: item.country || "Zimbabwe",
      tin: item.tin || "", vatNumber: item.vatNumber || "", bpNumber: item.bpNumber || "",
      customerType: item.customerType || "individual", notes: item.notes || "",
      isActive: item.isActive ?? true,
    });
    setShowForm(true);
  };

  const openAdd = () => { setEditingId(null); setForm(emptyCustomer); setShowForm(true); };

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) return Alert.alert("Error", "Customer name is required");
    setSaving(true);
    try {
      const body: any = {
        name: form.name.trim(),
        email: form.email || null,
        phone: form.phone || null,
        mobile: form.mobile || null,
        address: form.address || null,
        billingAddress: form.billingAddress || null,
        city: form.city || null,
        country: form.country || "Zimbabwe",
        tin: form.tin || null,
        vatNumber: form.vatNumber || null,
        bpNumber: form.bpNumber || null,
        customerType: form.customerType,
        notes: form.notes || null,
        isActive: form.isActive,
        companyId,
      };
      const url = editingId ? `/api/customers/${editingId}` : `/api/companies/${companyId}/customers`;
      const method = editingId ? "PATCH" : "POST";
      const res = await apiFetch(url, { method, body: JSON.stringify(body) });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || `Failed to ${editingId ? "update" : "create"} customer`);
      }
      setShowForm(false);
      refreshCustomers();
      // Success feedback handled by modal closing
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setSaving(false); }
  }, [form, companyId, editingId]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.card, !item.isActive && { opacity: 0.5 }]} onPress={() => openEdit(item)} activeOpacity={0.7}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{(item.name || "?").charAt(0).toUpperCase()}</Text></View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 }}>
          {item.phone && <View style={styles.metaRow}><Phone size={10} color={C.muted} /><Text style={styles.metaText}>{item.phone}</Text></View>}
          {item.email && <View style={styles.metaRow}><Mail size={10} color={C.muted} /><Text style={styles.metaText} numberOfLines={1}>{item.email}</Text></View>}
        </View>
        {item.customerType && <Text style={[styles.metaText, { marginTop: 2, textTransform: "capitalize" }]}>{item.customerType}</Text>}
      </View>
      <Edit2 size={14} color={C.muted} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onOpenDrawer} style={styles.iconBtn}><Menu size={20} color={C.text} /></TouchableOpacity>
          <Text style={styles.title}>Customers</Text>
          <TouchableOpacity onPress={openAdd} style={[styles.iconBtn, { backgroundColor: C.accent }]}><Plus size={20} color="#000" /></TouchableOpacity>
        </View>
        <View style={styles.searchRow}>
          <Search size={16} color={C.muted} />
          <TextInput style={styles.searchInput} placeholder="Search customers..." placeholderTextColor={C.muted} value={search} onChangeText={setSearch} />
        </View>
        {!customers ? (<ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />) : (
          <FlatList data={filtered} keyExtractor={(item) => String(item.id)} renderItem={renderItem} contentContainerStyle={{ padding: 16, paddingBottom: 80 }} ListEmptyComponent={<Text style={styles.emptyText}>No customers found.</Text>} />
        )}

        <Modal visible={showForm} transparent animationType="slide">
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingId ? "Edit Customer" : "Add Customer"}</Text>
                <TouchableOpacity onPress={() => setShowForm(false)}><X size={20} color={C.text} /></TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                <View style={styles.field}><Text style={styles.fieldLabel}>Name *</Text>
                  <TextInput style={styles.fieldInput} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholderTextColor={C.muted} /></View>
                {/* Customer Type */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Customer Type</Text>
                  <View style={styles.chipRow}>
                    {CUSTOMER_TYPES.map((ct) => (
                      <TouchableOpacity key={ct.value} style={[styles.chip, form.customerType === ct.value && styles.chipActive]} onPress={() => setForm({ ...form, customerType: ct.value })}>
                        <Text style={[styles.chipText, form.customerType === ct.value && styles.chipTextActive]}>{ct.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.field}><Text style={styles.fieldLabel}>Email</Text>
                  <TextInput style={styles.fieldInput} keyboardType="email-address" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} placeholderTextColor={C.muted} /></View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={[styles.field, { flex: 1 }]}><Text style={styles.fieldLabel}>Phone</Text>
                    <TextInput style={styles.fieldInput} keyboardType="phone-pad" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} placeholderTextColor={C.muted} /></View>
                  <View style={[styles.field, { flex: 1 }]}><Text style={styles.fieldLabel}>Mobile</Text>
                    <TextInput style={styles.fieldInput} keyboardType="phone-pad" value={form.mobile} onChangeText={(v) => setForm({ ...form, mobile: v })} placeholderTextColor={C.muted} /></View>
                </View>
                <View style={styles.field}><Text style={styles.fieldLabel}>Address</Text>
                  <TextInput style={styles.fieldInput} value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} placeholderTextColor={C.muted} /></View>
                <View style={styles.field}><Text style={styles.fieldLabel}>Billing Address</Text>
                  <TextInput style={styles.fieldInput} value={form.billingAddress} onChangeText={(v) => setForm({ ...form, billingAddress: v })} placeholderTextColor={C.muted} /></View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={[styles.field, { flex: 1 }]}><Text style={styles.fieldLabel}>City</Text>
                    <TextInput style={styles.fieldInput} value={form.city} onChangeText={(v) => setForm({ ...form, city: v })} placeholderTextColor={C.muted} /></View>
                  <View style={[styles.field, { flex: 1 }]}><Text style={styles.fieldLabel}>Country</Text>
                    <TextInput style={styles.fieldInput} value={form.country} onChangeText={(v) => setForm({ ...form, country: v })} placeholderTextColor={C.muted} /></View>
                </View>
                {/* Tax info */}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={[styles.field, { flex: 1 }]}><Text style={styles.fieldLabel}>TIN</Text>
                    <TextInput style={styles.fieldInput} keyboardType="numeric" value={form.tin} onChangeText={(v) => setForm({ ...form, tin: v })} placeholder="10 digits" placeholderTextColor={C.muted} /></View>
                  <View style={[styles.field, { flex: 1 }]}><Text style={styles.fieldLabel}>VAT Number</Text>
                    <TextInput style={styles.fieldInput} keyboardType="numeric" value={form.vatNumber} onChangeText={(v) => setForm({ ...form, vatNumber: v })} placeholderTextColor={C.muted} /></View>
                </View>
                <View style={styles.field}><Text style={styles.fieldLabel}>BP Number</Text>
                  <TextInput style={styles.fieldInput} keyboardType="numeric" value={form.bpNumber} onChangeText={(v) => setForm({ ...form, bpNumber: v })} placeholderTextColor={C.muted} /></View>
                <View style={styles.field}><Text style={styles.fieldLabel}>Notes</Text>
                  <TextInput style={[styles.fieldInput, { height: 60, textAlignVertical: "top" }]} multiline value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} placeholderTextColor={C.muted} /></View>
                
                {/* Active Status */}
                <TouchableOpacity style={styles.toggleRow} onPress={() => setForm({ ...form, isActive: !form.isActive })}>
                  <View style={[styles.toggleBox, form.isActive && styles.toggleBoxActive]}>
                    {form.isActive && <Check size={14} color="#000" />}
                  </View>
                  <Text style={styles.toggleLabel}>Active Status</Text>
                </TouchableOpacity>
              </ScrollView>

              <View style={{ paddingTop: 16, borderTopWidth: 1, borderTopColor: C.border, marginTop: 10 }}>
                <TouchableOpacity style={[styles.saveBtn, { marginTop: 0, marginBottom: 0 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>{editingId ? "Update Customer" : "Save Customer"}</Text>}
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
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: C.border },
  iconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.s2, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  title: { color: C.text, fontSize: 18, fontWeight: "800" },
  searchRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.s2, margin: 16, marginBottom: 0, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border, gap: 8 },
  searchInput: { flex: 1, color: C.text, height: 44, fontSize: 14 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: C.s2, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: C.border, marginBottom: 10, gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#000", fontWeight: "900", fontSize: 15 },
  cardInfo: { flex: 1 },
  cardTitle: { color: C.text, fontSize: 13, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: C.muted, fontSize: 10 },
  emptyText: { color: C.muted, textAlign: "center", marginTop: 40, fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.7)" },
  modalContent: { backgroundColor: C.s1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: C.border, maxHeight: "92%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { color: C.text, fontSize: 18, fontWeight: "800" },
  field: { marginBottom: 12 },
  fieldLabel: { color: C.muted, fontSize: 11, fontWeight: "600", marginBottom: 5 },
  fieldInput: { backgroundColor: C.s2, color: C.text, borderRadius: 10, paddingHorizontal: 14, height: 42, borderWidth: 1, borderColor: C.border, fontSize: 14 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: C.s2, borderWidth: 1, borderColor: C.border },
  chipActive: { backgroundColor: `${C.accent}20`, borderColor: C.accent },
  chipText: { color: C.muted, fontSize: 11, fontWeight: "600" },
  chipTextActive: { color: C.accent },
  saveBtn: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8, marginBottom: 20 },
  saveBtnText: { color: "#000", fontWeight: "800", fontSize: 15 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12, marginTop: 4 },
  toggleBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: C.muted, alignItems: "center", justifyContent: "center" },
  toggleBoxActive: { backgroundColor: C.accent, borderColor: C.accent },
  toggleLabel: { color: C.text, fontSize: 13, fontWeight: "600" },
});
