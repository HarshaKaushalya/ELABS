import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/routes";
import { apiFetch } from "../lib/api";
import { setAccessToken, saveUser } from "../lib/auth";
import { colors, spacing, borderRadius, fontSize } from "../lib/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("admin@elabs.local");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    setLoading(true);

    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Login failed. Check your credentials.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      await setAccessToken(data.accessToken);

      // Fetch user profile
      const meRes = await apiFetch("/auth/me");
      if (meRes.ok) {
        const user = await meRes.json();
        await saveUser(user);
      }

      setLoading(false);
      navigation.replace("Dashboard");
    } catch (err) {
      setLoading(false);
      setError("Cannot connect to server. Check your network.");
    }
  }

  return (
    <LinearGradient colors={["#050c1d", "#0a1732", "#050c1d"]} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoWrap}>
            <LinearGradient
              colors={["#1dd5e6", "#3d83f6"]}
              style={styles.logoCircle}
            >
              <Text style={styles.logoText}>E</Text>
            </LinearGradient>
            <Text style={styles.appName}>ELABS</Text>
            <Text style={styles.subtitle}>Smart Laboratory Management</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.welcome}>Welcome Back</Text>
            <Text style={styles.signInText}>Sign in to your account</Text>

            {/* Email */}
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Password */}
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />

            {/* Error */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Button */}
            <Pressable onPress={handleLogin} disabled={loading}>
              <LinearGradient
                colors={["#1dd5e6", "#3d83f6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.button, loading && { opacity: 0.7 }]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Sign In →</Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            © 2026 ELABS Platform • University of Ruhuna
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  logoWrap: { alignItems: "center", marginBottom: spacing.xl },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.white,
  },
  appName: {
    fontSize: fontSize.hero,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: "rgba(14, 30, 61, 0.85)",
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  welcome: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 4,
  },
  signInText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.bgInput,
    borderRadius: borderRadius.md,
    padding: 14,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  errorBox: {
    backgroundColor: "rgba(255, 75, 86, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 75, 86, 0.3)",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  errorText: {
    color: "#ff8a95",
    fontSize: fontSize.sm,
  },
  button: {
    borderRadius: borderRadius.lg,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  buttonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: fontSize.lg,
  },
  footer: {
    textAlign: "center",
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.xl,
  },
});