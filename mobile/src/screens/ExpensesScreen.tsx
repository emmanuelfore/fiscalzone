import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, ActivityIndicator, Alert, ScrollView, Modal,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { Menu, Search, Plus, Receipt, X, Calendar, DollarSign, Edit2, ChevronDown } from "lucide-react-native";
import { StatusBar } from "expo-status-bar";
import { apiJson, apiFetch } from "../lib/api";

const C = {
  bg: "#07090c", s1: "#0d1117", s2: "#141b24",
  border: "#1f2d3d", accent: "#f0a500", text: "#e8edf5",
  muted: "#3d5166", green: "#00d084", red: "#ff4757",
} as const;

interface Props { onOpenDrawer: () => void; companyId: number; }

function useExpenses(companyId: number) {
  const [data, setData] = useState<any[] | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiJson<any[]>(`/api/companies/${companyId}/expenses`)
      .then((res) => { if (!cancelled) { setData(res); setLoading(false); } })
      .catch((e: any) => { if (!cancelled) { setError(e?.message); setLoading(false); } });

    return () => { cancelled = true; };
  }, [companyId]);

  return { data, isLoading, error, refresh: () => {
    setLoading(true);
    apiJson<any[]>(`/api/companies/${companyId}/expenses`)
      .then((res) => { setData(res); setLoading(false); })
      .catch((e: any) => { setError(e?.message); setLoading(false); });
  }};
}

const CATEGORIES = ["Rent", "Utilities", "Salary", "Supplies", "Marketing", "Transport", "Office", "Taxes", "Maintenance", "Other"];

const emptyExpense = { description: "", amount: "", category: "Other", supplierId: null, expenseDate: new Date().toISOString() };

