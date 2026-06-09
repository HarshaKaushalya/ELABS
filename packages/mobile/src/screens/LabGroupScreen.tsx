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

type Module = {
  id: number;
  code: string;
  name: string;
  totalSessions: number;
  upcomingSessions: number;
  completedSessions: number;
};

type Props = NativeStackScreenProps<RootStackParamList, "LabGroup">;

const moduleColors = [
  "#1dd5e6", "#3d83f6", "#7d5cff", "#f3ae2a",
  "#18d18f", "#ff4d57", "#e040fb", "#ff7043",
];

export default function LabGroupScreen({ navigation, route }: Props) {
  const { groupId, groupName } = route.params;
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchModules = useCallback(async () => {
    try {
      const res = await apiFetch(`/academic/semesters/${groupId}`);
      if (res.ok) {
        const d = await res.json();
        setModules(d.modules ?? []);
      }
    } catch {}
    setLoading(false);
  }, [groupId]);

  useEffect(() => { fetchModules(); }, [fetchModules]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchModules();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={modules}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyText}>No modules found</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const color = moduleColors[index % moduleColors.length];
          const done = Number(item.completedSessions ?? 0);
          const total = Number(item.totalSessions ?? 0);
          const pending = Number(item.upcomingSessions ?? 0);
          const progress = total > 0 ? Math.round((done / total) * 100) : 0;

          return (
            <Pressable
              style={({ pressed }) => [styles.card, { borderColor: `${color}30`, opacity: pressed ? 0.85 : 1 }]}
              onPress={() => navigation.navigate("ModuleDetail", {
                moduleId: item.id,
                moduleCode: item.code,
                moduleName: item.name,
                semesterId: groupId,
                semesterName: groupName,
              })}
            >
              {/* Top row: code badge + pending badge */}
              <View style={styles.cardTop}>
                <View style={[styles.codeBadge, { backgroundColor: `${color}18` }]}>
                  <Text style={[styles.codeText, { color }]}>{item.code}</Text>
                </View>
                {pending > 0 && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>{pending} pending</Text>
                  </View>
                )}
              </View>

              <Text style={styles.moduleName}>{item.name}</Text>

              {/* Progress bar */}
              <View style={styles.progressSection}>
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>Progress</Text>
                  <Text style={[styles.progressPct, { color }]}>{progress}%</Text>
                </View>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${progress}%` as any, backgroundColor: color }]} />
                </View>
              </View>

              {/* Stats row */}
              <View style={styles.statsRow}>
                <Text style={[styles.stat, { color: colors.success }]}>✓ {done} done</Text>
                <Text style={[styles.stat, { color: colors.warning }]}>◷ {pending} upcoming</Text>
                <Text style={[styles.stat, { color: colors.textSecondary }]}>{total} total</Text>
              </View>

              <Text style={[styles.arrow, { color }]}>›</Text>
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
  list: { padding: spacing.md, gap: spacing.sm },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative",
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  codeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: borderRadius.full },
  codeText: { fontSize: fontSize.xs, fontWeight: "700", letterSpacing: 0.8 },
  pendingBadge: { backgroundColor: `${colors.warning}20`, paddingHorizontal: 10, paddingVertical: 3, borderRadius: borderRadius.full },
  pendingText: { fontSize: fontSize.xs, color: colors.warning, fontWeight: "600" },
  moduleName: { fontSize: fontSize.md, fontWeight: "600", color: colors.textPrimary, marginBottom: 14, lineHeight: 22 },
  progressSection: { marginBottom: 12 },
  progressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  progressLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  progressPct: { fontSize: fontSize.xs, fontWeight: "700" },
  progressBg: { height: 5, backgroundColor: colors.border, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 5, borderRadius: 3 },
  statsRow: { flexDirection: "row", gap: 16 },
  stat: { fontSize: fontSize.xs, fontWeight: "500" },
  arrow: { position: "absolute", right: 16, bottom: 16, fontSize: 22, opacity: 0.6 },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { color: colors.textMuted, fontSize: fontSize.md },
});
