import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Menu,
  User,
  Lock,
  LogOut,
  Camera,
  ChevronRight,
  Sun,
  Moon,
  Smartphone,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../lib/supabase";
import { useTheme, ThemeMode } from "../ui/PremiumColors";

interface ProfileScreenProps {
  onOpenDrawer: () => void;
  userName: string;
  onLogout: () => void;
}

export function ProfileScreen({ onOpenDrawer, userName, onLogout }: ProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme: C, isDark, mode, setMode } = useTheme();
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPass, setIsChangingPass] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }
    setIsChangingPass(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      Alert.alert("Success", "Password updated successfully.");
      setNewPassword("");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to change password.");
    } finally {
      setIsChangingPass(false);
    }
  };

  const themeModes: { key: ThemeMode; label: string; Icon: any }[] = [
    { key: "light", label: "Light", Icon: Sun },
    { key: "dark", label: "Dark", Icon: Moon },
    { key: "system", label: "Auto", Icon: Smartphone },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg.base }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={{
          paddingHorizontal: 16, paddingVertical: 12,
          paddingTop: Math.max(insets.top, 12),
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          borderBottomWidth: 1, borderBottomColor: C.border.default,
        }}>
          <TouchableOpacity onPress={onOpenDrawer} style={{
            width: 34, height: 34, borderRadius: 10,
            backgroundColor: C.bg.hover, borderWidth: 1,
            borderColor: C.border.default, alignItems: "center", justifyContent: "center",
          }}>
            <Menu size={20} color={C.text.primary} />
          </TouchableOpacity>
          <Text style={{ color: C.text.primary, fontSize: 18, fontWeight: "800" }}>My Profile</Text>
          <View style={{ width: 34 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>

          {/* Avatar */}
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <View style={{ position: "relative", marginBottom: 16 }}>
              <View style={{
                width: 90, height: 90, borderRadius: 45,
                backgroundColor: `${C.amber.primary}12`,
                borderWidth: 1, borderColor: `${C.amber.primary}30`,
                alignItems: "center", justifyContent: "center",
              }}>
                <User size={40} color={C.amber.primary} />
              </View>
              <TouchableOpacity style={{
                position: "absolute", bottom: 0, right: 0,
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: C.amber.primary, alignItems: "center",
                justifyContent: "center", borderWidth: 3, borderColor: C.bg.base,
              }}>
                <Camera size={14} color="#000" />
              </TouchableOpacity>
            </View>
            <Text style={{ color: C.text.primary, fontSize: 22, fontWeight: "900", marginBottom: 4 }}>{userName}</Text>
            <Text style={{ color: C.text.secondary, fontSize: 13, fontWeight: "600" }}>Store Manager / Cashier</Text>
          </View>

          {/* Theme Picker */}
          <Text style={{
            color: C.text.secondary, fontSize: 11, fontWeight: "700",
            textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, marginLeft: 4,
          }}>Appearance</Text>
          <View style={{
            backgroundColor: C.bg.hover, borderRadius: 20, borderWidth: 1,
            borderColor: C.border.default, padding: 8, flexDirection: "row",
            gap: 6, marginBottom: 28,
          }}>
            {themeModes.map(({ key, label, Icon }) => {
              const active = mode === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setMode(key)}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 14,
                    backgroundColor: active ? C.amber.primary : "transparent",
                    alignItems: "center", gap: 4,
                  }}>
                  <Icon size={16} color={active ? "#000" : C.text.secondary} />
                  <Text style={{
                    color: active ? "#000" : C.text.secondary,
                    fontSize: 11, fontWeight: "700",
                  }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Account Security */}
          <Text style={{
            color: C.text.secondary, fontSize: 11, fontWeight: "700",
            textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, marginLeft: 4,
          }}>Account Security</Text>
          <View style={{
            backgroundColor: C.bg.hover, borderRadius: 20,
            borderWidth: 1, borderColor: C.border.default, overflow: "hidden", marginBottom: 24,
          }}>
            <View style={{
              flexDirection: "row", alignItems: "center",
              borderBottomWidth: 1, borderBottomColor: C.border.default, paddingHorizontal: 16,
            }}>
              <Lock size={16} color={C.text.secondary} style={{ marginRight: 12 }} />
              <TextInput
                style={{ flex: 1, height: 54, color: C.text.primary, fontSize: 15 }}
                placeholder="New Password"
                placeholderTextColor={C.text.secondary}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>
            <TouchableOpacity
              onPress={handleChangePassword}
              disabled={isChangingPass}
              style={{
                flexDirection: "row", alignItems: "center",
                justifyContent: "space-between", padding: 16,
              }}>
              <Text style={{ color: C.text.primary, fontSize: 14, fontWeight: "600" }}>Update Password</Text>
              {isChangingPass
                ? <Text style={{ color: C.amber.primary, fontSize: 12 }}>Changing...</Text>
                : <ChevronRight size={16} color={C.amber.primary} />}
            </TouchableOpacity>
          </View>

          {/* Logout */}
          <Text style={{
            color: C.text.secondary, fontSize: 11, fontWeight: "700",
            textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, marginLeft: 4,
          }}>Danger Zone</Text>
          <TouchableOpacity onPress={onLogout} style={{
            flexDirection: "row", alignItems: "center", gap: 16, padding: 16,
            backgroundColor: "rgba(255,71,87,0.08)", borderRadius: 20,
            borderWidth: 1, borderColor: "rgba(255,71,87,0.2)",
          }}>
            <View style={{
              width: 44, height: 44, borderRadius: 14,
              backgroundColor: "rgba(255,71,87,0.15)", alignItems: "center", justifyContent: "center",
            }}>
              <LogOut size={18} color={C.status.error} />
            </View>
            <View>
              <Text style={{ color: C.status.error, fontSize: 15, fontWeight: "700" }}>Logout</Text>
              <Text style={{ color: "rgba(255,71,87,0.6)", fontSize: 11, marginTop: 2 }}>Sign out of your account</Text>
            </View>
          </TouchableOpacity>

        </ScrollView>
      </View>
    </View>
  );
}
