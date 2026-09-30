import { useEffect, useState, useCallback } from "react";
import {
  ScrollView, RefreshControl, StyleSheet, Text, View,
  Pressable, ActivityIndicator, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/routes";
import { loadUser, clearAccessToken, User } from "../lib/auth";
import { apiGet } from "../lib/api";
import { colors, spacing, borderRadius, fontSize } from "../lib/theme";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;
type Nav = NativeStackNavigationProp<RootStackParamList>;

interface MyBorrow {
  transactionId: number;
  labName: string;
  purpose: string;
  dueAt: string | null;
  status: string;
  daysOverdue: number;
  items: { elabsTag: string; name: string; category: string }[];
}

function fmt(d: string | null) {
  if (!d) return "No due date";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const ROLE_LABEL: Record<string, { label: string; color: string }> = {
  SYSTEM_ADMIN:       { label: "System Admin",        color: colors.danger },
  MODULE_COORDINATOR: { label: "Module Coordinator",  color: colors.warning },
  LECTURER:           { label: "Lecturer",             color: "#a78bfa" },
  LAB_TECHNICIAN:     { label: "Lab Technician",       color: colors.accent },
  STUDENT:            { label: "Student",              color: colors.primary },
};

export default function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const [user, setUser] = useState<User | null>(null);
  const [borrows, setBorrows] = useState<MyBorrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const [u, borrowData] = await Promise.all([
      loadUser(),
      apiGet<{ borrows: MyBorrow[] }>("/dashboard/my-borrows").catch(() => ({ borrows: [] })),
    ]);
    setUser(u);
    setBorrows(borrowData.borrows ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  async function handleLogout() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await clearAccessToken();
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        },
      },
    ]);
  }

  const primaryRole = user?.roles?.[0] ?? "USER";
  const roleInfo = ROLE_LABEL[primaryRole] ?? { label: primaryRole, color: colors.textMuted };
  const initials = user?.fullName
    ? user.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "EL";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <LinearGradient colors={["#1dd5e6", "#3d83f6"]} style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </LinearGradient>
        <Text style={styles.fullName}>{user?.fullName ?? "Loading..."}</Text>
        <Text style={styles.email}>{user?.email ?? ""}</Text>
        <View style={[styles.roleBadge, { backgroundColor: `${roleInfo.color}20` }]}>
          <Text style={[styles.roleText, { color: roleInfo.color }]}>{roleInfo.label}</Text>
        </View>
      </View>

      {/* Quick Links */}
      <Text style={styles.sectionTitle}>Tools</Text>
      <View style={styles.menuGroup}>
        <MenuItem icon="chatbubble-ellipses-outline" label="ELABS AI Assistant" color="#8b5cf6"
          onPress={() => navigation.navigate("AiAssistant")} />
        <MenuItem icon="notifications-outline" label="Notifications" color={colors.accent}
          onPress={() => navigation.navigate("Notifications")} />
      </View>

      {/* Active Borrows */}
      <Text style={styles.sectionTitle}>My Active Borrows</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : borrows.length === 0 ? (
        <View style={styles.emptyBorrows}>
          <Ionicons name="checkmark-circle-outline" size={32} color={colors.success} />
          <Text style={styles.emptyText}>No active borrows. You're all clear!</Text>
        </View>
      ) : (
        borrows.map(b => {
          const overdue = b.daysOverdue > 0;
          return (
            <View key={b.transactionId} style={[styles.borrowCard, overdue && styles.overdueCard]}>
              <View style={styles.borrowHeader}>
                <View style={[styles.statusDot, { backgroundColor: overdue ? colors.danger : colors.warning }]} />
                <Text style={styles.borrowLab} numberOfLines={1}>{b.labName}</Text>
                <Text style={[styles.dueText, { color: overdue ? colors.danger : colors.textMuted }]}>
                  {overdue ? `${b.daysOverdue}d overdue` : `Due: ${fmt(b.dueAt)}`}
                </Text>
              </View>
              <Text style={styles.purpose}>{b.purpose}</Text>
              {(Array.isArray(b.items) ? b.items : []).map((item, i) => (
                <Text key={i} style={styles.itemText}>• {item.elabsTag} — {item.name}</Text>
              ))}
            </View>
          );
        })
      )}

      {/* Danger Zone */}
      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.menuGroup}>
        <Pressable style={styles.logoutItem} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </View>

      <Text style={styles.version}>ELABS v0.1.0 · DEIE Smart Lab</Text>
    </ScrollView>
  );
}

function MenuItem({ icon, label, color, onPress }: { icon: any; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.7 }]}
      onPress={onPress}
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
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },

  profileCard: {
    backgroundColor: colors.bgCard, borderRadius: borderRadius.xl,
    padding: spacing.lg, alignItems: "center", borderWidth: 1,
    borderColor: colors.border, marginBottom: spacing.lg,
  },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  avatarText: { color: colors.white, fontSize: fontSize.xxl, fontWeight: "700" },
  fullName: { fontSize: fontSize.xl, fontWeight: "700", color: colors.textPrimary, marginBottom: 4 },
  email: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.md },
  roleBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: borderRadius.full },
  roleText: { fontSize: fontSize.sm, fontWeight: "700" },

  sectionTitle: { fontSize: fontSize.lg, fontWeight: "700", color: colors.textPrimary, marginBottom: spacing.sm, marginTop: spacing.sm },

  menuGroup: { backgroundColor: colors.bgCard, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, overflow: "hidden", marginBottom: spacing.lg },
  menuItem: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: fontSize.md, color: colors.textPrimary, fontWeight: "500" },
  logoutItem: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.md },
  logoutText: { fontSize: fontSize.md, color: colors.danger, fontWeight: "600" },

  emptyBorrows: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.bgCard, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, flex: 1 },

  borrowCard: { backgroundColor: colors.bgCard, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  overdueCard: { borderColor: colors.danger + "60", backgroundColor: colors.danger + "10" },
  borrowHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  borrowLab: { flex: 1, fontSize: fontSize.md, fontWeight: "600", color: colors.textPrimary },
  dueText: { fontSize: fontSize.xs, fontWeight: "600" },
  purpose: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: 6 },
  itemText: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  version: { textAlign: "center", fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xl },
});