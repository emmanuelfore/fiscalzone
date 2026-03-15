import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import {
  LayoutDashboard,
  PieChart,
  Package,
  Receipt,
  Menu,
} from "lucide-react-native";

const C = {
  bg: "#07090c",
  s1: "#0d1117",
  s2: "#141b24",
  border: "#1f2d3d",
  accent: "#f0a500",
  text: "#e8edf5",
  muted: "#3d5166",
} as const;

type ScreenName = "pos" | "reports" | "profile" | "inventory" | "stockin" | "customers" | "suppliers" | "expenses";

interface BottomTabsProps {
  currentScreen: ScreenName;
  onNavigate: (screen: ScreenName) => void;
  onOpenDrawer: () => void;
  userRole?: string;
  userName?: string;
}

export function BottomTabs({
  currentScreen,
  onNavigate,
  onOpenDrawer,
  userRole = "member",
  userName = "",
}: BottomTabsProps) {
  const allTabs: { icon: any; label: string; id: ScreenName | "menu" }[] = [
    { icon: LayoutDashboard, label: "POS", id: "pos" },
    { icon: Package, label: "Inventory", id: "inventory" },
    { icon: Receipt, label: "Expenses", id: "expenses" },
    { icon: PieChart, label: "Reports", id: "reports" },
    { icon: Menu, label: "Menu", id: "menu" },
  ];

  const tabs = allTabs.filter(tab => {
    if (tab.id === "menu") return true;
    const role = userRole.toLowerCase();
    if (role === "owner" || role === "admin" || userName === "Super Admin") return true;
    
    if (role === "cashier" || role === "member") {
      return ["pos", "customers", "reports"].includes(tab.id);
    }
    
    if (role === "accountant") {
      return ["reports", "inventory", "expenses"].includes(tab.id);
    }
    
    return true;
  });

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentScreen === tab.id;
        
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => {
              if (tab.id === "menu") {
                onOpenDrawer();
              } else {
                onNavigate(tab.id as ScreenName);
              }
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
              <Icon
                size={22}
                color={isActive ? C.accent : C.muted}
                strokeWidth={isActive ? 2.5 : 2}
              />
            </View>
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: C.s1,
    height: Platform.OS === "ios" ? 88 : 68,
    paddingBottom: Platform.OS === "ios" ? 28 : 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 8,
    justifyContent: "space-around",
    alignItems: "center",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
  },
  iconContainer: {
    width: 40,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  activeIconContainer: {
    backgroundColor: "rgba(240,165,0,0.1)",
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: C.muted,
    marginTop: 4,
  },
  activeLabel: {
    color: C.accent,
  },
});
