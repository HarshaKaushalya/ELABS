import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, borderRadius, fontSize } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";

export default function MessagesScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.empty}>
        <Ionicons name="chatbubbles-outline" size={56} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
        <Text style={styles.emptyTitle}>Messages</Text>
        <Text style={styles.emptyText}>
          Internal messaging coming soon.{"\n"}
          Contact your lab technician for urgent requests.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center", padding: spacing.lg },
  empty: { alignItems: "center" },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: "700", color: colors.textPrimary, marginBottom: spacing.sm },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: "center", lineHeight: 24 },
});