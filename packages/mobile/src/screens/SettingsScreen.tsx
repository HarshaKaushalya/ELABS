import { useState, useEffect } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/routes";
import { clearAccessToken, loadUser, User } from "../lib/auth";
import { colors, spacing, borderRadius, fontSize } from "../lib/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

export default function SettingsScreen({ navigation }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);

  useEffect(() => {
    loadUser().then(setUser);
  }, []);

  function handleLogout() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await clearAccessToken();
          navigation.replace("Login");
        },
      },
    ]);
  }

  const initials = user?.fullName
    ? user.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* Profile card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.fullName ?? "User"}</Text>
        <Text style={styles.email}>{user?.email ?? ""}</Text>
        <Text style={styles.roleBadge}>{user?.roles?.[0] ?? "User"}</Text>
      </View>

      {/* Preferences */}
      <Text style={styles.sectionTitle}>Preferences</Text>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Dark Mode</Text>
        <Switch
          value={darkMode}
          onValueChange={setDarkMode}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.white}
        />
      </View>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Push Notifications</Text>
        <Switch
          value={pushEnabled}
          onValueChange={setPushEnabled}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.white}
        />
      </View>

      {/* Info */}
      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>App Version</Text>
        <Text style={styles.settingValue}>0.1.0</Text>
      </View>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>API Server</Text>
        <Text style={styles.settingValue}>localhost:4000</Text>
      </View>

      {/* Sign out */}
      <Pressable style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </Pressable>

      <Text style={styles.footer}>© 2026 ELABS • University of Ruhuna</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md },
  profileCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarText: { color: colors.white, fontSize: fontSize.xl, fontWeight: "800" },
  name: { fontSize: fontSize.lg, fontWeight: "700", color: colors.textPrimary },
  email: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  roleBadge: {
    marginTop: spacing.sm,
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.primary,
    backgroundColor: `${colors.primary}22`,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    textTransform: "uppercase",
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.bgCard,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingLabel: { fontSize: fontSize.md, color: colors.textPrimary },
  settingValue: { fontSize: fontSize.sm, color: colors.textSecondary },
  logoutBtn: {
    backgroundColor: "rgba(255, 75, 86, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 75, 86, 0.3)",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  logoutText: { color: "#ff8a95", fontWeight: "700", fontSize: fontSize.md },
  footer: {
    textAlign: "center",
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
});