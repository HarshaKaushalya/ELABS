import { useState } from "react";
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View, ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/routes";
import { apiPost } from "../lib/api";
import { colors, spacing, borderRadius, fontSize } from "../lib/theme";

type Props = NativeStackScreenProps<RootStackParamList, "MessageThread">;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function MessageThreadScreen({ route, navigation }: Props) {
  const { messageId, subject, senderName, body, createdAt } = route.params;
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  async function handleReply() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await apiPost("/messages", {
        subject: `Re: ${subject}`,
        body: reply.trim(),
        targetType: "USER",
        targetEmail: "", // Will just send as reply notification
      });
      setReply("");
      Alert.alert("Sent", "Your reply has been sent.");
    } catch {
      Alert.alert("Error", "Could not send reply. Please try again.");
    }
    setSending(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Subject */}
        <Text style={styles.subject}>{subject}</Text>

        {/* Sender info */}
        <View style={styles.metaRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>{senderName?.[0] ?? "?"}</Text>
          </View>
          <View>
            <Text style={styles.senderName}>{senderName}</Text>
            <Text style={styles.dateText}>{formatDate(createdAt)}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Body */}
        <Text style={styles.body}>{body}</Text>
      </ScrollView>

      {/* Reply Bar */}
      <View style={styles.replyBar}>
        <TextInput
          style={styles.replyInput}
          value={reply}
          onChangeText={setReply}
          placeholder="Write a reply..."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={1000}
        />
        <Pressable
          style={[styles.sendBtn, (!reply.trim() || sending) && { opacity: 0.4 }]}
          onPress={handleReply}
          disabled={!reply.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Ionicons name="send" size={18} color={colors.white} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg },
  subject: {
    fontSize: fontSize.xl, fontWeight: "700",
    color: colors.textPrimary, marginBottom: spacing.md,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  avatarCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: colors.bgCardLight,
    alignItems: "center", justifyContent: "center",
  },
  avatarLetter: { fontSize: fontSize.lg, fontWeight: "700", color: colors.primary },
  senderName: { fontSize: fontSize.md, fontWeight: "600", color: colors.textPrimary },
  dateText: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: spacing.lg },
  body: { fontSize: fontSize.md, color: colors.textPrimary, lineHeight: 26 },

  replyBar: {
    flexDirection: "row", alignItems: "flex-end", gap: spacing.sm,
    padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  replyInput: {
    flex: 1, backgroundColor: colors.bgInput, borderRadius: borderRadius.lg,
    padding: 12, color: colors.textPrimary, fontSize: fontSize.md,
    maxHeight: 100, borderWidth: 1, borderColor: colors.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
  },
});
