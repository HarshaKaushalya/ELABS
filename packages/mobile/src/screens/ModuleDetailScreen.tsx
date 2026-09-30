import { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/routes";
import { apiFetch } from "../lib/api";
import { colors, spacing, borderRadius, fontSize } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";

type Session = {
  id: number;
  title: string;
  description: string;
  scheduledDate: string;
  durationHours: number;
  status: "UPCOMING" | "ONGOING" | "COMPLETED";
  attended: boolean;
  reportSubmitted: boolean;
  completedAt: string | null;
  documentUrl: string | null;
};

type Props = NativeStackScreenProps<RootStackParamList, "ModuleDetail">;

function sessionBadge(s: Session): { label: string; color: string } {
  const isDone = s.attended && s.reportSubmitted;
  if (isDone) return { label: "Done", color: colors.success };
  if (s.status === "ONGOING") return { label: "Ongoing", color: colors.accent };
  return { label: "Pending", color: colors.warning };
}

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function ModuleDetailScreen({ navigation, route }: Props) {
  const { moduleId, moduleCode, moduleName, semesterId, semesterName } = route.params;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "done">("pending");

  const fetchSessions = useCallback(async () => {
    try {
      const res = await apiFetch(`/academic/modules/${moduleId}`);
      if (res.ok) {
        const d = await res.json();
        setSessions(d.sessions ?? []);
      }
    } catch {}
    setLoading(false);
  }, [moduleId]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchSessions();
    setRefreshing(false);
  }

  const pending = sessions.filter((s) => !(s.attended && s.reportSubmitted));
  const done = sessions.filter((s) => s.attended && s.reportSubmitted);
  const displayed = activeTab === "pending" ? pending : done;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats row */}
      <View style={styles.statsRow}>
        {[
          { label: "Total", val: sessions.length, color: colors.textSecondary },
          { label: "Pending", val: pending.length, color: colors.warning },
          { label: "Completed", val: done.length, color: colors.success },
        ].map((s) => (
          <View key={s.label} style={[styles.statCard, { borderColor: `${s.color}25` }]}>
            <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === "pending" && { borderBottomColor: colors.warning, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab("pending")}
        >
          <Text style={[styles.tabText, { color: activeTab === "pending" ? colors.warning : colors.textMuted }]}>
            Pending ({pending.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "done" && { borderBottomColor: colors.success, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab("done")}
        >
          <Text style={[styles.tabText, { color: activeTab === "done" ? colors.success : colors.textMuted }]}>
            Done ({done.length})
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={displayed}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {activeTab === "pending" ? "No pending sessions" : "No completed sessions yet"}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const badge = sessionBadge(item);
          return (
            <Pressable
              style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}
              onPress={() => navigation.navigate("SessionDetail", { sessionId: item.id })}
            >
              <View style={styles.cardLeft}>
                <View style={[styles.indexCircle, { backgroundColor: `${badge.color}20`, borderColor: `${badge.color}50` }]}>
                  <Text style={[styles.indexText, { color: badge.color }]}>{index + 1}</Text>
                </View>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.sessionTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={[styles.badge, { backgroundColor: `${badge.color}18` }]}>
                    <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                </View>
                <View style={styles.cardMeta}>
                  <Text style={styles.metaText}>{fmt(item.scheduledDate)}</Text>
                  <Text style={styles.metaText}>{item.durationHours}h</Text>
                  {item.attended && <Text style={[styles.metaText, { color: colors.success }]}>Attended</Text>}
                  {item.reportSubmitted && <Text style={[styles.metaText, { color: colors.success }]}>Report</Text>}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  statsRow: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, paddingBottom: 0 },
  statCard: {
    flex: 1, backgroundColor: colors.bgCard, borderRadius: borderRadius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border, alignItems: "center",
  },
  statVal: { fontSize: fontSize.xl, fontWeight: "800" },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  tabs: {
    flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border,
    marginTop: spacing.md, marginHorizontal: spacing.md,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabText: { fontSize: fontSize.sm, fontWeight: "600" },
  list: { padding: spacing.md, gap: spacing.sm },
  card: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.bgCard, borderRadius: borderRadius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  cardLeft: { flexShrink: 0 },
  indexCircle: {
    width: 36, height: 36, borderRadius: 18, alignItems: "center",
    justifyContent: "center", borderWidth: 1,
  },
  indexText: { fontSize: fontSize.sm, fontWeight: "700" },
  cardContent: { flex: 1, minWidth: 0 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" },
  sessionTitle: { flex: 1, fontSize: fontSize.md, fontWeight: "600", color: colors.textPrimary },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full, flexShrink: 0 },
  badgeText: { fontSize: fontSize.xs, fontWeight: "700" },
  cardMeta: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  metaText: { fontSize: fontSize.xs, color: colors.textSecondary },
  arrow: { color: colors.textMuted, fontSize: 22, flexShrink: 0 },
  empty: { paddingTop: 60, alignItems: "center" },
  emptyText: { color: colors.textMuted, fontSize: fontSize.md },
});
