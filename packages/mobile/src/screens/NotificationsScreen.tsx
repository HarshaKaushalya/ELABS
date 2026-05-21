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

type Notification = {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
};

const typeColors: Record<string, string> = {
  info: colors.info,
  warning: colors.warning,
  danger: colors.danger,
  success: colors.success,
};

export default function NotificationsScreen() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiFetch("/notifications");
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : data.notifications ?? []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchNotifications();
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
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>No notifications</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, !item.read && styles.unread]}>
            <View style={[styles.dot, { backgroundColor: typeColors[item.type] ?? colors.info }]} />
            <View style={styles.content}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.message}>{item.message}</Text>
              <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
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
  list: { padding: spacing.md, gap: spacing.sm },
  card: {
    flexDirection: "row",
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  unread: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  content: { flex: 1 },
  title: { fontSize: fontSize.md, fontWeight: "600", color: colors.textPrimary },
  message: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  time: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 6 },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { color: colors.textMuted, fontSize: fontSize.md },
});