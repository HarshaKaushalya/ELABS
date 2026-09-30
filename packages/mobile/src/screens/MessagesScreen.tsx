import { useEffect, useState, useCallback, useRef } from "react";
import {
  FlatList, Pressable, RefreshControl, StyleSheet,
  Text, TextInput, View, Modal, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/routes";
import { apiFetch, apiGet, apiPost } from "../lib/api";
import { loadUser, User } from "../lib/auth";
import { colors, spacing, borderRadius, fontSize } from "../lib/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Messages">;

interface Message {
  id: number;
  subject: string;
  body: string;
  senderName: string;
  senderId?: number;
  targetType: "ALL" | "GROUP" | "USER";
  targetGroup?: string;
  recipientCount?: number;
  createdAt: string;
  isRead: boolean;
}

interface Contact {
  id: number;
  fullName: string;
  email: string;
  role: string;
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

const TARGET_LABELS: Record<string, { label: string; color: string }> = {
  ALL: { label: "All Students", color: colors.primary },
  GROUP: { label: "Group", color: colors.warning },
  USER: { label: "Direct", color: colors.accent },
};

export default function MessagesScreen({ navigation }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);

  const isStaff = user?.roles?.some(r =>
    ["SYSTEM_ADMIN", "MODULE_COORDINATOR", "LECTURER", "LAB_TECHNICIAN"].includes(r)
  );

  const fetchMessages = useCallback(async () => {
    try {
      const data = await apiGet<{ messages: Message[] }>("/messages/inbox");
      setMessages(data.messages ?? []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUser().then(setUser);
    fetchMessages();
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  }

  async function markRead(id: number) {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: true } : m));
    try { await apiFetch(`/messages/${id}/read`, { method: "POST" }); } catch {}
  }

  function openThread(msg: Message) {
    markRead(msg.id);
    navigation.navigate("MessageThread", {
      messageId: msg.id,
      subject: msg.subject,
      senderName: msg.senderName,
      body: msg.body,
      createdAt: msg.createdAt,
    });
  }

  const unread = messages.filter(m => !m.isRead).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Messages</Text>
          {unread > 0 && (
            <Text style={styles.unreadHint}>{unread} unread</Text>
          )}
        </View>
        {isStaff && (
          <Pressable onPress={() => setComposeOpen(true)} style={styles.composeBtn}>
            <Ionicons name="create-outline" size={18} color={colors.white} />
            <Text style={styles.composeBtnText}>Compose</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      ) : messages.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="mail-outline" size={56} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No Messages</Text>
          <Text style={styles.emptyText}>Your inbox is empty. Messages from staff and lecturers will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const target = TARGET_LABELS[item.targetType];
            return (
              <Pressable
                style={[styles.messageCard, !item.isRead && styles.unreadCard]}
                onPress={() => openThread(item)}
              >
                <View style={styles.messageRow}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarLetter}>{item.senderName?.[0] ?? "?"}</Text>
                  </View>
                  <View style={styles.messageContent}>
                    <View style={styles.messageTopRow}>
                      <Text style={styles.senderName} numberOfLines={1}>{item.senderName}</Text>
                      <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
                    </View>
                    <Text style={styles.subject} numberOfLines={1}>{item.subject}</Text>
                    <View style={styles.messageBottomRow}>
                      <View style={[styles.targetBadge, { backgroundColor: `${target.color}20` }]}>
                        <Text style={[styles.targetText, { color: target.color }]}>{target.label}</Text>
                      </View>
                      {!item.isRead && <View style={styles.unreadDot} />}
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* Compose Modal */}
      <ComposeModal
        visible={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSent={() => { setComposeOpen(false); fetchMessages(); }}
      />
    </View>
  );
}

// ─── Compose Modal ────────────────────────────────────────────────────────────

function ComposeModal({ visible, onClose, onSent }: { visible: boolean; onClose: () => void; onSent: () => void }) {
  const [targetType, setTargetType] = useState<"ALL" | "GROUP" | "USER">("ALL");
  const [targetGroup, setTargetGroup] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [showContacts, setShowContacts] = useState(false);

  useEffect(() => {
    if (!visible) return;
    apiGet<{ users: Contact[] }>("/users?limit=50").then(d => setContacts(d.users ?? [])).catch(() => {});
  }, [visible]);

  async function handleSend() {
    if (!subject.trim() || !body.trim()) {
      Alert.alert("Missing Fields", "Please fill in subject and message body.");
      return;
    }
    setSending(true);
    try {
      const payload: any = { subject, body, targetType };
      if (targetType === "GROUP") payload.targetGroup = targetGroup;
      if (targetType === "USER") payload.targetEmail = targetEmail;
      await apiPost("/messages", payload);
      setSubject(""); setBody(""); setTargetGroup(""); setTargetEmail("");
      onSent();
    } catch {
      Alert.alert("Send Failed", "Could not send message. Please try again.");
    }
    setSending(false);
  }

  const filteredContacts = contacts.filter(c =>
    c.fullName.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(contactSearch.toLowerCase())
  ).slice(0, 5);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>New Message</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Target Type */}
        <Text style={styles.fieldLabel}>Send To</Text>
        <View style={styles.targetRow}>
          {(["ALL", "GROUP", "USER"] as const).map(t => (
            <Pressable
              key={t}
              style={[styles.targetChip, targetType === t && styles.targetChipActive]}
              onPress={() => setTargetType(t)}
            >
              <Text style={[styles.targetChipText, targetType === t && styles.targetChipTextActive]}>
                {t === "ALL" ? "All Students" : t === "GROUP" ? "Group" : "Direct"}
              </Text>
            </Pressable>
          ))}
        </View>

        {targetType === "GROUP" && (
          <>
            <Text style={styles.fieldLabel}>Group Code</Text>
            <TextInput
              style={styles.input}
              value={targetGroup}
              onChangeText={setTargetGroup}
              placeholder="e.g. EE22"
              placeholderTextColor={colors.textMuted}
            />
          </>
        )}

        {targetType === "USER" && (
          <>
            <Text style={styles.fieldLabel}>Recipient</Text>
            <TextInput
              style={styles.input}
              value={contactSearch || targetEmail}
              onChangeText={v => { setContactSearch(v); setShowContacts(true); }}
              placeholder="Search by name or email..."
              placeholderTextColor={colors.textMuted}
            />
            {showContacts && filteredContacts.length > 0 && (
              <View style={styles.dropdown}>
                {filteredContacts.map(c => (
                  <Pressable
                    key={c.id}
                    style={styles.dropdownItem}
                    onPress={() => { setTargetEmail(c.email); setContactSearch(c.fullName); setShowContacts(false); }}
                  >
                    <Text style={styles.dropdownName}>{c.fullName}</Text>
                    <Text style={styles.dropdownEmail}>{c.email}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}

        <Text style={styles.fieldLabel}>Subject</Text>
        <TextInput
          style={styles.input}
          value={subject}
          onChangeText={setSubject}
          placeholder="Message subject..."
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.fieldLabel}>Message</Text>
        <TextInput
          style={[styles.input, styles.bodyInput]}
          value={body}
          onChangeText={setBody}
          placeholder="Write your message..."
          placeholderTextColor={colors.textMuted}
          multiline
        />

        <Pressable
          style={[styles.sendBtn, sending && { opacity: 0.6 }]}
          onPress={handleSend}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="send-outline" size={18} color={colors.white} />
              <Text style={styles.sendBtnText}>Send Message</Text>
            </>
          )}
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
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
  composeBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: borderRadius.full,
  },
  composeBtnText: { color: colors.white, fontWeight: "600", fontSize: fontSize.sm },
  list: { padding: spacing.md, gap: spacing.sm },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: "700", color: colors.textPrimary },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: "center", lineHeight: 24 },

  messageCard: {
    backgroundColor: colors.bgCard, borderRadius: borderRadius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  unreadCard: { borderColor: colors.primary + "60" },
  messageRow: { flexDirection: "row", gap: spacing.md },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.bgCardLight,
    alignItems: "center", justifyContent: "center",
  },
  avatarLetter: { fontSize: fontSize.lg, fontWeight: "700", color: colors.primary },
  messageContent: { flex: 1 },
  messageTopRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  senderName: { fontSize: fontSize.md, fontWeight: "600", color: colors.textPrimary, flex: 1 },
  timeText: { fontSize: fontSize.xs, color: colors.textMuted },
  subject: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: 6 },
  messageBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  targetBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full },
  targetText: { fontSize: fontSize.xs, fontWeight: "600" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },

  // Modal
  modal: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg, marginTop: spacing.md },
  modalTitle: { fontSize: fontSize.xl, fontWeight: "700", color: colors.textPrimary },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md },
  targetRow: { flexDirection: "row", gap: spacing.sm },
  targetChip: {
    flex: 1, paddingVertical: 8, borderRadius: borderRadius.sm,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", backgroundColor: colors.bgCard,
  },
  targetChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + "20" },
  targetChipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: "600" },
  targetChipTextActive: { color: colors.primary },
  input: {
    backgroundColor: colors.bgInput, borderRadius: borderRadius.md,
    padding: 12, color: colors.textPrimary, fontSize: fontSize.md,
    borderWidth: 1, borderColor: colors.border,
  },
  bodyInput: { minHeight: 120, textAlignVertical: "top" },
  dropdown: {
    backgroundColor: colors.bgCardLight, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border, marginTop: 4,
  },
  dropdownItem: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownName: { fontSize: fontSize.md, color: colors.textPrimary, fontWeight: "500" },
  dropdownEmail: { fontSize: fontSize.sm, color: colors.textMuted },
  sendBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: colors.primary, padding: spacing.md, borderRadius: borderRadius.md, marginTop: spacing.lg,
  },
  sendBtnText: { color: colors.white, fontWeight: "700", fontSize: fontSize.md },
});