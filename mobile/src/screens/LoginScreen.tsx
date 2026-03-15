import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Lock, Mail } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { PremiumColors } from "../ui/PremiumColors";
import { Button } from "../ui/Button";

type Props = {
  onLoggedIn: () => void;
};

export function LoginScreen({ onLoggedIn }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!email.trim() || !password) return false;
    if (mode === "register" && !name.trim()) return false;
    return true;
  }, [email, password, name, mode]);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        const { error: e } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (e) throw e;
      } else {
        const { error: e } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } }
        });
        if (e) throw e;
      }
      onLoggedIn();
    } catch (e: any) {
      setError(e?.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 18 }}>
        <Text style={{ color: "white", fontSize: 28, fontWeight: "900", letterSpacing: -0.5 }}>
          POS
        </Text>


        <View style={{ marginTop: 22, borderRadius: 26, overflow: "hidden" }}>
          <LinearGradient
            colors={[PremiumColors.bg.card, "#130e05"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 26 }}
          >
            {mode === "register" && (
              <>
                <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" }}>
                  Name
                </Text>
                <View
                  style={{
                    marginTop: 8,
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.10)",
                    borderRadius: 16,
                    paddingHorizontal: 14,
                    paddingVertical: 12
                  }}
                >
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Your name"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    style={{ color: "white", fontSize: 14, fontWeight: "700" }}
                  />
                </View>
                <View style={{ height: 14 }} />
              </>
            )}

            <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" }}>
              Email
            </Text>
            <View
              style={{
                marginTop: 8,
                backgroundColor: "rgba(255,255,255,0.05)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 10
              }}
            >
              <Mail size={16} color="rgba(255,255,255,0.35)" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@company.com"
                placeholderTextColor="rgba(255,255,255,0.25)"
                autoCapitalize="none"
                keyboardType="email-address"
                style={{ color: "white", fontSize: 14, fontWeight: "700", flex: 1 }}
              />
            </View>

            <View style={{ height: 14 }} />

            <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" }}>
              Password
            </Text>
            <View
              style={{
                marginTop: 8,
                backgroundColor: "rgba(255,255,255,0.05)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 10
              }}
            >
              <Lock size={16} color="rgba(255,255,255,0.35)" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="rgba(255,255,255,0.25)"
                secureTextEntry
                style={{ color: "white", fontSize: 14, fontWeight: "700", flex: 1 }}
              />
            </View>

            {error && (
              <Text style={{ color: "#f87171", fontSize: 12, fontWeight: "700", marginTop: 12 }}>
                {error}
              </Text>
            )}

            <View style={{ height: 16 }} />

            <Button
              title={mode === "login" ? "Sign in" : "Create account"}
              onPress={submit}
              disabled={!canSubmit}
              loading={busy}
            />

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setMode((m) => (m === "login" ? "register" : "login"))}
              style={{ marginTop: 14, alignItems: "center" }}
            >
              <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "800" }}>
                {mode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

