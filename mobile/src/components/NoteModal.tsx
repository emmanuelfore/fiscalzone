import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { X, Minus, Plus } from "lucide-react-native";
import { PremiumColors as C } from "../ui/PremiumColors";
import { ManagerPinModal } from "../ui/ManagerPinModal";
import { apiFetch } from "../lib/api";
import { addPendingNote } from "../lib/offlineQueue";
import { printReceipt, printToBluetooth } from "../lib/printing";

interface AdjustedItem {
  originalItem: any;
  qty: number;
  unitPrice: number;
}

interface PrinterConfig {
  macAddress: string;
  terminalId: string;
  targetPrinter: string;
  paperWidth: number;
}

export interface NoteModalProps {
  visible: boolean;
  noteType: "credit" | "debit";
  originalInvoice: any;
  originalItems: any[];
  companyId: number;
  company: any;
  creditThreshold: number;
  currencySymbol: string;
  cashierName?: string;
  printerConfig: PrinterConfig;
  isOnline: boolean;
  onClose: () => void;
  onSuccess: (note: any) => void;
}

const isFiscal = (company: any) => !!(company?.vatRegistered && company?.vatNumber);

export function NoteModal({
  visible,
  noteType,
  originalInvoice,
  originalItems,
  companyId,
  company,
  creditThreshold,
  currencySymbol,
  cashierName,
  printerConfig,
  isOnline,
  onClose,
  onSuccess,
}: NoteModalProps) {
  const [adjustedItems, setAdjustedItems] = useState<AdjustedItem[]>([]);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens with new invoice
  useEffect(() => {
    if (visible && originalItems.length > 0) {
      setAdjustedItems(
        originalItems.map((item: any) => ({
          originalItem: item,
          qty: Number(item.quantity || 0),
          unitPrice: Number(item.unitPrice || item.price || 0),
        }))
      );
      setReason("");
      setError(null);
      setIsSubmitting(false);
    }
  }, [visible, originalItems]);

  const noteTotal = adjustedItems.reduce(
    (sum, item) => sum + item.qty * item.unitPrice,
    0
  );

  const label = noteType === "credit" ? "Credit Note" : "Debit Note";

  const updateQty = (index: number, delta: number) => {
    setAdjustedItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const maxQty = Number(item.originalItem.quantity || 0);
        const newQty = Math.max(0, Math.min(maxQty, item.qty + delta));
        return { ...item, qty: newQty };
      })
    );
  };

  const updatePrice = (index: number, val: string) => {
    const parsed = parseFloat(val.replace(",", "."));
    setAdjustedItems((prev) =>
      prev.map((item, i) =>
        i !== index ? item : { ...item, unitPrice: isNaN(parsed) ? 0 : parsed }
      )
    );
  };

  const validate = (): string | null => {
    if (adjustedItems.every((item) => item.qty === 0)) {
      return "At least one item must have a quantity greater than zero.";
    }
    if (adjustedItems.some((item) => item.unitPrice < 0)) {
      return "Unit prices cannot be negative.";
    }
    return null;
  };

  const buildPayload = () => ({
    items: adjustedItems
      .filter((item) => item.qty > 0)
      .map((item) => ({
        productId: item.originalItem.productId,
        description: item.originalItem.description || item.originalItem.name,
        quantity: item.qty.toString(),
        unitPrice: item.unitPrice.toFixed(2),
        taxRate: item.originalItem.taxRate?.toString() ?? "0",
        taxTypeId: item.originalItem.taxTypeId ?? null,
        lineTotal: (item.qty * item.unitPrice).toFixed(2),
      })),
    reason: reason.trim() || undefined,
    cashierName: cashierName,
    currency: originalInvoice.currency,
    exchangeRate: originalInvoice.exchangeRate,
    originalInvoiceNumber: originalInvoice.invoiceNumber,
  });

  const handleConfirm = () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    // Credit notes above threshold require manager PIN
    if (noteType === "credit" && noteTotal > creditThreshold) {
      setShowPinModal(true);
    } else {
      submitNote();
    }
  };

  const submitNote = async () => {
    setIsSubmitting(true);
    const payload = buildPayload();

    try {
      if (!isOnline) {
        // Offline path
        const offlineId = await addPendingNote(
          companyId,
          originalInvoice.id,
          noteType,
          payload
        );
        const offlineNote = {
          id: offlineId,
          _offline: true,
          invoiceNumber: `${noteType === "credit" ? "CN" : "DN"}-PENDING`,
          issueDate: new Date().toISOString(),
          total: noteTotal.toFixed(2),
          paymentMethod: originalInvoice.paymentMethod,
          items: payload.items,
          currency: payload.currency,
          exchangeRate: payload.exchangeRate,
        };
        offerPrint(offlineNote);
        onSuccess(offlineNote);
        onClose();
        return;
      }

      // Online path
      const endpoint =
        noteType === "credit"
          ? `/api/invoices/${originalInvoice.id}/credit-note`
          : `/api/invoices/${originalInvoice.id}/debit-note`;

      const res = await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        setError(msg || `Failed to create ${label}.`);
        return;
      }

      const note = await res.json();

      // Fiscalise for VAT companies
      if (isFiscal(company)) {
        try {
          await apiFetch(`/api/invoices/${note.id}/fiscalize`, { method: "POST" });
        } catch {
          Alert.alert(
            "Fiscalisation Warning",
            `${label} was created but fiscalisation failed. You can retry from the invoice.`
          );
        }
      }

      offerPrint(note);
      onSuccess(note);
      onClose();
    } catch (e: any) {
      setError(e?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const offerPrint = (note: any) => {
    Alert.alert("Print Receipt", `Print ${label} receipt?`, [
      { text: "Skip", style: "cancel" },
      {
        text: "Print",
        onPress: async () => {
          const ticketData = {
            invoice: note,
            company,
            items: note.items || payload_items_from_adjusted(),
            currencySymbol,
            cashierName,
            paidAmount: noteTotal,
            paperWidth: printerConfig.paperWidth,
            terminalId: printerConfig.terminalId,
            noteType,
            originalInvoiceNumber: originalInvoice.invoiceNumber,
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
          }
        },
      },
    ]);
  };

  const payload_items_from_adjusted = () =>
    adjustedItems
      .filter((item) => item.qty > 0)
      .map((item) => ({
        description: item.originalItem.description || item.originalItem.name,
        quantity: item.qty,
        unitPrice: item.unitPrice,
        lineTotal: item.qty * item.unitPrice,
        taxRate: item.originalItem.taxRate ?? 0,
        taxCode: item.originalItem.taxCode,
      }));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{label}</Text>
            <Text style={styles.headerSub}>
              Ref: {originalInvoice?.invoiceNumber || `#${originalInvoice?.id}`}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={C.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Item list */}
        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 16 }}>
          {adjustedItems.map((item, index) => {
            const lineTotal = item.qty * item.unitPrice;
            const dimmed = item.qty === 0;
            return (
              <View
                key={index}
                style={[styles.itemRow, dimmed && styles.itemRowDimmed]}
              >
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.originalItem.description || item.originalItem.name}
                </Text>
                <View style={styles.itemControls}>
                  {/* Qty stepper */}
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      onPress={() => updateQty(index, -1)}
                      style={styles.stepBtn}
                    >
                      <Minus size={14} color={C.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.stepValue}>{item.qty}</Text>
                    <TouchableOpacity
                      onPress={() => updateQty(index, 1)}
                      style={styles.stepBtn}
                    >
                      <Plus size={14} color={C.text.primary} />
                    </TouchableOpacity>
                  </View>
                  {/* Unit price */}
                  <TextInput
                    style={styles.priceInput}
                    value={item.unitPrice.toFixed(2)}
                    onChangeText={(v) => updatePrice(index, v)}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />
                  {/* Line total */}
                  <Text style={styles.lineTotal}>
                    {currencySymbol}{lineTotal.toFixed(2)}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Reason */}
          <View style={styles.reasonContainer}>
            <Text style={styles.reasonLabel}>Reason (optional)</Text>
            <TextInput
              style={styles.reasonInput}
              value={reason}
              onChangeText={(v) => setReason(v.slice(0, 200))}
              placeholder="Enter reason..."
              placeholderTextColor={C.text.secondary}
              multiline
              maxLength={200}
            />
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Note Total</Text>
            <Text style={styles.totalValue}>
              {currencySymbol}{noteTotal.toFixed(2)}
            </Text>
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={isSubmitting}
              style={[styles.confirmBtn, isSubmitting && { opacity: 0.6 }]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={styles.confirmBtnText}>Confirm</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Manager PIN gate */}
      <ManagerPinModal
        visible={showPinModal}
        companyId={companyId}
        title="Manager Authorisation"
        description={`Credit note total ${currencySymbol}${noteTotal.toFixed(2)} exceeds threshold. Manager PIN required.`}
        onClose={() => setShowPinModal(false)}
        onAuthorized={() => {
          setShowPinModal(false);
          submitNote();
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg.base },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border.default,
  },
  headerTitle: { color: C.text.primary, fontSize: 18, fontWeight: "900" },
  headerSub: { color: C.text.secondary, fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.bg.hover, alignItems: "center", justifyContent: "center",
  },
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  itemRow: {
    backgroundColor: C.bg.hover, borderRadius: 12, borderWidth: 1,
    borderColor: C.border.default, padding: 12, marginBottom: 8,
  },
  itemRowDimmed: { opacity: 0.4 },
  itemName: { color: C.text.primary, fontSize: 13, fontWeight: "700", marginBottom: 8 },
  itemControls: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepper: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.bg.base, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4,
    borderWidth: 1, borderColor: C.border.default,
  },
  stepBtn: { padding: 4 },
  stepValue: { color: C.text.primary, fontSize: 14, fontWeight: "700", minWidth: 24, textAlign: "center" },
  priceInput: {
    flex: 1, backgroundColor: C.bg.base, color: C.text.primary,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6,
    borderWidth: 1, borderColor: C.border.default, fontSize: 13, textAlign: "right",
  },
  lineTotal: { color: C.amber.primary, fontSize: 13, fontWeight: "800", minWidth: 60, textAlign: "right" },
  reasonContainer: { marginTop: 8 },
  reasonLabel: { color: C.text.secondary, fontSize: 12, fontWeight: "600", marginBottom: 6 },
  reasonInput: {
    backgroundColor: C.bg.hover, color: C.text.primary, borderRadius: 10,
    borderWidth: 1, borderColor: C.border.default, padding: 10,
    fontSize: 13, minHeight: 70, textAlignVertical: "top",
  },
  footer: {
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: C.border.default,
    gap: 10,
  },
  errorText: { color: C.status.error, fontSize: 12, fontWeight: "700" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { color: C.text.secondary, fontSize: 14, fontWeight: "600" },
  totalValue: { color: C.text.primary, fontSize: 20, fontWeight: "900" },
  btnRow: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: C.bg.hover, borderWidth: 1, borderColor: C.border.default,
    alignItems: "center",
  },
  cancelBtnText: { color: C.text.secondary, fontSize: 14, fontWeight: "700" },
  confirmBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 14,
    backgroundColor: C.amber.primary, alignItems: "center",
  },
  confirmBtnText: { color: "#000", fontSize: 14, fontWeight: "900" },
});
