import { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiFetch } from "../lib/api";
import { colors, spacing, borderRadius, fontSize } from "../lib/theme";

type InventoryItem = {
  id: number;
  elabsTag: string;
  name: string;
  category: string;
  labName?: string;
  status: string;
  condition: string;
};

const statusColors: Record<string, string> = {
  AVAILABLE: colors.success,
  BORROWED: colors.warning,
  MAINTENANCE: colors.accent,
  OUT_OF_SERVICE: colors.danger,
};

export default function InventoryScreen() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filtered, setFiltered] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const res = await apiFetch("/inventory");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.items ?? [];
        setItems(list);
        setFiltered(list);
      }
    } catch {
      // offline or error
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(items);
    } else {
      const q = search.toLowerCase();
      setFiltered(
        items.filter(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            i.elabsTag.toLowerCase().includes(q) ||
            i.category?.toLowerCase().includes(q)
        )
      );
    }
  }, [search, items]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchItems();
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
      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search items, tags..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No items found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.itemName}>{item.name}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${statusColors[item.status] ?? colors.textMuted}22` },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: statusColors[item.status] ?? colors.textMuted },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: statusColors[item.status] ?? colors.textMuted },
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            </View>
            <Text style={styles.tag}>{item.elabsTag}</Text>
            <View style={styles.cardMeta}>
              <Text style={styles.metaText}>{item.category ?? "N/A"}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>{item.labName ?? "Unassigned"}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>{item.condition ?? "Good"}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  searchWrap: { padding: spacing.md, paddingBottom: 0 },
  searchInput: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: 14,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  list: { padding: spacing.md, gap: spacing.sm },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemName: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: fontSize.xs, fontWeight: "700", textTransform: "uppercase" },
  tag: { fontSize: fontSize.xs, color: colors.primary, marginTop: 4, fontWeight: "500" },
  cardMeta: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 6 },
  metaText: { fontSize: fontSize.xs, color: colors.textSecondary },
  metaDot: { fontSize: fontSize.xs, color: colors.textMuted },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { color: colors.textMuted, fontSize: fontSize.md },
});