import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BarcodeScannerView } from "../components/BarcodeScanner";
import { apiFetch } from "../lib/api";
import { colors, spacing, borderRadius, fontSize } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";

type ScannedItem = {
  elabsTag: string;
  name: string;
  transactionId: number | null;
  borrowerName: string | null;
  purpose: string | null;
  dueAt: string | null;
};

export default function ScanReturnScreen() {
  const [scanned, setScanned] = useState<ScannedItem | null>(null);
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [returned, setReturned] = useState(false);

  async function handleScan(data: string) {
    setScanning(false);
    setLoading(true);
    try {
      // Look up item by ELABS tag
      const res = await apiFetch(`/inventory/items/barcode/${encodeURIComponent(data)}`);
      if (!res.ok) {
        Alert.alert("Not Found", `Item "${data}" not found in inventory.`);
        setScanning(true);
        return;
      }
      const item = await res.json();
      setScanned({
        elabsTag: data,
        name: item.item?.name ?? data,
        transactionId: item.item?.transactionId ?? null,
        borrowerName: item.item?.borrowerName ?? null,
        purpose: item.item?.purpose ?? null,
        dueAt: item.item?.dueAt ?? null,
      });
    } catch {
      Alert.alert("Error", "Could not look up item. Check your connection.");
      setScanning(true);
    }
    setLoading(false);
  }

  async function handleReturn() {
    if (!scanned?.transactionId) {
      Alert.alert("Error", "No active borrow transaction found for this item.");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/inventory/return", {
        method: "POST",
        body: JSON.stringify({ transactionId: scanned.transactionId }),
      });
      if (res.ok) {
        setReturned(true);
      } else {
        const d = await res.json();
        Alert.alert("Return Failed", d.error || "Could not process return.");
      }
    } catch {
      Alert.alert("Error", "Network error — check API is running.");
    }
    setLoading(false);
  }

  function reset() {
    setScanned(null);
    setScanning(true);
    setReturned(false);
  }

  // ── Success state ──
  if (returned && scanned) {
    return (
      <View style={styles.container}>
        <View style={styles.successCard}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle-outline" size={42} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>Item Returned!</Text>
          <Text style={styles.successTag}>{scanned.elabsTag}</Text>
          <Text style={styles.successName}>{scanned.name}</Text>
          <Pressable style={styles.scanAgainBtn} onPress={reset}>
            <Text style={styles.scanAgainText}>Scan Another →</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Confirm return state ──
  if (scanned && !scanning) {
    return (
      <View style={styles.container}>
        <View style={styles.confirmCard}>
          <Text style={styles.confirmTitle}>Item Found</Text>
          <View style={styles.itemInfo}>
            <Text style={styles.itemTag}>{scanned.elabsTag}</Text>
            <Text style={styles.itemName}>{scanned.name}</Text>
          </View>

          {scanned.transactionId ? (
            <View style={styles.txInfo}>
              {scanned.borrowerName && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Borrower</Text>
                  <Text style={styles.infoVal}>{scanned.borrowerName}</Text>
                </View>
              )}
              {scanned.purpose && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Purpose</Text>
                  <Text style={styles.infoVal}>{scanned.purpose}</Text>
                </View>
              )}
              {scanned.dueAt && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Due Date</Text>
                  <Text style={styles.infoVal}>
                    {new Date(scanned.dueAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.notBorrowedBox}>
              <Text style={styles.notBorrowedText}>This item is not currently borrowed</Text>
            </View>
          )}

          <View style={styles.btnRow}>
            <Pressable style={styles.cancelBtn} onPress={reset}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            {scanned.transactionId && (
              <Pressable
                style={[styles.returnBtn, loading && styles.returnBtnDisabled]}
                onPress={handleReturn}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color={colors.bg} size="small" />
                  : <Text style={styles.returnBtnText}>Confirm Return</Text>
                }
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  }

  // ── Scanning state ──
  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Looking up item…</Text>
        </View>
      )}
      <BarcodeScannerView onScanned={handleScan} instruction="Scan the ELABS tag to return" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loadingOverlay: {
    position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center", alignItems: "center", zIndex: 10,
    gap: 12,
  },
  loadingText: { color: colors.textPrimary, fontSize: fontSize.md },

  // Confirm card
  confirmCard: {
    margin: spacing.md, backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  confirmTitle: { fontSize: fontSize.lg, fontWeight: "700", color: colors.textPrimary, marginBottom: spacing.md },
  itemInfo: {
    backgroundColor: colors.bgCardLight, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.md,
  },
  itemTag: { color: colors.primary, fontFamily: "monospace", fontWeight: "700", fontSize: fontSize.md, marginBottom: 4 },
  itemName: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: "600" },
  txInfo: {
    backgroundColor: colors.bgCardLight, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.md, gap: 10,
  },
  infoRow: { flexDirection: "row", justifyContent: "space-between" },
  infoLabel: { color: colors.textSecondary, fontSize: fontSize.sm },
  infoVal: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: "500" },
  notBorrowedBox: {
    backgroundColor: `${colors.warning}15`, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: `${colors.warning}30`,
  },
  notBorrowedText: { color: colors.warning, fontSize: fontSize.sm, fontWeight: "600" },
  btnRow: { flexDirection: "row", gap: spacing.sm },
  cancelBtn: {
    flex: 1, backgroundColor: colors.bgCardLight, borderRadius: borderRadius.md,
    padding: 14, alignItems: "center", borderWidth: 1, borderColor: colors.border,
  },
  cancelBtnText: { color: colors.textSecondary, fontWeight: "600" },
  returnBtn: {
    flex: 2, backgroundColor: colors.success, borderRadius: borderRadius.md,
    padding: 14, alignItems: "center",
  },
  returnBtnDisabled: { opacity: 0.6 },
  returnBtnText: { color: colors.bg, fontWeight: "700", fontSize: fontSize.md },

  // Success state
  successCard: {
    margin: spacing.md, backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg, padding: spacing.xl,
    borderWidth: 1, borderColor: `${colors.success}40`,
    alignItems: "center",
  },
  successIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: `${colors.success}20`, borderWidth: 2, borderColor: colors.success,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.md,
  },
  successTitle: { fontSize: fontSize.xl, fontWeight: "700", color: colors.success, marginBottom: 8 },
  successTag: { color: colors.primary, fontFamily: "monospace", fontWeight: "700", fontSize: fontSize.md },
  successName: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 4, marginBottom: spacing.xl },
  scanAgainBtn: {
    backgroundColor: colors.success, borderRadius: borderRadius.md,
    paddingHorizontal: 32, paddingVertical: 14,
  },
  scanAgainText: { color: colors.bg, fontWeight: "700", fontSize: fontSize.md },
});