export function ExpensesScreen({ onOpenDrawer, companyId }: Props) {
  const { data: expenses, isLoading, refresh } = useExpenses(companyId);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyExpense);
  const [saving, setSaving] = useState(false);

  const totalExpenses = useMemo(() => {
    if (!expenses) return 0;
    return expenses.reduce((sum, e: any) => sum + Number(e.amount || 0), 0);
  }, [expenses]);

  const filtered = useMemo(() => {
    if (!expenses) return [];
    const q = search.toLowerCase();
    return expenses.filter((e: any) =>
      e.description?.toLowerCase().includes(q) || e.category?.toLowerCase().includes(q)
    );
  }, [expenses, search]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyExpense, expenseDate: new Date().toISOString() });
    setShowForm(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      description: item.description || "",
      amount: String(item.amount || ""),
      category: item.category || "Other",
      supplierId: item.supplierId || null,
      expenseDate: item.expenseDate || new Date().toISOString(),
    });
    setShowForm(true);
  };

  const handleSave = useCallback(async () => {
    if (!form.description.trim()) return Alert.alert("Error", "Description is required");
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) return Alert.alert("Error", "Valid amount is required");
    
    setSaving(true);
    try {
      const body = {
        description: form.description.trim(),
        amount: amt,
        category: form.category,
        expenseDate: form.expenseDate,
        companyId,
        supplierId: form.supplierId,
      };
      
      const url = editingId 
        ? `/api/expenses/${editingId}` // Assuming PATCH /api/expenses/:id exists or similar
        : `/api/companies/${companyId}/expenses`;
      
      const method = editingId ? "PATCH" : "POST";
      
      // If PATCH /api/expenses/:id doesn't exist, we might need a different route.
      // But usually, standard REST patterns apply.
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || `Failed to ${editingId ? "update" : "save"} expense`);
      }

      setShowForm(false);
      refresh();
      // Subtle feedback could be handled by a toast, but for now we just close the modal
      // as that's already better than a blocking alert.
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setSaving(false); }
  }, [form, companyId, editingId, refresh]);

  const renderItem = ({ item }: { item: any }) => {
    const dateStr = item.expenseDate ? new Date(item.expenseDate).toLocaleDateString() : "";
    return (
      <TouchableOpacity style={styles.card} onPress={() => openEdit(item)} activeOpacity={0.7}>
        <View style={styles.cardIcon}><Receipt size={18} color={C.red} /></View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.description}</Text>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
            <Text style={styles.metaText}>{item.category || "Other"}</Text>
            {dateStr && <View style={styles.metaRow}><Calendar size={10} color={C.muted} /><Text style={styles.metaText}>{dateStr}</Text></View>}
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.cardPrice, { color: C.red }]}>-${Number(item.amount || 0).toFixed(2)}</Text>
          <Edit2 size={12} color={C.muted} style={{ marginTop: 4 }} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onOpenDrawer} style={styles.iconBtn}><Menu size={20} color={C.text} /></TouchableOpacity>
          <Text style={styles.title}>Expenses</Text>
          <TouchableOpacity onPress={openAdd} style={[styles.iconBtn, { backgroundColor: C.accent }]}><Plus size={20} color="#000" /></TouchableOpacity>
        </View>

        <View style={styles.totalBar}>
          <DollarSign size={16} color={C.red} />
          <Text style={styles.totalLabel}>Total Expenses:</Text>
          <Text style={[styles.totalValue, { color: C.red }]}>${totalExpenses.toFixed(2)}</Text>
        </View>

        <View style={styles.searchRow}>
          <Search size={16} color={C.muted} />
          <TextInput style={styles.searchInput} placeholder="Search expenses..." placeholderTextColor={C.muted} value={search} onChangeText={setSearch} />
        </View>
        {isLoading && !expenses ? (
          <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
            ListEmptyComponent={<Text style={styles.emptyText}>No expenses recorded.</Text>}
          />
        )}

        <Modal visible={showForm} transparent animationType="slide">
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingId ? "Edit Expense" : "Add Expense"}</Text>
                <TouchableOpacity onPress={() => setShowForm(false)}><X size={20} color={C.text} /></TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Description *</Text>
                  <TextInput style={styles.fieldInput} placeholder="e.g. Office Supplies" placeholderTextColor={C.muted} value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Amount *</Text>
                  <TextInput style={styles.fieldInput} placeholder="0.00" placeholderTextColor={C.muted} keyboardType="numeric" value={form.amount} onChangeText={(v) => setForm({ ...form, amount: v })} />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Category</Text>
                  <View style={styles.catGrid}>
                    {CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.catChip, form.category === cat && styles.catChipActive]}
                        onPress={() => setForm({ ...form, category: cat })}
                      >
                        <Text style={[styles.catChipText, form.category === cat && styles.catChipTextActive]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>
              
              <View style={{ paddingTop: 16, borderTopWidth: 1, borderTopColor: C.border, marginTop: 10 }}>
                <TouchableOpacity style={[styles.saveBtn, { marginTop: 0, marginBottom: 0 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>{editingId ? "Update Expense" : "Save Expense"}</Text>}
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
  totalBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.s1, borderBottomWidth: 1, borderBottomColor: C.border },
  totalLabel: { color: C.muted, fontSize: 13, fontWeight: "600" },
  totalValue: { fontSize: 16, fontWeight: "800", marginLeft: "auto" },
  searchRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.s2, margin: 16, marginBottom: 0, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border, gap: 8 },
  searchInput: { flex: 1, color: C.text, height: 44, fontSize: 14 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: C.s2, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: C.border, marginBottom: 10, gap: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(255,71,87,0.1)", alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1 },
  cardTitle: { color: C.text, fontSize: 14, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: C.muted, fontSize: 11 },
  cardRight: { alignItems: "flex-end" },
  cardPrice: { fontSize: 14, fontWeight: "800" },
  emptyText: { color: C.muted, textAlign: "center", marginTop: 40, fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.7)" },
  modalContent: { backgroundColor: C.s1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: C.border, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { color: C.text, fontSize: 18, fontWeight: "800" },
  field: { marginBottom: 16 },
  fieldLabel: { color: C.muted, fontSize: 12, fontWeight: "600", marginBottom: 6 },
  fieldInput: { backgroundColor: C.s2, color: C.text, borderRadius: 10, paddingHorizontal: 14, height: 44, borderWidth: 1, borderColor: C.border, fontSize: 14 },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: C.s2, borderWidth: 1, borderColor: C.border },
  catChipActive: { backgroundColor: `${C.accent}20`, borderColor: C.accent },
  catChipText: { color: C.muted, fontSize: 12, fontWeight: "600" },
  catChipTextActive: { color: C.accent },
  saveBtn: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#000", fontWeight: "800", fontSize: 15 },
});
