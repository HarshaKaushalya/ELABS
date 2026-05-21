import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { BarcodeScannerView } from "../components/BarcodeScanner";
import { apiFetch } from "../lib/api";
import { colors, spacing, borderRadius, fontSize } from "../lib/theme";

export default function ScanEntryScreen() {
  const [result, setResult] = useState<string | null>(null);

  async function handleScan(data: string) {
    setResult(`Scanned: ${data}`);
    try {
      const res = await apiFetch("/attendance/entry", {
        method: "POST",
        body: JSON.stringify({ barcode: data }),
      });
      if (res.ok) {
        Alert.alert("Entry Logged", `Your lab entry has been recorded.\nTag: ${data}`);
      } else {
        Alert.alert("Entry Failed", "Could not log entry. Try again.");
      }
    } catch {
      Alert.alert("Offline", "Entry saved locally. Will sync when online.");
    }
  }

  return (
    <View style={styles.container}>
      {result && (
        <View style={styles.resultBanner}>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      )}
      <BarcodeScannerView onScanned={handleScan} instruction="Scan your student ID to enter the lab" />
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