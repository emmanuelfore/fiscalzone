import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Dimensions,
  StyleSheet
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Lock, Mail, User as UserIcon, ArrowRight, Eye, EyeOff } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { PremiumColors as C } from "../ui/PremiumColors";
import { StatusBar } from "expo-status-bar";

const { width } = Dimensions.get("window");

type Props = {
  onLoggedIn: () => void;
  onForgotPassword: () => void;
};

export function LoginScreen({ onLoggedIn, onForgotPassword }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

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
          password,
        });
        if (e) throw e;
        onLoggedIn();
      } else {
        const { data, error: e } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } },
        });
        if (e) throw e;

        if (data.session) {
          onLoggedIn();
        } else {
          // Registration successful but requires email verification
          setError("account_created_verify");
          setBusy(false);
          return;
        }
      }
    } catch (e: any) {
      setError(e?.message ?? "Authentication failed");
    } finally {
      if (error !== "account_created_verify") {
        setBusy(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#0a0a0a", "#1a1000", "#0a0a0a"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
          <View style={styles.header}>
            <View style={styles.logoGlow} />
            <Text style={styles.brandText}>
              Field<Text style={{ color: C.amber.primary }}>POS</Text>
            </Text>
            <Text style={styles.tagline}>Precision enterprise management</Text>
          </View>

          <View style={styles.glassCard}>
            <Text style={styles.modeTitle}>
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </Text>
            <Text style={styles.modeSub}>
              {mode === "login" ? "Sign in to manage your inventory" : "Register your business to get started"}
            </Text>

            {mode === "register" && (
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Full Name</Text>
                <View
                  style={[
                    styles.inputContainer,
                    focusedInput === "name" && styles.inputFocused,
                  ]}
                >
                  <UserIcon size={18} color={focusedInput === "name" ? C.amber.primary : C.text.secondary} />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your name"
                    placeholderTextColor={C.text.secondary}
                    style={styles.input}
                    onFocus={() => setFocusedInput("name")}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
              </View>
            )}

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Email Address</Text>
              <View
                style={[
                  styles.inputContainer,
                  focusedInput === "email" && styles.inputFocused,
                ]}
              >
                <Mail size={18} color={focusedInput === "email" ? C.amber.primary : C.text.secondary} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@company.com"
                  placeholderTextColor={C.text.secondary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                  onFocus={() => setFocusedInput("email")}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Password</Text>
              <View
                style={[
                  styles.inputContainer,
                  focusedInput === "password" && styles.inputFocused,
                ]}
              >
                <Lock size={18} color={focusedInput === "password" ? C.amber.primary : C.text.secondary} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={C.text.secondary}
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <EyeOff size={18} color={C.text.secondary} />
                  ) : (
                    <Eye size={18} color={C.text.secondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {error === "account_created_verify" ? (
              <View style={[styles.errorContainer, { borderColor: C.amber.glow, backgroundColor: "rgba(255, 149, 0, 0.05)" }]}>
                <Text style={[styles.errorText, { color: C.amber.light }]}>
                  Account created! Please check your email to verify your account before signing in.
                </Text>
              </View>
            ) : error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={submit}
              disabled={!canSubmit || busy}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={canSubmit ? [C.amber.primary, "#D97000"] : ["#e0730dff", "#e77d04ff"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              {busy ? (
                <Text style={styles.submitBtnText}>Processing...</Text>
              ) : (
                <>
                  <Text style={styles.submitBtnText}>
                    {mode === "login" ? "Sign In" : "Register"}
                  </Text>
                  <ArrowRight size={18} color="#000" />
                </>
              )}
            </TouchableOpacity>

            {mode === "login" && (
              <TouchableOpacity
                onPress={onForgotPassword}
                style={{ alignSelf: "flex-end", marginBottom: 20 }}
              >
                <Text style={{ color: C.amber.primary, fontSize: 13, fontWeight: "700", marginTop: 20 }}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setMode((m) => (m === "login" ? "register" : "login"));
                setError(null);
              }}
              style={styles.switchButton}
            >
              <Text style={styles.switchText}>
                {mode === "login" ? "Don't have an account? " : "Already registered? "}
                <Text style={{ color: C.amber.primary }}>
                  {mode === "login" ? "Create Account" : "Sign In"}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Secure Cloud Infrastructure</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoGlow: {
    position: "absolute",
    top: -20,
    width: 120,
    height: 120,
    backgroundColor: C.amber.primary,
    borderRadius: 60,
    opacity: 0.1,
    transform: [{ scale: 2 }],
  },
  brandText: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: -1,
  },
  tagline: {
    color: C.text.secondary,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
    letterSpacing: 0.5,
  },
  glassCard: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  modeTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
  },
  modeSub: {
    color: C.text.secondary,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 32,
    lineHeight: 20,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    color: C.text.secondary,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 10,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  inputContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 56,
  },
  inputFocused: {
    borderColor: C.amber.primary,
    backgroundColor: "rgba(255, 165, 0, 0.03)",
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
  },
  errorContainer: {
    backgroundColor: "rgba(255, 71, 87, 0.1)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 71, 87, 0.2)",
  },
  errorText: {
    color: "#ff4757",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  submitBtn: {
    height: 60,
    borderRadius: 18,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  submitBtnDisabled: {
    opacity: 0.8,
  },
  submitBtnText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  switchButton: {
    marginTop: 24,
    alignItems: "center",
  },
  switchText: {
    color: C.text.secondary,
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    marginTop: 40,
    alignItems: "center",
  },
  footerText: {
    color: "rgba(255, 255, 255, 0.2)",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
});


