import { Pressable, StyleSheet, Text, View } from "react-native";

type BarcodeScannerProps = {
  onScan?: (code: string) => void;
};

export function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Barcode Scanner Placeholder</Text>
      <Pressable style={styles.button} onPress={() => onScan?.("DEMO-CODE-001")}>
        <Text style={styles.buttonText}>Simulate Scan</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 12, padding: 12 },
  title: { fontWeight: "600", marginBottom: 8 },
  button: { backgroundColor: "#0f766e", borderRadius: 8, padding: 10, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "600" }
});