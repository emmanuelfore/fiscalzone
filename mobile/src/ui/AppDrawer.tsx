import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import {
  LayoutDashboard,
  PieChart,
  User,
  LogOut,
  X,
  ChevronRight,
  Package,
  ArrowDownToLine,
  Users,
  Truck,
  Receipt,
  Activity,
  AlertTriangle,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { apiFetch } from "../lib/api";

import { PremiumColors as C } from "./PremiumColors";

type ScreenName = "pos" | "reports" | "profile" | "inventory" | "stockin" | "customers" | "suppliers" | "expenses";

interface AppDrawerProps {
  visible: boolean;
  onClose: () => void;
  currentScreen: ScreenName;
  onNavigate: (screen: ScreenName) => void;
  onLogout: () => void;
  userName: string;
  userRole?: string;
}

export function AppDrawer({
  visible,
  onClose,
  currentScreen,
  onNavigate,
  onLogout,
  userName,
  userRole,
}: AppDrawerProps) {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    if (!visible) return;
    apiFetch("/api/health")
      .then(res => setIsOnline(res.ok))
      .catch(() => setIsOnline(false));
  }, [visible]);

  const allMenuItems: { icon: any; label: string; id: ScreenName }[] = [
    { icon: LayoutDashboard, label: "POS", id: "pos" },
    { icon: PieChart, label: "Reports", id: "reports" },
    { icon: Package, label: "Inventory", id: "inventory" },
    { icon: ArrowDownToLine, label: "Stock In", id: "stockin" },
    { icon: Users, label: "Customers", id: "customers" },
    { icon: Truck, label: "Suppliers", id: "suppliers" },
    { icon: Receipt, label: "Expenses", id: "expenses" },
    { icon: User, label: "Profile", id: "profile" },
  ];

  const menuItems = allMenuItems.filter(item => {
    const role = (userRole || "member").toLowerCase();
    // Super-admins, owners, and admins see everything
    if (role === "owner" || role === "admin" || role === "superadmin" || (userName === "Super Admin")) return true;

    // Cashiers/Members are restricted
    if (role === "cashier" || role === "member") {
      const allowed = ["pos", "customers", "profile", "reports"];
      return allowed.includes(item.id);
    }

    // Accountants see reports and expenses but maybe not POS?
    if (role === "accountant") {
      const allowed = ["reports", "inventory", "stockin", "suppliers", "expenses", "profile"];
      return allowed.includes(item.id);
    }

    return true; // Default to showing if unsure
  });

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={styles.drawerContainer}>
          <LinearGradient
            colors={[C.bg.card, C.bg.base]}
            style={styles.drawer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <SafeAreaView style={{ flex: 1 }}>
              <View style={styles.header}>
                <Text style={styles.brand}>FieldPOS</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X size={20} color={C.text.primary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.menu}>
                {menuItems.map((item) => {
                  const isActive = currentScreen === item.id;
                  const Icon = item.icon;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => {
                        onNavigate(item.id);
                        onClose();
                      }}
                      style={[
                        styles.menuItem,
                        isActive && styles.menuItemActive,
                      ]}
                    >
                      <View style={styles.menuItemLeft}>
                        <Icon
                          size={20}
                          color={isActive ? C.amber.primary : C.text.secondary}
                        />
                        <Text
                          style={[
                            styles.menuLabel,
                            isActive && styles.menuLabelActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </View>
                      {isActive && (
                        <ChevronRight size={16} color={C.amber.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.footer}>
                <View style={styles.userInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {userName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.userName}>{userName}</Text>
                    <Text style={styles.userRole}>{(userRole || "member").charAt(0).toUpperCase() + (userRole || "member").slice(1)}</Text>
                  </View>
                </View>

                <View style={styles.healthInfo}>
                  <View style={[styles.healthDot, { backgroundColor: isOnline === true ? C.status.success : isOnline === false ? C.status.error : C.text.secondary }]} />
                  <Text style={styles.healthText}>
                    {isOnline === true ? "Server Online" : isOnline === false ? "Server Offline / Network Error" : "Checking Server..."}
                  </Text>
                  {isOnline === false && <AlertTriangle size={12} color={C.status.error} />}
                </View>

                <TouchableOpacity
                  onPress={onLogout}
                  style={styles.logoutBtn}
                >
                  <LogOut size={18} color={C.status.error} />
                  <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  drawerContainer: {
    width: 280,
    height: "100%",
  },
  drawer: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: C.border.default,
  },
  header: {
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: C.border.default,
  },
  brand: {
    color: C.amber.primary,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.bg.card,
    alignItems: "center",
    justifyContent: "center",
  },
  menu: {
    flex: 1,
    padding: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuItemActive: {
    backgroundColor: C.amber.glow,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuLabel: {
    color: C.text.secondary,
    fontSize: 15,
    fontWeight: "600",
  },
  menuLabelActive: {
    color: C.text.primary,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: C.border.default,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.amber.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 16,
  },
  userName: {
    color: C.text.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  userRole: {
    color: C.text.secondary,
    fontSize: 11,
  },
  healthInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
    paddingHorizontal: 4
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  healthText: {
    color: C.text.secondary,
    fontSize: 11,
    fontWeight: "600",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,71,87,0.1)",
  },
  logoutText: {
    color: C.status.error,
    fontSize: 14,
    fontWeight: "700",
  },
});
