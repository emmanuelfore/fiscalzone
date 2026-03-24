import React, { createContext, useContext } from "react";
import { useColorScheme } from "react-native";

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
} as const;

export const LightTheme = {
  amber: {
    primary: "#E67E00", // Slightly darker amber for better contrast on light bg
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
    success: "#059669", // Darker green
    error: "#DC2626", // Darker red
    warning: "#D97706", // Darker yellow/orange
    info: "#2563EB", // Darker blue
  },
} as const;

type Theme = typeof DarkTheme;

const ThemeContext = createContext<Theme>(DarkTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "light" ? LightTheme : DarkTheme;
  
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// For backward compatibility during migration
export const PremiumColors = DarkTheme;

