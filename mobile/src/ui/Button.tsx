import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { PremiumColors } from "./PremiumColors";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  variant?: "primary" | "ghost";
};

export function Button({ title, onPress, disabled, loading, style, variant = "primary" }: Props) {
  const content = (
    <>
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text
          style={{
            color: variant === "ghost" ? "rgba(255,255,255,0.85)" : "white",
            fontWeight: "900",
            letterSpacing: 1.2,
            textTransform: "uppercase",
            fontSize: 12
          }}
        >
          {title}
        </Text>
      )}
    </>
  );

  if (variant === "ghost") {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        disabled={disabled || loading}
        style={[
          {
            borderRadius: 18,
            paddingVertical: 14,
            paddingHorizontal: 16,
            backgroundColor: "rgba(255,255,255,0.06)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.10)",
            alignItems: "center",
            justifyContent: "center"
          },
          style
        ]}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      disabled={disabled || loading}
      style={[{ borderRadius: 22, overflow: "hidden" }, style]}
    >
      <LinearGradient
        colors={disabled ? ["#2a2a2a", "#1e1e1e"] : [PremiumColors.amber.primary, "#D97000"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          borderRadius: 22,
          paddingVertical: 16,
          paddingHorizontal: 18,
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {content}
      </LinearGradient>
    </TouchableOpacity>
  );
}

