import { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { apiFetch } from "../lib/api";
import { colors, spacing, borderRadius, fontSize } from "../lib/theme";

type Lab = {
  id: number;
  name: string;
  location: string;
  floor: number;
  capacity: number;
  currentOccupancy?: number;
};

export default function MyLabsScreen() {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLabs = useCallback(async () => {
    try {
      const res = await apiFetch("/labs");
      if (res.ok) {
        const data = await res.json();
        setLabs(Array.isArray(data) ? data : data.labs ?? []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchLabs(); }, [fetchLabs]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchLabs();
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
        data={labs}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No labs found</Text>
          </View>
        }
        renderItem={({ item }) => {
          const pct = item.capacity > 0 ? Math.round(((item.currentOccupancy ?? 0) / item.capacity) * 100) : 0;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.labName}>{item.name}</Text>
                <View style={[styles.occupancyBadge, { backgroundColor: pct > 80 ? `${colors.danger}22` : `${colors.success}22` }]}>
                  <Text style={[styles.occupancyText, { color: pct > 80 ? colors.danger : colors.success }]}>
                    {item.currentOccupancy ?? 0}/{item.capacity}
                  </Text>
                </View>
              </View>
              <Text style={styles.location}>{item.location} • Floor {item.floor}</Text>
              {/* Progress bar */}
              <View style={styles.progressBg}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(pct, 100)}%`,
                      backgroundColor: pct > 80 ? colors.danger : pct > 50 ? colors.warning : colors.success,
                    },
                  ]}
                />
              </View>
            </View>
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
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  labName: { fontSize: fontSize.md, fontWeight: "600", color: colors.textPrimary },
  occupancyBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: borderRadius.full },
  occupancyText: { fontSize: fontSize.xs, fontWeight: "700" },
  location: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 4 },
  progressBg: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    marginTop: spacing.sm,
    overflow: "hidden",
  },
  progressFill: { height: 6, borderRadius: 3 },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { color: colors.textMuted, fontSize: fontSize.md },
});