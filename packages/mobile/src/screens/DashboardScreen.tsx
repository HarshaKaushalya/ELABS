import { useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/routes";
import { loadUser, clearAccessToken, User } from "../lib/auth";
import { colors, spacing, borderRadius, fontSize } from "../lib/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">;

const quickActions = [
  { label: "Scan Entry", icon: "📷", screen: "ScanEntry" as const, gradient: ["#18d18f", "#1dd5e6"] as [string, string] },
  { label: "Scan Exit", icon: "🚪", screen: "ScanExit" as const, gradient: ["#3d83f6", "#6366f1"] as [string, string] },
  { label: "Borrow", icon: "📦", screen: "ScanBorrow" as const, gradient: ["#f59e0b", "#ef4444"] as [string, string] },
  { label: "Return", icon: "↩️", screen: "ScanReturn" as const, gradient: ["#8b5cf6", "#ec4899"] as [string, string] },
];

const menuItems = [
  { label: "Inventory", icon: "📋", screen: "Inventory" as const },
  { label: "My Labs", icon: "🔬", screen: "MyLabs" as const },
  { label: "AI Assistant", icon: "🤖", screen: "AiAssistant" as const },
  { label: "Messages", icon: "💬", screen: "Messages" as const },
  { label: "Notifications", icon: "🔔", screen: "Notifications" as const },
  { label: "Settings", icon: "⚙️", screen: "Settings" as const },
];

export default function DashboardScreen({ navigation }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUser().then(setUser);
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    const u = await loadUser();
    setUser(u);
    setRefreshing(false);
  }

  async function handleLogout() {
    await clearAccessToken();
    navigation.replace("Login");
  }

  const greeting = user?.fullName
    ? `Hello, ${user.fullName.split(" ")[0]}`
    : "Hello";
  const role = user?.roles?.[0] ?? "User";

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <Text style={styles.role}>{role}</Text>
          </View>
          <Pressable onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </Pressable>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard label="Equipment" value="156" color={colors.primary} />
          <StatCard label="Borrowed" value="23" color={colors.warning} />
          <StatCard label="Labs" value="4" color={colors.accent} />
        </View>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {quickActions.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => navigation.navigate(action.screen)}
              style={styles.quickAction}
            >
              <LinearGradient
                colors={action.gradient}
                style={styles.quickGradient}
              >
                <Text style={styles.quickIcon}>{action.icon}</Text>
              </LinearGradient>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Menu */}
        <Text style={styles.sectionTitle}>Menu</Text>
        <View style={styles.menuGrid}>
          {menuItems.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => navigation.navigate(item.screen)}
              style={styles.menuItem}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  greeting: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  role: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
    textTransform: "capitalize",
  },
  logoutBtn: {
    backgroundColor: "rgba(255, 75, 86, 0.12)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 75, 86, 0.3)",
  },
  logoutText: { color: "#ff8a95", fontWeight: "600", fontSize: fontSize.sm },

  // Stats
  statsRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  statCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontSize: fontSize.xxl, fontWeight: "800" },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },

  // Quick actions
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  quickGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  quickAction: { alignItems: "center", flex: 1 },
  quickGradient: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  quickIcon: { fontSize: 26 },
  quickLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: "600",
  },

  // Menu
  menuGrid: { gap: spacing.sm },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgCard,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuIcon: { fontSize: 22, marginRight: spacing.md },
  menuLabel: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  menuArrow: { fontSize: 22, color: colors.textMuted },
});