import { useEffect, useState, useCallback } from "react";
import {
  Pressable, RefreshControl, ScrollView, StyleSheet,
  Text, View, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { loadUser, clearAccessToken, User } from "../lib/auth";
import { apiGet } from "../lib/api";
import { colors, spacing, borderRadius, fontSize } from "../lib/theme";
import { useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { TabParamList, HomeStackParamList } from "../navigation/routes";

// Navigation type: HomeStack inside the Tab inside Root
type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList>,
  BottomTabNavigationProp<TabParamList>
>;

type DashStats = {
  totalLabs: number;
  totalItems: number;
  availableItems: number;
  borrowedItems: number;
  overdueItems: number;
};

const studentActions = [
  { label: "Scan Entry", icon: "camera-outline" as const, screen: "ScanEntry" as const, gradient: ["#18d18f", "#1dd5e6"] as [string, string] },
  { label: "Scan Exit", icon: "exit-outline" as const, screen: "ScanExit" as const, gradient: ["#3d83f6", "#6366f1"] as [string, string] },
  { label: "Borrow", icon: "cube-outline" as const, screen: "ScanBorrow" as const, gradient: ["#f59e0b", "#ef4444"] as [string, string] },
  { label: "Return", icon: "arrow-undo-outline" as const, screen: "ScanReturn" as const, gradient: ["#8b5cf6", "#ec4899"] as [string, string] },
];

const staffActions = [
  { label: "Scan Entry", icon: "camera-outline" as const, screen: "ScanEntry" as const, gradient: ["#18d18f", "#1dd5e6"] as [string, string] },
  { label: "Scan Exit", icon: "exit-outline" as const, screen: "ScanExit" as const, gradient: ["#3d83f6", "#6366f1"] as [string, string] },
  { label: "Borrow", icon: "cube-outline" as const, screen: "ScanBorrow" as const, gradient: ["#f59e0b", "#ef4444"] as [string, string] },
  { label: "Return", icon: "arrow-undo-outline" as const, screen: "ScanReturn" as const, gradient: ["#8b5cf6", "#ec4899"] as [string, string] },
];

export default function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);

  const isStaff = user?.roles?.some(r =>
    ["SYSTEM_ADMIN", "MODULE_COORDINATOR", "LECTURER", "LAB_TECHNICIAN"].includes(r)
  );

  const fetchData = useCallback(async () => {
    const [u, statsData] = await Promise.all([
      loadUser(),
      apiGet<{ stats: DashStats }>("/dashboard/summary").catch(() => null),
    ]);
    setUser(u);
    if (statsData) setStats(statsData.stats);
    setLoadingStats(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  async function handleLogout() {
    await clearAccessToken();
    navigation.reset({ index: 0, routes: [{ name: "Login" as any }] });
  }

  const greeting = user?.fullName
    ? `Hello, ${user.fullName.split(" ")[0]} 👋`
    : "Hello 👋";
  const role = user?.roles?.[0]?.replace("_", " ") ?? "User";
  const quickActions = isStaff ? staffActions : studentActions;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarRow}>
            <LinearGradient colors={["#1dd5e6", "#3d83f6"]} style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.fullName?.[0] ?? "E"}</Text>
            </LinearGradient>
            <View>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.role}>{role}</Text>
            </View>
          </View>
          <Pressable onPress={() => navigation.navigate("Notifications")} style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Stats Row */}
        {loadingStats ? (
          <ActivityIndicator color={colors.primary} style={{ marginBottom: spacing.lg }} />
        ) : (
          <View style={styles.statsGrid}>
            <StatCard label="Total Items" value={String(stats?.totalItems ?? "—")} color={colors.primary} icon="cube-outline" />
            <StatCard label="Available" value={String(stats?.availableItems ?? "—")} color={colors.success} icon="checkmark-circle-outline" />
            <StatCard label="Borrowed" value={String(stats?.borrowedItems ?? "—")} color={colors.warning} icon="swap-horizontal-outline" />
            <StatCard label="Overdue" value={String(stats?.overdueItems ?? "—")} color={colors.danger} icon="alert-circle-outline" />
          </View>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {quickActions.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => navigation.navigate(action.screen)}
              style={({ pressed }) => [styles.quickAction, pressed && { opacity: 0.7 }]}
            >
              <LinearGradient colors={action.gradient} style={styles.quickGradient}>
                <Ionicons name={action.icon} size={26} color={colors.white} />
              </LinearGradient>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Menu Grid */}
        <Text style={styles.sectionTitle}>Navigation</Text>
        <View style={styles.menuGrid}>
          <MenuItem icon="flask-outline" label="Lab Groups" color="#18d18f" onPress={() => navigation.navigate("LabsTab" as any, { screen: "MyLabs" } as any)} />
          <MenuItem icon="book-outline" label="Courses" color="#3d83f6" onPress={() => navigation.navigate("LabsTab" as any, { screen: "Courses" } as any)} />
          <MenuItem icon="chatbubble-ellipses-outline" label="AI Assistant" color="#8b5cf6" onPress={() => navigation.navigate("ProfileTab" as any, { screen: "AiAssistant" } as any)} />
          <MenuItem icon="clipboard-outline" label="Inventory" color="#f59e0b" onPress={() => navigation.navigate("InventoryTab" as any, { screen: "Inventory" } as any)} />
          <MenuItem icon="log-out-outline" label="Sign Out" color={colors.danger} onPress={handleLogout} />
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: any }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <Ionicons name={icon} size={18} color={color} style={{ marginBottom: 4 }} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({ icon, label, color, onPress }: { icon: any; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward-outline" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: colors.white, fontSize: fontSize.lg, fontWeight: "700" },
  greeting: { fontSize: fontSize.lg, fontWeight: "700", color: colors.textPrimary },
  role: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2, textTransform: "capitalize" },
  bellBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.bgCard,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },

  statsGrid: {
    flexDirection: "row", flexWrap: "wrap",
    gap: spacing.sm, marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1, minWidth: "45%",
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  statValue: { fontSize: fontSize.xxl, fontWeight: "800" },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },

  sectionTitle: {
    fontSize: fontSize.lg, fontWeight: "700",
    color: colors.textPrimary, marginBottom: spacing.md,
  },
  quickGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.lg },
  quickAction: { alignItems: "center", flex: 1 },
  quickGradient: {
    width: 62, height: 62, borderRadius: 20,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.xs,
  },
  quickLabel: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: "600", textAlign: "center" },

  menuGrid: { gap: spacing.sm, marginBottom: spacing.lg },
  menuItem: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.bgCard, padding: spacing.md,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border,
    gap: spacing.md,
  },
  menuIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: fontSize.md, color: colors.textPrimary, fontWeight: "500" },
});