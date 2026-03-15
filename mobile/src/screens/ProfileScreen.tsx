import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
} from "react-native";
import {
  Menu,
  User,
  Mail,
  Lock,
  LogOut,
  Camera,
  ChevronRight,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../lib/supabase";

const C = {
  bg: "#07090c",
  s1: "#0d1117",
  s2: "#141b24",
  border: "#1f2d3d",
  accent: "#f0a500",
  text: "#e8edf5",
  muted: "#3d5166",
  red: "#ff4757",
} as const;

interface ProfileScreenProps {
  onOpenDrawer: () => void;
  userName: string;
  onLogout: () => void;
}

export function ProfileScreen({ onOpenDrawer, userName, onLogout }: ProfileScreenProps) {
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPass, setIsChangingPass] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }
    setIsChangingPass(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      Alert.alert("Success", "Password updated successfully.");
      setNewPassword("");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to change password.");
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onOpenDrawer} style={styles.iconBtn}>
            <Menu size={20} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.title}>My Profile</Text>
          <View style={{ width: 34 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <User size={40} color={C.accent} />
              </View>
              <TouchableOpacity style={styles.cameraBtn}>
                <Camera size={14} color="#000" />
              </TouchableOpacity>
            </View>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userRole}>Store Manager / Cashier</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Account Security</Text>
            <View style={styles.card}>
              <View style={styles.inputGroup}>
                <View style={styles.inputIcon}>
                  <Lock size={16} color={C.muted} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="New Password"
                  placeholderTextColor={C.muted}
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
              </View>
              <TouchableOpacity 
                onPress={handleChangePassword} 
                disabled={isChangingPass}
                style={styles.actionBtn}
              >
                <Text style={styles.actionBtnText}>Update Password</Text>
                {isChangingPass ? (
                   <Text style={{color: C.accent, fontSize: 12}}>Changing...</Text>
                ) : (
                  <ChevronRight size={16} color={C.accent} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Danger Zone</Text>
            <TouchableOpacity onPress={onLogout} style={styles.logoutCard}>
              <View style={styles.logoutIcon}>
                <LogOut size={18} color={C.red} />
              </View>
              <View>
                <Text style={styles.logoutTitle}>Logout</Text>
                <Text style={styles.logoutSub}>Sign out of your account</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.s2,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: C.text,
    fontSize: 18,
    fontWeight: "800",
  },
  content: {
    padding: 24,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: `${C.accent}12`,
    borderWidth: 1,
    borderColor: `${C.accent}30`,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: C.bg,
  },
  userName: {
    color: C.text,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 4,
  },
  userRole: {
    color: C.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: C.s2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 54,
    color: C.text,
    fontSize: 15,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  actionBtnText: {
    color: C.text,
    fontSize: 14,
    fontWeight: "600",
  },
  logoutCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    backgroundColor: "rgba(255,71,87,0.08)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,71,87,0.2)",
  },
  logoutIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,71,87,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutTitle: {
    color: C.red,
    fontSize: 15,
    fontWeight: "700",
  },
  logoutSub: {
    color: "rgba(255,71,87,0.6)",
    fontSize: 11,
    marginTop: 2,
  },
});
