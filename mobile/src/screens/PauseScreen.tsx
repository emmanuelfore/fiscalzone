import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Pause, Play, ShieldCheck, User, Wifi, WifiOff, X } from "lucide-react-native";
import { apiFetch } from "../lib/api";
import { getPausedState, PausedState, setPausedState } from "../lib/storage";
import { supabase } from "../lib/supabase";
import { PremiumColors } from "../ui/PremiumColors";
import { Button } from "../ui/Button";

type Props = {
  companyId: number | null;
  onChangeCompany: () => void;
  onSignOut: () => void;
};

type ApiUser = {
  id: string;
  email: string;
  name?: string | null;
};

export function PauseScreen({ companyId, onChangeCompany, onSignOut }: Props) {
  const [pausedState, setPausedStateLocal] = useState<PausedState>({ paused: false, pausedAt: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [online, setOnline] = useState<boolean>(true);

  const [showUnlock, setShowUnlock] = useState(false);
  const [pin, setPin] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const refresh = async () => {
    setError(null);
    setBusy(true);
    try {
      const local = await getPausedState();
      setPausedStateLocal(local);

      const health = await apiFetch("/api/health").catch(() => null);
      setOnline(!!health && health.ok);

      const res = await apiFetch("/api/user");
      if (!res.ok) throw new Error(`Failed to load user (${res.status})`);
      const data = await res.json();
      setUser(data?.user ?? null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to refresh");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const title = useMemo(() => (pausedState.paused ? "Paused" : "Active"), [pausedState.paused]);
  const subtitle = useMemo(() => {
    if (pausedState.paused && pausedState.pausedAt) {
      try {
        const t = new Date(pausedState.pausedAt);
        return `Paused at ${t.toLocaleTimeString()}`;
      } catch {
        return "Paused";
      }
    }
    return "Terminal is active";
  }, [pausedState.paused, pausedState.pausedAt]);

  const pauseNow = async () => {
    setError(null);
    setBusy(true);
    try {
      const next: PausedState = { paused: true, pausedAt: new Date().toISOString() };
      await setPausedState(next);
      setPausedStateLocal(next);
    } catch (e: any) {
      setError(e?.message ?? "Failed to pause");
    } finally {
      setBusy(false);
    }
  };

  const requestResume = () => {
    setPin("");
    setPinError(null);
    setShowUnlock(true);
  };

  const resumeWithPin = async () => {
    if (!companyId) {
      setPinError("No company selected");
      return;
    }
    setPinError(null);
    setPinBusy(true);
    try {
      const res = await apiFetch(`/api/companies/${companyId}/auth/verify-manager-pin`, {
        method: "POST",
        body: JSON.stringify({ pin })
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Invalid PIN");
      }

      const next: PausedState = { paused: false, pausedAt: null };
      await setPausedState(next);
      setPausedStateLocal(next);
      setShowUnlock(false);
    } catch (e: any) {
      setPinError(e?.message ?? "Invalid PIN");
    } finally {
      setPinBusy(false);
    }
  };

  const signOut = async () => {
    // Keep it simple for now; you can add offline protections like the web app later.
    await supabase.auth.signOut();
    onSignOut();
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 18 }}>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <View>
          <Text style={{ color: "white", fontSize: 26, fontWeight: "900", letterSpacing: -0.5 }}>
            Pause Control
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.45)", marginTop: 6, fontSize: 12, fontWeight: "700" }}>
            {user?.name || user?.email || "Signed in"}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: online ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
              borderWidth: 1,
              borderColor: online ? "rgba(34,197,94,0.22)" : "rgba(239,68,68,0.22)"
            }}
          >
            {online ? <Wifi size={12} color="#22c55e" /> : <WifiOff size={12} color="#ef4444" />}
            <Text style={{ marginLeft: 6, fontSize: 10, fontWeight: "900", color: online ? "#22c55e" : "#ef4444" }}>
              {online ? "ONLINE" : "OFFLINE"}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={signOut}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: "rgba(255,255,255,0.07)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <User size={18} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Card */}
      <View style={{ borderRadius: 28, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
        <LinearGradient
          colors={pausedState.paused ? ["#2c1800", "#1e1000"] : ["#1a1208", "#130e05"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 18, borderRadius: 28 }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={{ color: "white", fontSize: 22, fontWeight: "900" }}>{title}</Text>
              <Text style={{ color: "rgba(255,255,255,0.45)", marginTop: 6, fontSize: 12, fontWeight: "700" }}>
                {subtitle}
              </Text>
            </View>

            <View
              style={{
                width: 62,
                height: 62,
                borderRadius: 22,
                backgroundColor: pausedState.paused ? "rgba(255,149,0,0.14)" : "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderColor: pausedState.paused ? "rgba(255,149,0,0.25)" : "rgba(255,255,255,0.10)",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              {pausedState.paused ? <Pause size={26} color={PremiumColors.amber.light} /> : <Play size={26} color="rgba(255,255,255,0.7)" />}
            </View>
          </View>

          {error && (
            <Text style={{ color: "#f87171", fontSize: 12, fontWeight: "800", marginTop: 12 }}>
              {error}
            </Text>
          )}

          <View style={{ height: 16 }} />

          <View style={{ flexDirection: "row", gap: 10 }}>
            {pausedState.paused ? (
              <Button
                title="Resume"
                onPress={requestResume}
                loading={busy}
                style={{ flex: 1 }}
              />
            ) : (
              <Button
                title="Pause"
                onPress={pauseNow}
                loading={busy}
                style={{ flex: 1 }}
              />
            )}

            <Button
              title="Company"
              variant="ghost"
              onPress={onChangeCompany}
              disabled={busy}
              style={{ width: 120 }}
            />
          </View>

          <View style={{ height: 12 }} />

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={refresh}
            style={{
              borderRadius: 18,
              paddingVertical: 12,
              backgroundColor: "rgba(255,255,255,0.04)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8
            }}
          >
            {busy ? (
              <ActivityIndicator color={PremiumColors.amber.primary} />
            ) : (
              <ShieldCheck size={16} color="rgba(255,255,255,0.45)" />
            )}
            <Text style={{ color: "rgba(255,255,255,0.6)", fontWeight: "900", letterSpacing: 1.2, textTransform: "uppercase", fontSize: 10 }}>
              Refresh status
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* Unlock modal */}
      <Modal visible={showUnlock} transparent animationType="fade" onRequestClose={() => setShowUnlock(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.80)", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View style={{ width: "100%", maxWidth: 420, borderRadius: 28, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" }}>
            <LinearGradient colors={[PremiumColors.bg.card, "#130e05"]} style={{ padding: 18 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ color: "white", fontSize: 18, fontWeight: "900" }}>Manager PIN</Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setShowUnlock(false)}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" }}
                >
                  <X size={18} color="white" />
                </TouchableOpacity>
              </View>

              <Text style={{ color: "rgba(255,255,255,0.45)", marginTop: 8, fontSize: 12, fontWeight: "700" }}>
                Enter an owner/admin PIN to resume.
              </Text>

              <View style={{ height: 14 }} />

              <View style={{ backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14 }}>
                <TextInput
                  value={pin}
                  onChangeText={setPin}
                  keyboardType="number-pad"
                  secureTextEntry
                  placeholder="••••"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  style={{ color: "white", fontSize: 22, fontWeight: "900", letterSpacing: 6, textAlign: "center" }}
                  maxLength={8}
                />
              </View>

              {pinError && (
                <Text style={{ color: "#f87171", fontSize: 12, fontWeight: "800", marginTop: 12 }}>
                  {pinError}
                </Text>
              )}

              <View style={{ height: 16 }} />

              <Button title="Unlock" onPress={resumeWithPin} loading={pinBusy} disabled={!pin.trim()} />
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </View>
  );
}

