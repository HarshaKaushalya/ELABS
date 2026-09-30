import { useEffect, useState, useCallback } from "react";
import {
  ScrollView, RefreshControl, StyleSheet, Text, View, ActivityIndicator, Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/routes";
import { apiGet } from "../lib/api";
import { colors, spacing, borderRadius, fontSize } from "../lib/theme";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type Props = NativeStackScreenProps<RootStackParamList, "CourseDetail">;
type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Session {
  id: number;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  labName: string;
  status: string;
}

interface GradeEntry {
  activityTitle: string;
  maxScore: number;
  earnedScore: number | null;
  submittedAt: string | null;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: colors.accent,
  ONGOING: colors.success,
  COMPLETED: colors.textMuted,
  CANCELLED: colors.danger,
};

export default function CourseDetailScreen({ route }: Props) {
  const navigation = useNavigation<Nav>();
  const { moduleId, moduleCode, moduleName } = route.params;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"sessions" | "grades">("sessions");

  const fetchData = useCallback(async () => {
    try {
      const [sessData, gradeData] = await Promise.all([
        apiGet<{ sessions: Session[] }>(`/courses/${moduleId}/sessions`).catch(() => ({ sessions: [] })),
        apiGet<{ grades: GradeEntry[] }>(`/courses/${moduleId}/grades`).catch(() => ({ grades: [] })),
      ]);
      setSessions(sessData.sessions ?? []);
      setGrades(gradeData.grades ?? []);
    } catch {}
    setLoading(false);
  }, [moduleId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  const avgGrade = grades.length > 0
    ? grades.reduce((sum, g) => sum + (g.earnedScore ?? 0), 0) / grades.length
    : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Module Header */}
      <View style={styles.heroCard}>
        <Text style={styles.heroCode}>{moduleCode}</Text>
        <Text style={styles.heroName}>{moduleName}</Text>
        {avgGrade !== null && (
          <View style={styles.gradeRow}>
            <Ionicons name="star" size={14} color={colors.warning} />
            <Text style={styles.gradeAvg}>Avg: {avgGrade.toFixed(1)}</Text>
          </View>
        )}
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === "sessions" && styles.tabActive]}
          onPress={() => setTab("sessions")}
        >
          <Text style={[styles.tabText, tab === "sessions" && styles.tabTextActive]}>Sessions</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === "grades" && styles.tabActive]}
          onPress={() => setTab("grades")}
        >
          <Text style={[styles.tabText, tab === "grades" && styles.tabTextActive]}>Grades</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : tab === "sessions" ? (
        sessions.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No sessions scheduled.</Text>
          </View>
        ) : (
          sessions.map(s => (
            <Pressable
              key={s.id}
              style={({ pressed }) => [styles.sessionCard, pressed && { opacity: 0.7 }]}
              onPress={() => navigation.navigate("SessionDetail", { sessionId: s.id })}
            >
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[s.status] ?? colors.textMuted }]} />
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionTitle} numberOfLines={1}>{s.title}</Text>
                <Text style={styles.sessionMeta}>{fmt(s.scheduledAt)} · {s.durationMinutes}min</Text>
                <Text style={styles.sessionLab}>{s.labName}</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={16} color={colors.textMuted} />
            </Pressable>
          ))
        )
      ) : (
        grades.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="ribbon-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No grades recorded yet.</Text>
          </View>
        ) : (
          grades.map((g, i) => (
            <View key={i} style={styles.gradeCard}>
              <View style={styles.gradeCardLeft}>
                <Text style={styles.gradeTitle} numberOfLines={1}>{g.activityTitle}</Text>
                {g.submittedAt && <Text style={styles.gradeDate}>{fmt(g.submittedAt)}</Text>}
              </View>
              <View style={styles.gradeCardRight}>
                <Text style={[styles.gradeScore, { color: g.earnedScore !== null ? colors.success : colors.textMuted }]}>
                  {g.earnedScore ?? "—"} / {g.maxScore}
                </Text>
              </View>
            </View>
          ))
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: {
    backgroundColor: colors.bgCard, borderRadius: borderRadius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  heroCode: { fontSize: fontSize.lg, fontWeight: "700", color: colors.primary, marginBottom: 4 },
  heroName: { fontSize: fontSize.xl, fontWeight: "700", color: colors.textPrimary },
  gradeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.sm },
  gradeAvg: { fontSize: fontSize.sm, color: colors.warning, fontWeight: "600" },

  tabs: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: borderRadius.md,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    alignItems: "center",
  },
  tabActive: { borderColor: colors.primary, backgroundColor: colors.primary + "20" },
  tabText: { fontSize: fontSize.md, fontWeight: "600", color: colors.textSecondary },
  tabTextActive: { color: colors.primary },

  sessionCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: borderRadius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  sessionInfo: { flex: 1 },
  sessionTitle: { fontSize: fontSize.md, fontWeight: "600", color: colors.textPrimary, marginBottom: 2 },
  sessionMeta: { fontSize: fontSize.xs, color: colors.textMuted },
  sessionLab: { fontSize: fontSize.xs, color: colors.primary, marginTop: 2 },

  gradeCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.bgCard, borderRadius: borderRadius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  gradeCardLeft: { flex: 1 },
  gradeTitle: { fontSize: fontSize.md, fontWeight: "600", color: colors.textPrimary },
  gradeDate: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  gradeCardRight: {},
  gradeScore: { fontSize: fontSize.lg, fontWeight: "700" },

  empty: { alignItems: "center", paddingVertical: spacing.xl, gap: spacing.md },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: "center" },
});
