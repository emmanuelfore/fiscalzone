// PremiumColors.ts — single source of truth for all theme tokens and hooks.
// Previously split between .ts and .tsx; now fully consolidated here.

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Palettes ──────────────────────────────────────────────────────────────────

export const DarkTheme = {
  amber: {
    primary: "#FF9500",
    light: "#FFB74D",
    glow: "rgba(255, 149, 0, 0.15)",
    glowMd: "rgba(255, 149, 0, 0.25)",
  },
  bg: {
    base: "#0a0600",
    primary: "#0a0600",
    card: "#1a140a",
    hover: "#221a0d",
  },
  text: {
    primary: "#ffffff",
    secondary: "rgba(255, 255, 255, 0.7)",
  },
  border: {
    default: "rgba(255, 149, 0, 0.2)",
  },
  status: {
    success: "#00d084",
    error: "#ff4757",
    warning: "#ff9500",
    info: "#3b9eff",
  },
};

export const LightTheme = {
  amber: {
    primary: "#E67E00",
    light: "#FF9500",
    glow: "rgba(230, 126, 0, 0.08)",
    glowMd: "rgba(230, 126, 0, 0.15)",
  },
  bg: {
    base: "#F9FAFB",
    primary: "#F3F4F6",
    card: "#FFFFFF",
    hover: "#F3F4F6",
  },
  text: {
    primary: "#111827",
    secondary: "#6B7280",
  },
  border: {
    default: "#E5E7EB",
  },
  status: {
    success: "#059669",
    error: "#DC2626",
    warning: "#D97706",
    info: "#2563EB",
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

export type ThemeMode = "light" | "dark" | "system";
export type Theme = typeof DarkTheme;

const THEME_PREF_KEY = "@fiscalstack_theme_pref";

// ── Context ───────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DarkTheme,
  mode: "system",
  setMode: () => {},
  isDark: true,
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    AsyncStorage.getItem(THEME_PREF_KEY).then((val) => {
      if (val === "light" || val === "dark" || val === "system") {
        setModeState(val);
      }
    });
  }, []);

  const setMode = useCallback(async (newMode: ThemeMode) => {
    setModeState(newMode);
    await AsyncStorage.setItem(THEME_PREF_KEY, newMode);
  }, []);

  const isDark =
    mode === "dark" || (mode === "system" && systemScheme !== "light");
  const theme: Theme = isDark ? DarkTheme : LightTheme;

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useTheme() {
  return useContext(ThemeContext);
}

// Backward-compat static export — screens not yet migrated to useTheme() use this.
// It always returns the dark palette, which is still the default.
export const PremiumColors = DarkTheme;
