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

type Semester = {
  id: number;
  name: string;
  level: number;
  moduleCount: number;
};

type Props = NativeStackScreenProps<RootStackParamList, "MyLabs">;

const groupColors: Record<number, string> = {
  1: "#1dd5e6", 2: "#3d83f6", 3: "#7d5cff", 4: "#f3ae2a",
  5: "#ff7043", 6: "#18d18f", 7: "#e040fb", 8: "#ff4d57", 9: "#a798ff",
};
const groupIcons: Record<number, string> = {
  1: "🔬", 2: "⚡", 3: "📡", 4: "🔌",
  5: "📊", 6: "☀️", 7: "📶", 8: "🚀", 9: "🧪",
};

export default function MyLabsScreen({ navigation }: Props) {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSemesters = useCallback(async () => {
    try {
      const res = await apiFetch("/academic/semesters");
      if (res.ok) {
        const d = await res.json();
        setSemesters(d.semesters ?? []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchSemesters(); }, [fetchSemesters]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchSemesters();
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
        data={semesters}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <Text style={styles.subtitle}>Select your semester group to view modules and lab sessions</Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔬</Text>
            <Text style={styles.emptyText}>No semester groups found</Text>
          </View>
        }
        renderItem={({ item }) => {
          const color = groupColors[item.level] ?? "#7ea5d6";
          const icon = groupIcons[item.level] ?? "🔭";
          const isRnD = item.level === 9;
          return (
            <Pressable
              style={({ pressed }) => [styles.card, { borderColor: `${color}30`, opacity: pressed ? 0.85 : 1 }]}
              onPress={() => navigation.navigate("LabGroup", { groupId: item.id, groupName: item.name })}
            >
              {/* Background glow */}
              <View style={[styles.glow, { backgroundColor: `${color}08` }]} />

              <View style={styles.cardRow}>
                {/* Icon */}
                <View style={[styles.iconBox, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
                  <Text style={styles.icon}>{icon}</Text>
                </View>

                {/* Info */}
                <View style={styles.info}>
                  <Text style={styles.semName}>{item.name}</Text>
                  <View style={[styles.yearBadge, { backgroundColor: `${color}15` }]}>
                    <Text style={[styles.yearText, { color }]}>
                      {isRnD ? "Research & Development" : `Year ${Math.ceil(item.level / 2)}`}
                    </Text>
                  </View>
                </View>

                {/* Modules count */}
                <View style={styles.countBox}>
                  <Text style={[styles.countVal, { color }]}>{item.moduleCount}</Text>
                  <Text style={styles.countLabel}>Modules</Text>
                </View>

                <Text style={[styles.arrow, { color }]}>›</Text>
              </View>
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
  subtitle: {
    fontSize: fontSize.sm, color: colors.textSecondary,
    marginBottom: spacing.md, lineHeight: 20,
  },
  list: { padding: spacing.md, gap: spacing.sm },
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    overflow: "hidden",
    position: "relative",
    backgroundColor: colors.bgCard,
  } as any,
  glow: {
    position: "absolute", top: -30, right: -30,
    width: 120, height: 120, borderRadius: 60,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconBox: {
    width: 52, height: 52, borderRadius: 14, borderWidth: 1,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  icon: { fontSize: 24 },
  info: { flex: 1, minWidth: 0 },
  semName: { fontSize: fontSize.md, fontWeight: "700", color: colors.textPrimary, marginBottom: 4 },
  yearBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 2, borderRadius: borderRadius.full },
  yearText: { fontSize: fontSize.xs, fontWeight: "600" },
  countBox: { alignItems: "center", flexShrink: 0 },
  countVal: { fontSize: fontSize.xl, fontWeight: "800" },
  countLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  arrow: { fontSize: 22, opacity: 0.6, flexShrink: 0 },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { color: colors.textMuted, fontSize: fontSize.md },
});