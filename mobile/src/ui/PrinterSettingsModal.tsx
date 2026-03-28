import React, { useState, useEffect } from "react";
import { Modal, View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from "react-native";
import { X, Bluetooth, Printer as PrinterIcon } from "lucide-react-native";
import { PremiumColors } from "./PremiumColors";
import { Button } from "./Button";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrinterConfig, usePrinter } from "../hooks/usePrinter";
import { getBluetoothDevices } from "../lib/printing";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function PrinterSettingsModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { config, updateConfig } = usePrinter();
  
  // Local state for the form so we only save on 'Save'
  const [draft, setDraft] = useState<PrinterConfig>(config);
  
  // Bluetooth Discovery State
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<{deviceName: string, macAddress: string}[]>([]);

  useEffect(() => {
    if (visible) {
      setDraft(config);
      setDiscoveredDevices([]);
    }
  }, [visible, config]);

  const handleScan = async () => {
    setIsScanning(true);
    setDiscoveredDevices([]);
    try {
      const devices = await getBluetoothDevices();
      setDiscoveredDevices(devices);
      if (devices.length === 0) {
        Alert.alert("No Devices Found", "Make sure your bluetooth printer is turned on and paired with this device.");
      }
    } catch (error) {
       Alert.alert("Scan Failed", "Could not scan for bluetooth devices.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSave = () => {
    updateConfig(draft);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
        <View style={{ 
          backgroundColor: PremiumColors.bg.base, 
          borderTopLeftRadius: 24, 
          borderTopRightRadius: 24,
          height: "90%",
          paddingTop: 8
        }}>
          {/* Header */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderColor: PremiumColors.border.default }}>
            <Text style={{ color: PremiumColors.text.primary, fontSize: 18, fontWeight: "900" }}>Printer Settings</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
              <X size={24} color={PremiumColors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, padding: 20 }} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 40) }}>
            
            {/* General Toggles */}
            <View style={{ marginBottom: 24, padding: 16, backgroundColor: PremiumColors.bg.hover, borderRadius: 16, borderWidth: 1, borderColor: PremiumColors.border.default }}>
              <Text style={{ color: PremiumColors.text.primary, fontWeight: "700", marginBottom: 12 }}>General Behavior</Text>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Text style={{ color: PremiumColors.text.primary, fontWeight: "600" }}>Enable Printing</Text>
                <TouchableOpacity 
                   activeOpacity={0.8}
                   onPress={() => setDraft(p => ({ ...p, enabled: !p.enabled }))}
                   style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: draft.enabled ? PremiumColors.amber.primary : PremiumColors.border.default, justifyContent: "center", paddingHorizontal: 2 }}
                >
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "white", alignSelf: draft.enabled ? "flex-end" : "flex-start" }} />
                </TouchableOpacity>
              </View>
              
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Text style={{ color: PremiumColors.text.primary }}>Auto Print Receipt</Text>
                <TouchableOpacity 
                   activeOpacity={0.8}
                   onPress={() => setDraft(p => ({ ...p, autoPrint: !p.autoPrint }))}
                   style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: draft.autoPrint ? PremiumColors.amber.primary : PremiumColors.border.default, justifyContent: "center", paddingHorizontal: 2 }}
                >
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "white", alignSelf: draft.autoPrint ? "flex-end" : "flex-start" }} />
                </TouchableOpacity>
              </View>
              
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Text style={{ color: PremiumColors.text.primary }}>Show Success Modal</Text>
                <TouchableOpacity 
                   activeOpacity={0.8}
                   onPress={() => setDraft(p => ({ ...p, autoShowModal: !p.autoShowModal }))}
                   style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: draft.autoShowModal ? PremiumColors.amber.primary : PremiumColors.border.default, justifyContent: "center", paddingHorizontal: 2 }}
                >
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "white", alignSelf: draft.autoShowModal ? "flex-end" : "flex-start" }} />
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: PremiumColors.text.primary }}>Silent AirPrint</Text>
                <TouchableOpacity 
                   activeOpacity={0.8}
                   onPress={() => setDraft(p => ({ ...p, silentPrint: !p.silentPrint }))}
                   style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: draft.silentPrint ? PremiumColors.amber.primary : PremiumColors.border.default, justifyContent: "center", paddingHorizontal: 2 }}
                >
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "white", alignSelf: draft.silentPrint ? "flex-end" : "flex-start" }} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Bluetooth Discovery */}
            <View style={{ marginBottom: 24, padding: 16, backgroundColor: PremiumColors.bg.hover, borderRadius: 16, borderWidth: 1, borderColor: PremiumColors.border.default }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Bluetooth size={20} color={PremiumColors.amber.light} />
                <Text style={{ color: PremiumColors.text.primary, fontWeight: "700" }}>Bluetooth Thermal Printer</Text>
              </View>

              <Text style={{ color: PremiumColors.text.secondary, fontSize: 13, marginBottom: 16 }}>
                Select a paired printer from the list, or type its MAC address manually.
              </Text>

              <Button 
                 title={isScanning ? "Scanning..." : "Scan for Bluetooth Printers"} 
                 onPress={handleScan} 
                 variant={isScanning ? "ghost" : "primary"}
                 style={{ marginBottom: 16 }}
              />

              {isScanning && <ActivityIndicator color={PremiumColors.amber.primary} style={{ marginBottom: 16 }} />}

              {discoveredDevices.length > 0 && (
                <View style={{ marginBottom: 16, backgroundColor: PremiumColors.bg.base, borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: PremiumColors.border.default }}>
                  {discoveredDevices.map((dev, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setDraft(p => ({ ...p, macAddress: dev.macAddress }))}
                      style={{ 
                        padding: 12, 
                        borderBottomWidth: i < discoveredDevices.length - 1 ? 1 : 0, 
                        borderColor: PremiumColors.border.default,
                        backgroundColor: draft.macAddress === dev.macAddress ? PremiumColors.amber.glow : "transparent",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <View>
                        <Text style={{ color: PremiumColors.text.primary, fontWeight: "600" }}>{dev.deviceName || "Unknown Device"}</Text>
                        <Text style={{ color: PremiumColors.text.secondary, fontSize: 12 }}>{dev.macAddress}</Text>
                      </View>
                      {draft.macAddress === dev.macAddress && (
                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: PremiumColors.amber.light }} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={{ color: PremiumColors.text.primary, fontSize: 12, marginBottom: 6 }}>Manual MAC Address:</Text>
              <TextInput
                style={{ backgroundColor: PremiumColors.bg.base, color: PremiumColors.text.primary, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: PremiumColors.border.default, fontSize: 16 }}
                value={draft.macAddress}
                onChangeText={(t) => setDraft(p => ({ ...p, macAddress: t }))}
                placeholder="e.g. 00:11:22:33:44:55"
                placeholderTextColor={PremiumColors.text.secondary}
                autoCapitalize="characters"
              />

              <Text style={{ color: PremiumColors.text.primary, fontSize: 12, marginTop: 16, marginBottom: 6 }}>Paper Width:</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[58, 80].map(w => (
                  <TouchableOpacity
                    key={w}
                    onPress={() => setDraft(p => ({ ...p, paperWidth: w }))}
                    style={{ flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: draft.paperWidth === w ? PremiumColors.amber.light : PremiumColors.border.default, backgroundColor: draft.paperWidth === w ? PremiumColors.amber.glow : PremiumColors.bg.base, alignItems: "center" }}
                  >
                    <Text style={{ color: draft.paperWidth === w ? PremiumColors.amber.light : PremiumColors.text.primary, fontWeight: "bold" }}>{w}mm</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Network / AirPrint */}
            <View style={{ marginBottom: 24, padding: 16, backgroundColor: PremiumColors.bg.hover, borderRadius: 16, borderWidth: 1, borderColor: PremiumColors.border.default }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <PrinterIcon size={20} color={PremiumColors.text.primary} />
                <Text style={{ color: PremiumColors.text.primary, fontWeight: "700" }}>System / Network Printer</Text>
              </View>

              <Text style={{ color: PremiumColors.text.secondary, fontSize: 13, marginBottom: 16 }}>
                If you are not using Bluetooth, enter the system printer exact URL (AirPrint/CUPS).
              </Text>

              <TextInput
                style={{ backgroundColor: PremiumColors.bg.base, color: PremiumColors.text.primary, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: PremiumColors.border.default, fontSize: 16 }}
                value={draft.targetPrinter}
                onChangeText={(t) => setDraft(p => ({ ...p, targetPrinter: t }))}
                placeholder="e.g. ipp://printer.local..."
                placeholderTextColor={PremiumColors.text.secondary}
                autoCapitalize="none"
              />
            </View>

          </ScrollView>

          {/* Footer */}
          <View style={{ padding: 20, borderTopWidth: 1, borderColor: PremiumColors.border.default, paddingBottom: Math.max(insets.bottom, 20) }}>
            <Button title="Save Settings" onPress={handleSave} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
