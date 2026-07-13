import { useEffect, useState, useCallback } from "react";
import {
  FlatList, Pressable, RefreshControl, StyleSheet,
  Text, View, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/routes";
import { apiFetch, apiGet } from "../lib/api";
import { colors, spacing, borderRadius, fontSize } from "../lib/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Notifications">;

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TYPE_ICON: Record<string, { icon: string; color: string }> = {
  BORROW:        { icon: "cube-outline",           color: colors.warning },
  RETURN:        { icon: "arrow-undo-outline",      color: colors.success },
  OVERDUE:       { icon: "alert-circle-outline",   color: colors.danger },
  SYSTEM:        { icon: "settings-outline",        color: colors.accent },
  MESSAGE:       { icon: "mail-outline",            color: colors.primary },
  ATTENDANCE:    { icon: "camera-outline",          color: "#8b5cf6" },
  DEFAULT:       { icon: "notifications-outline",   color: colors.textMuted },
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await apiGet<{ notifications: Notification[] }>("/notifications");
      setNotifications(data.notifications ?? []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }

  async function markRead(id: number) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    try { await apiFetch(`/notifications/${id}/read`, { method: "POST" }); } catch {}
  }

  async function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try { await apiFetch("/notifications/read-all", { method: "POST" }); } catch {}
  }

  const unread = notifications.filter(n => !n.isRead).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          {unread > 0 && <Text style={styles.unreadHint}>{unread} unread</Text>}
        </View>
        {unread > 0 && (
          <Pressable onPress={markAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-off-outline" size={56} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>All Caught Up!</Text>
          <Text style={styles.emptyText}>No new notifications right now.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const { icon, color } = TYPE_ICON[item.type] ?? TYPE_ICON.DEFAULT;
            return (
              <Pressable
                style={[styles.notifCard, !item.isRead && styles.unreadCard]}
                onPress={() => markRead(item.id)}
              >
                <View style={[styles.iconWrap, { backgroundColor: `${color}20` }]}>
                  <Ionicons name={icon as any} size={22} color={color} />
                </View>
                <View style={styles.notifContent}>
                  <View style={styles.notifTopRow}>
                    <Text style={styles.notifTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
                  </View>
                  <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
                </View>
                {!item.isRead && <View style={styles.unreadDot} />}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: fontSize.xl, fontWeight: "700", color: colors.textPrimary },
  unreadHint: { fontSize: fontSize.sm, color: colors.primary, marginTop: 2 },
  markAllBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.sm, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  markAllText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: "600" },

  list: { padding: spacing.md, gap: spacing.sm },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: "700", color: colors.textPrimary },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: "center" },

  notifCard: {
    flexDirection: "row", alignItems: "flex-start", gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: borderRadius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  unreadCard: { borderColor: colors.primary + "50", backgroundColor: colors.bgCardLight },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  notifContent: { flex: 1 },
  notifTopRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  notifTitle: { fontSize: fontSize.md, fontWeight: "600", color: colors.textPrimary, flex: 1 },
  notifTime: { fontSize: fontSize.xs, color: colors.textMuted },
  notifBody: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 4 },
});