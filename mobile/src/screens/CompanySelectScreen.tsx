import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from "react-native";
import { Building2, CheckCircle2, LogOut, RefreshCw } from "lucide-react-native";
import { apiFetch } from "../lib/api";
import { PremiumColors } from "../ui/PremiumColors";
import { Button } from "../ui/Button";

type Company = {
  id: number;
  name: string;
  tradingName?: string | null;
  zimraEnvironment?: string | null;
};

type Props = {
  onSelected: (companyId: number) => void;
  onSignOut: () => void;
};

export function CompanySelectScreen({ onSelected, onSignOut }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/api/companies");
      if (!res.ok) throw new Error(`Failed to load companies (${res.status})`);
      const data = (await res.json()) as Company[];
      setCompanies(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const subtitle = useMemo(() => {
    if (loading) return "Fetching companies…";
    if (error) return "Could not load company list";
    if (!companies.length) return "No companies found for this user";
    return "Select the company to control pause/resume";
  }, [loading, error, companies.length]);

  return (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 18 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={{ color: "white", fontSize: 26, fontWeight: "900", letterSpacing: -0.5 }}>
            Companies
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.45)", marginTop: 6, fontSize: 12, fontWeight: "700" }}>
            {subtitle}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onSignOut}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: "rgba(255,255,255,0.07)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.10)",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <LogOut size={18} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>

      <View style={{ height: 16 }} />

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={PremiumColors.amber.primary} />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 }}>
          <Text style={{ color: "#f87171", fontWeight: "800", textAlign: "center" }}>{error}</Text>
          <View style={{ height: 12 }} />
          <Button title="Retry" onPress={load} />
        </View>
      ) : (
        <FlatList
          data={companies}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => onSelected(item.id)}
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
                borderRadius: 22,
                padding: 16,
                marginBottom: 10,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1, marginRight: 10 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 16,
                    backgroundColor: "rgba(255,149,0,0.12)",
                    borderWidth: 1,
                    borderColor: "rgba(255,149,0,0.18)",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Building2 size={20} color={PremiumColors.amber.light} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "white", fontSize: 14, fontWeight: "800" }} numberOfLines={1}>
                    {item.tradingName || item.name}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: "700", marginTop: 3 }}>
                    {item.zimraEnvironment ? `ZIMRA: ${item.zimraEnvironment}` : `ID: ${item.id}`}
                  </Text>
                </View>
              </View>
              <CheckCircle2 size={18} color="rgba(255,255,255,0.18)" />
            </TouchableOpacity>
          )}
          ListFooterComponent={
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={load}
              style={{
                marginTop: 6,
                alignSelf: "center",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 18,
                backgroundColor: "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)"
              }}
            >
              <RefreshCw size={14} color="rgba(255,255,255,0.55)" />
              <Text style={{ color: "rgba(255,255,255,0.6)", fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", fontSize: 10 }}>
                Refresh
              </Text>
            </TouchableOpacity>
          }
        />
      )}
    </View>
  );
}

