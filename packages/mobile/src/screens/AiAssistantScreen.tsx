import { useState, useRef, useEffect } from "react";
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform,
  Pressable, StyleSheet, Text, TextInput, View, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, fontSize } from "../lib/theme";
import { loadUser } from "../lib/auth";

// Fix: port is 8001, not 8002
const AI_BASE = process.env.EXPO_PUBLIC_AI_BASE_URL ?? "http://localhost:8001";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  "What is my upcoming lab schedule?",
  "Which equipment is available right now?",
  "What do I have currently borrowed?",
  "How many students are in the lab?",
];

function renderText(text: string) {
  // Split by **bold** and render styled segments
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <Text key={i} style={{ fontWeight: "700", color: colors.primary }}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

export default function AiAssistantScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm **ELABS AI**, your smart lab assistant. Ask me about equipment availability, lab schedules, borrowing status, or safety guidelines!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadUser().then(u => { if (u?.email) setUserEmail(u.email); });
  }, []);

  async function sendMessage(text?: string) {
    const msgText = (text ?? input).trim();
    if (!msgText || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msgText };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const res = await fetch(`${AI_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msgText, user_email: userEmail }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer ?? data.response ?? "I couldn't process that request. Please try again.",
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const isTimeout = err?.name === "AbortError";
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: isTimeout
            ? "The AI is taking longer than expected. Please try again in a moment."
            : "Sorry, I'm having trouble connecting right now. Make sure the AI server is running.",
        },
      ]);
    }
    setLoading(false);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }

  const showSuggestions = messages.length === 1; // only show on welcome

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          showSuggestions ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsRow}>
              {SUGGESTIONS.map((s, i) => (
                <Pressable key={i} style={styles.suggestionChip} onPress={() => sendMessage(s)}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.aiBubble]}>
            {item.role === "assistant" && (
              <View style={styles.aiLabelRow}>
                <Ionicons name="sparkles" size={12} color={colors.primary} />
                <Text style={styles.aiLabel}>ELABS AI</Text>
              </View>
            )}
            <Text style={[styles.bubbleText, item.role === "user" && styles.userBubbleText]}>
              {renderText(item.content)}
            </Text>
          </View>
        )}
      />

      {loading && (
        <View style={styles.typingWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.typingText}>ELABS AI is thinking...</Text>
        </View>
      )}

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about labs, equipment, schedule..."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={() => sendMessage()}
          blurOnSubmit={false}
        />
        <Pressable
          onPress={() => sendMessage()}
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          disabled={!input.trim() || loading}
        >
          <Ionicons name="send" size={18} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.md, paddingBottom: spacing.xs },
  bubble: {
    maxWidth: "85%", padding: spacing.md,
    borderRadius: borderRadius.lg, marginBottom: spacing.sm,
  },
  userBubble: {
    alignSelf: "flex-end", backgroundColor: colors.accent,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: "flex-start", backgroundColor: colors.bgCard,
    borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border,
  },
  aiLabelRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  aiLabel: { fontSize: fontSize.xs, fontWeight: "700", color: colors.primary },
  bubbleText: { fontSize: fontSize.md, color: colors.textPrimary, lineHeight: 22 },
  userBubbleText: { color: colors.white },

  suggestionsRow: { marginTop: spacing.sm, marginBottom: spacing.md },
  suggestionChip: {
    backgroundColor: colors.bgCard, borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    marginRight: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  suggestionText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: "500" },

  typingWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  typingText: { color: colors.textMuted, fontSize: fontSize.sm },

  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: spacing.sm,
    padding: spacing.sm, borderTopWidth: 1,
    borderTopColor: colors.border, backgroundColor: colors.surface,
  },
  input: {
    flex: 1, backgroundColor: colors.bgInput, borderRadius: borderRadius.lg,
    padding: 12, paddingTop: 12, color: colors.textPrimary,
    fontSize: fontSize.md, maxHeight: 100,
    borderWidth: 1, borderColor: colors.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: colors.bgCardLight },
});