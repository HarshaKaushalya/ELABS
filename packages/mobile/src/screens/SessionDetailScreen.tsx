import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/routes";
import { apiFetch } from "../lib/api";
import { colors, spacing, borderRadius, fontSize } from "../lib/theme";

type Session = {
  id: number; title: string; description: string;
  scheduledDate: string; durationHours: number; status: string;
  documentUrl: string | null;
  moduleId: number; moduleCode: string; moduleName: string;
  semesterId: number; semesterName: string;
  attended: boolean; reportSubmitted: boolean; completedAt: string | null;
};

type Props = NativeStackScreenProps<RootStackParamList, "SessionDetail">;

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function SessionDetailScreen({ navigation, route }: Props) {
  const { sessionId } = route.params;
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/academic/lab-sessions/${sessionId}`)
      .then((r) => r.json())
      .then((d) => setSession(d.session ?? null))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.danger, fontSize: fontSize.md }}>Session not found.</Text>
      </View>
    );
  }

  const isDone = session.attended && session.reportSubmitted;
  const statusColor = isDone ? colors.success : colors.warning;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* Status pill */}
      <View style={[styles.statusPill, { backgroundColor: `${statusColor}15`, borderColor: `${statusColor}40` }]}>
        <Text style={[styles.statusText, { color: statusColor }]}>
          {isDone ? "✓ Completed" : "◷ Pending"}
        </Text>
      </View>

      {/* Module badge */}
      <View style={styles.moduleBadge}>
        <Text style={styles.moduleBadgeText}>{session.moduleCode} — {session.moduleName}</Text>
      </View>

      {/* Description */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Lab Description</Text>
        <Text style={styles.description}>{session.description || "No description provided."}</Text>
      </View>

      {/* Details */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Details</Text>
        {[
          { label: "Scheduled Date", val: formatDate(session.scheduledDate) },
          { label: "Duration", val: `${session.durationHours} hours` },
          { label: "Semester", val: session.semesterName },
          { label: "Status", val: session.status },
        ].map((row) => (
          <View key={row.label} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{row.label}</Text>
            <Text style={styles.detailVal}>{row.val}</Text>
          </View>
        ))}
      </View>

      {/* Completion checklist */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Completion</Text>
        {[
          { label: "Attendance", done: session.attended },
          { label: "Report Submitted", done: session.reportSubmitted },
        ].map((item) => (
          <View key={item.label} style={styles.checkRow}>
            <View style={[styles.checkCircle, {
              backgroundColor: item.done ? `${colors.success}20` : colors.bgCardLight,
              borderColor: item.done ? colors.success : colors.border,
            }]}>
              <Text style={{ color: colors.success, fontSize: 11, fontWeight: "700" }}>
                {item.done ? "✓" : ""}
              </Text>
            </View>
            <Text style={[styles.checkLabel, { color: item.done ? colors.success : colors.textSecondary }]}>
              {item.label}
            </Text>
          </View>
        ))}
        {session.completedAt && (
          <Text style={styles.completedAt}>Completed: {formatDate(session.completedAt)}</Text>
        )}
      </View>

      {/* Document */}
      {session.documentUrl && (
        <Pressable
          style={styles.docBtn}
          onPress={() => session.documentUrl && Linking.openURL(session.documentUrl)}
        >
          <Text style={styles.docBtnText}>📄 Open Lab Document →</Text>
        </Pressable>
      )}

      {/* Back button */}
      <Pressable
        style={styles.backBtn}
        onPress={() => navigation.navigate("ModuleDetail", {
          moduleId: session.moduleId,
          moduleCode: session.moduleCode,
          moduleName: session.moduleName,
          semesterId: session.semesterId,
          semesterName: session.semesterName,
        })}
      >
        <Text style={styles.backBtnText}>← Back to Module</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  statusPill: {
    alignSelf: "flex-start", borderRadius: borderRadius.full, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 6, marginBottom: spacing.sm,
  },
  statusText: { fontWeight: "700", fontSize: fontSize.sm },
  moduleBadge: {
    backgroundColor: `${colors.accent}15`, borderRadius: borderRadius.sm,
    paddingHorizontal: 12, paddingVertical: 4, alignSelf: "flex-start",
    marginBottom: spacing.md,
  },
  moduleBadgeText: { color: colors.accent, fontSize: fontSize.xs, fontWeight: "600" },
  panel: {
    backgroundColor: colors.bgCard, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
    marginBottom: spacing.sm,
  },
  panelTitle: { fontSize: fontSize.md, fontWeight: "700", color: colors.textPrimary, marginBottom: 12 },
  description: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 22 },
  detailRow: { marginBottom: 10 },
  detailLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: 2 },
  detailVal: { fontSize: fontSize.sm, color: colors.textPrimary },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  checkLabel: { fontSize: fontSize.sm },
  completedAt: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 6 },
  docBtn: {
    backgroundColor: `${colors.accent}15`, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.sm, alignItems: "center",
  },
  docBtnText: { color: colors.accent, fontWeight: "600", fontSize: fontSize.sm },
  backBtn: {
    backgroundColor: colors.bgCard, borderRadius: borderRadius.md,
    padding: spacing.md, alignItems: "center", borderWidth: 1, borderColor: colors.border,
  },
  backBtnText: { color: colors.textSecondary, fontSize: fontSize.sm },
});
