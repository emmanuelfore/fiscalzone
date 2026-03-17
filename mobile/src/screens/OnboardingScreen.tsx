import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  SafeAreaView
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  FileText, 
  DollarSign, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  X,
  CreditCard
} from "lucide-react-native";
import { PremiumColors as C } from "../ui/PremiumColors";
import { apiFetch } from "../lib/api";
import { Button } from "../ui/Button";
import { StatusBar } from "expo-status-bar";

type OnboardingProps = {
  onComplete: (companyId: number) => void;
  onSignOut: () => void;
};

export function OnboardingScreen({ onComplete, onSignOut }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  
  // Step 1: Company Basics
  const [form, setForm] = useState({
    name: "",
    tradingName: "",
    email: "",
    phone: "",
    address: "",
    city: "Harare",
    // Step 2: Tax Details
    tin: "",
    vatNumber: "",
    bpNumber: "",
    currency: "USD",
  });

  const nextStep = () => {
    if (step === 1) {
      if (!form.name || !form.email || !form.phone || !form.address) {
        Alert.alert("Missing Information", "Please fill in all required company details.");
        return;
      }
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const handleSubmit = async () => {
    if (!form.tin) {
      Alert.alert("Missing Information", "Please provide your Taxpayer Identification Number (TIN).");
      return;
    }

    setBusy(true);
    try {
      const res = await apiFetch("/api/companies", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          country: "Zimbabwe",
          vatEnabled: !!form.vatNumber,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create company");
      }

      const data = await res.json();
      Alert.alert("Success", "Your organization has been created!");
      onComplete(data.id);
    } catch (e: any) {
      Alert.alert("Setup Failed", e.message);
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
      />
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onSignOut} style={styles.iconBtn}>
              <X size={20} color={C.text.primary} />
            </TouchableOpacity>
            <View style={styles.progressContainer}>
              <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]} />
              <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
              <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]} />
            </View>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.titleSection}>
              <Text style={styles.title}>
                {step === 1 ? "Company Profile" : "Tax & Compliance"}
              </Text>
              <Text style={styles.subtitle}>
                {step === 1 
                  ? "Tell us about your organization to get started" 
                  : "Required details for ZIMRA fiscalization"}
              </Text>
            </View>

            {step === 1 && (
              <View style={styles.formCard}>
                <InputField 
                  label="Registered Company Name *" 
                  icon={Building2} 
                  placeholder="Acme Logistics (Pvt) Ltd" 
                  value={form.name} 
                  onChangeText={(v: string) => setForm({...form, name: v})} 
                />
                <InputField 
                  label="Trading Name" 
                  icon={Globe} 
                  placeholder="Acme Express" 
                  value={form.tradingName} 
                  onChangeText={(v: string) => setForm({...form, tradingName: v})} 
                />
                <InputField 
                  label="Company Email *" 
                  icon={Mail} 
                  placeholder="billing@acme.com" 
                  keyboardType="email-address"
                  value={form.email} 
                  onChangeText={(v: string) => setForm({...form, email: v})} 
                />
                <InputField 
                  label="Phone Number *" 
                  icon={Phone} 
                  placeholder="+263 7..." 
                  keyboardType="phone-pad"
                  value={form.phone} 
                  onChangeText={(v: string) => setForm({...form, phone: v})} 
                />
                <InputField 
                  label="Physical Address *" 
                  icon={MapPin} 
                  placeholder="123 Samora Machel Ave" 
                  value={form.address} 
                  onChangeText={(v: string) => setForm({...form, address: v})} 
                  multiline
                />
                <InputField 
                  label="City *" 
                  icon={MapPin} 
                  placeholder="Harare" 
                  value={form.city} 
                  onChangeText={(v: string) => setForm({...form, city: v})} 
                />
              </View>
            )}

            {step === 2 && (
              <View style={styles.formCard}>
                <View style={styles.alertBox}>
                  <Text style={styles.alertText}>
                    Ensure numbers match your ZIMRA documents exactly.
                  </Text>
                </View>

                <InputField 
                  label="Company TIN *" 
                  icon={FileText} 
                  placeholder="10-digit Tax Number" 
                  keyboardType="numeric"
                  value={form.tin} 
                  onChangeText={(v: string) => setForm({...form, tin: v})} 
                />
                <InputField 
                  label="VAT Number" 
                  icon={CreditCard} 
                  placeholder="VAT registration if applicable" 
                  value={form.vatNumber} 
                  onChangeText={(v: string) => setForm({...form, vatNumber: v})} 
                />
                <InputField 
                  label="BP Number" 
                  icon={FileText} 
                  placeholder="Business Partner Number" 
                  value={form.bpNumber} 
                  onChangeText={(v: string) => setForm({...form, bpNumber: v})} 
                />
                
                <Text style={styles.label}>Default Currency</Text>
                <View style={styles.currencyRow}>
                  {['USD', 'ZWG'].map(curr => (
                    <TouchableOpacity 
                      key={curr}
                      style={[styles.currBtn, form.currency === curr && styles.currBtnActive]}
                      onPress={() => setForm({...form, currency: curr})}
                    >
                      <DollarSign size={16} color={form.currency === curr ? "#000" : C.text.secondary} />
                      <Text style={[styles.currText, form.currency === curr && styles.currTextActive]}>
                        {curr}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.footer}>
              {step > 1 && (
                <TouchableOpacity onPress={prevStep} style={styles.backBtn}>
                  <ArrowLeft size={20} color={C.text.secondary} />
                  <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.nextBtn, step === 1 && { flex: 1 }]} 
                onPress={step === 1 ? nextStep : handleSubmit}
                disabled={busy}
              >
                <LinearGradient
                  colors={[C.amber.primary, "#D97000"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                {busy ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Text style={styles.nextBtnText}>
                      {step === 1 ? "Next Step" : "Complete Setup"}
                    </Text>
                    <ArrowRight size={20} color="#000" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

function InputField({ label, icon: Icon, value, onChangeText, placeholder, keyboardType, multiline }: any) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputContainer, focused && styles.inputFocused]}>
        <Icon size={18} color={focused ? C.amber.primary : C.text.secondary} />
        <TextInput
          style={[styles.input, multiline && { height: 80, paddingTop: 12 }]}
          placeholder={placeholder}
          placeholderTextColor={C.text.secondary}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType={keyboardType}
          multiline={multiline}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    paddingHorizontal: 20, 
    paddingVertical: 15,
  },
  iconBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: "rgba(255,255,255,0.05)", 
    alignItems: "center", 
    justifyContent: "center" 
  },
  progressContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 10 
  },
  progressDot: { 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    backgroundColor: "rgba(255,255,255,0.1)" 
  },
  progressDotActive: { 
    backgroundColor: C.amber.primary, 
    shadowColor: C.amber.primary, 
    shadowRadius: 10, 
    shadowOpacity: 0.5 
  },
  progressLine: { 
    width: 40, 
    height: 2, 
    backgroundColor: "rgba(255,255,255,0.1)" 
  },
  progressLineActive: { 
    backgroundColor: C.amber.primary 
  },
  scrollContent: { 
    paddingHorizontal: 20, 
    paddingBottom: 40 
  },
  titleSection: { 
    marginTop: 20, 
    marginBottom: 30 
  },
  title: { 
    color: "#fff", 
    fontSize: 28, 
    fontWeight: "900" 
  },
  subtitle: { 
    color: C.text.secondary, 
    fontSize: 15, 
    fontWeight: "500", 
    marginTop: 8 
  },
  formCard: { 
    backgroundColor: "rgba(255,255,255,0.03)", 
    borderRadius: 24, 
    padding: 20, 
    borderWidth: 1, 
    borderColor: "rgba(255,255,255,0.08)" 
  },
  field: { 
    marginBottom: 18 
  },
  label: { 
    color: C.text.secondary, 
    fontSize: 12, 
    fontWeight: "700", 
    marginBottom: 8, 
    textTransform: "uppercase", 
    letterSpacing: 1 
  },
  inputContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "rgba(0,0,0,0.3)", 
    borderRadius: 16, 
    paddingHorizontal: 16, 
    height: 56, 
    borderWidth: 1, 
    borderColor: "rgba(255,255,255,0.05)" 
  },
  inputFocused: { 
    borderColor: C.amber.primary, 
    backgroundColor: "rgba(255,149,0,0.02)" 
  },
  input: { 
    flex: 1, 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "600", 
    marginLeft: 12 
  },
  alertBox: { 
    backgroundColor: "rgba(255,149,0,0.1)", 
    padding: 14, 
    borderRadius: 16, 
    marginBottom: 24, 
    borderWidth: 1, 
    borderColor: "rgba(255,149,0,0.2)" 
  },
  alertText: { 
    color: C.amber.light, 
    fontSize: 13, 
    fontWeight: "600", 
    textAlign: "center" 
  },
  currencyRow: { 
    flexDirection: "row", 
    gap: 12 
  },
  currBtn: { 
    flex: 1, 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    gap: 8, 
    height: 50, 
    borderRadius: 14, 
    backgroundColor: "rgba(255,255,255,0.05)", 
    borderWidth: 1, 
    borderColor: "rgba(255,255,255,0.1)" 
  },
  currBtnActive: { 
    backgroundColor: C.amber.primary, 
    borderColor: C.amber.primary 
  },
  currText: { 
    color: C.text.secondary, 
    fontWeight: "800" 
  },
  currTextActive: { 
    color: "#000" 
  },
  footer: { 
    flexDirection: "row", 
    marginTop: 30, 
    gap: 12 
  },
  backBtn: { 
    flex: 1, 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    gap: 10, 
    height: 60, 
    borderRadius: 20, 
    backgroundColor: "rgba(255,255,255,0.05)", 
    borderWidth: 1, 
    borderColor: "rgba(255,255,255,0.1)" 
  },
  backBtnText: { 
    color: C.text.secondary, 
    fontSize: 16, 
    fontWeight: "800" 
  },
  nextBtn: { 
    flex: 2, 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    gap: 10, 
    height: 60, 
    borderRadius: 20, 
    overflow: "hidden" 
  },
  nextBtnText: { 
    color: "#000", 
    fontSize: 16, 
    fontWeight: "900" 
  }
});

// Polyfill for missing SafeAreaView if needed, or just use regular View with padding
