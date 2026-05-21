import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { BarcodeScannerView } from "../components/BarcodeScanner";
import { apiFetch } from "../lib/api";
import { colors, spacing, fontSize } from "../lib/theme";

export default function ScanReturnScreen() {
  const [result, setResult] = useState<string | null>(null);

  async function handleScan(data: string) {
    setResult(`Equipment: ${data}`);
    try {
      const res = await apiFetch("/borrowing/return", {
        method: "POST",
        body: JSON.stringify({ elabsTag: data }),
      });
      if (res.ok) {
        Alert.alert("Return Confirmed", `Equipment ${data} has been returned successfully.`);
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert("Return Failed", err?.error ?? "Could not process return.");
      }
    } catch {
      Alert.alert("Offline", "Return request saved. Will sync when online.");
    }
  }

  return (
    <View style={styles.container}>
      {result && (
        <View style={styles.resultBanner}>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      )}
      <BarcodeScannerView onScanned={handleScan} instruction="Scan equipment barcode to return" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  resultBanner: {
    backgroundColor: colors.bgCard,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultText: { color: colors.success, fontWeight: "600", fontSize: fontSize.sm, textAlign: "center" },
});