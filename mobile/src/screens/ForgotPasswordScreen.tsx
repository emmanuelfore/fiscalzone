import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  StyleSheet,
  Dimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Mail, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { PremiumColors as C } from "../ui/PremiumColors";
import { StatusBar } from "expo-status-bar";

const { width } = Dimensions.get("window");

type Props = {
  onBack: () => void;
};

export function ForgotPasswordScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [focusedInput, setFocusedInput] = useState<boolean>(false);

  const handleReset = async () => {
    if (!email.trim() || busy) return;
    
    setError(null);
    setBusy(true);
    try {
      // Use the API endpoint which uses supabase.auth.resetPasswordForEmail
      // We could also call supabase.auth.resetPasswordForEmail(email) directly here 
      // if configured correctly with deep links.
      const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: "https://fisczim.fiscalstack.co.zw/reset-password", // Redirect to web reset page
      });
      
      if (e) throw e;
      setSuccess(true);
    } catch (e: any) {
      setError(e?.message ?? "Failed to send reset link");
    } finally {
      setBusy(false);
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
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top + 20, 40) }]} bounces={false}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <ArrowLeft size={20} color={C.text.secondary} />
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.logoGlow} />
            <Text style={styles.brandText}>
              Reset<Text style={{ color: C.amber.primary }}>Auth</Text>
            </Text>
          </View>

          <View style={styles.glassCard}>
            {success ? (
              <View style={styles.successContainer}>
                <CheckCircle2 size={64} color={C.status.success} style={{ marginBottom: 20 }} />
                <Text style={styles.modeTitle}>Check Your Email</Text>
                <Text style={styles.modeSub}>
                  If an account exists for {email}, we've sent instructions to reset your password.
                </Text>
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={onBack}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[C.amber.primary, "#D97000"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.submitBtnText}>Return to Login</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.modeTitle}>Forgot Password?</Text>
                <Text style={styles.modeSub}>
                  Enter your email address and we'll send you a link to reset your password.
                </Text>

                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Email Address</Text>
                  <View
                    style={[
                      styles.inputContainer,
                      focusedInput && styles.inputFocused,
                    ]}
                  >
                    <Mail size={18} color={focusedInput ? C.amber.primary : C.text.secondary} />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@company.com"
                      placeholderTextColor={C.text.secondary}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      style={styles.input}
                      onFocus={() => setFocusedInput(true)}
                      onBlur={() => setFocusedInput(false)}
                      autoFocus
                    />
                  </View>
                </View>

                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.submitBtn, !email.trim() && styles.submitBtnDisabled]}
                  onPress={handleReset}
                  disabled={!email.trim() || busy}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={email.trim() ? [C.amber.primary, "#D97000"] : ["#2a2a2a", "#1e1e1e"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                  {busy ? (
                    <Text style={styles.submitBtnText}>Sending...</Text>
                  ) : (
                    <>
                      <Text style={styles.submitBtnText}>Send reset link</Text>
                      <ArrowRight size={18} color="#000" />
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
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
    paddingTop: 20,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 40,
    gap: 8,
  },
  backText: {
    color: C.text.secondary,
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoGlow: {
    position: "absolute",
    top: -20,
    width: 100,
    height: 100,
    backgroundColor: C.amber.primary,
    borderRadius: 50,
    opacity: 0.1,
    transform: [{ scale: 2 }],
  },
  brandText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -1,
  },
  glassCard: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  successContainer: {
    alignItems: "center",
    textAlign: "center",
  },
  modeTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  modeSub: {
    color: C.text.secondary,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 32,
    lineHeight: 20,
    textAlign: "center",
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
    width: "100%",
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
