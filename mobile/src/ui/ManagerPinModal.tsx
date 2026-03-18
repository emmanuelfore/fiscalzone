import React, { useState } from "react";
import { ActivityIndicator, Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { X } from "lucide-react-native";
import { PremiumColors as C } from "./PremiumColors";
import { apiFetch } from "../lib/api";
import { Button } from "./Button";

type Props = {
  visible: boolean;
  companyId: number;
  title: string;
  description?: string;
  onClose: () => void;
  onAuthorized: (manager: any) => void;
};

export function ManagerPinModal({ visible, companyId, title, description, onClose, onAuthorized }: Props) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await apiFetch(`/api/companies/${companyId}/auth/verify-manager-pin`, {
        method: "POST",
        body: JSON.stringify({ pin })
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Invalid PIN");
      }
      const data = await res.json();
      if (!data?.authorized) throw new Error(data?.message || "Not authorized");
      onAuthorized(data.manager);
      setPin("");
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Invalid PIN");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.80)", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <View style={{ width: "100%", maxWidth: 420, borderRadius: 28, overflow: "hidden", borderWidth: 1, borderColor: C.border.default }}>
          <LinearGradient colors={[C.bg.card, "#130e05"]} style={{ padding: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: C.text.primary, fontSize: 18, fontWeight: "900" }}>{title}</Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={onClose}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.bg.hover, alignItems: "center", justifyContent: "center" }}
              >
                <X size={18} color={C.text.primary} />
              </TouchableOpacity>
            </View>

            {description ? (
              <Text style={{ color: C.text.secondary, marginTop: 8, fontSize: 12, fontWeight: "700" }}>
                {description}
              </Text>
            ) : null}

            <View style={{ height: 14 }} />

            <View style={{ backgroundColor: C.bg.hover, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14 }}>
              <TextInput
                value={pin}
                onChangeText={setPin}
                keyboardType="number-pad"
                secureTextEntry
                placeholder="••••"
                placeholderTextColor={C.text.secondary}
                style={{ color: C.text.primary, fontSize: 22, fontWeight: "900", letterSpacing: 6, textAlign: "center" }}
                maxLength={8}
              />
            </View>

            {error ? (
              <Text style={{ color: C.status.error, fontSize: 12, fontWeight: "800", marginTop: 12 }}>
                {error}
              </Text>
            ) : null}

            <View style={{ height: 16 }} />

            {busy ? (
              <View style={{ paddingVertical: 10, alignItems: "center" }}>
                <ActivityIndicator color={C.amber.primary} />
              </View>
            ) : null}

            <Button title="Authorize" onPress={submit} disabled={!pin.trim()} loading={busy} />
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

