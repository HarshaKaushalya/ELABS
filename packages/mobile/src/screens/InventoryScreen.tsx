import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
  Platform,
} from "react-native";
import { apiFetch } from "../lib/api";
import { loadUser, User } from "../lib/auth";
import { colors, spacing, borderRadius, fontSize } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";

// ─── Types ────────────────────────────────────────────────────────────────────
type InventoryItem = {
  id: number; elabsTag: string; name: string;
  category: string; model: string; status: string;
  labName: string; conditionNote: string;
};
type AvailableItem = { id: number; elabsTag: string; name: string; category: string; model: string };
type Lab = { id: number; name: string };
type Student = { id: number; fullName: string; indexNo: string; email: string };
type BorrowSuccess = { transactionId: number; borrowedItems: { elabsTag: string; name: string }[] };
type Transaction = {
  id: number; labName: string; borrowerUserId: number | null; borrowerGroupCode: string | null;
  purpose: string; dueAt: string | null; returnedAt: string | null; status: string;
  createdAt: string; issuedBy: string;
};
type MyBorrow = {
  id: number; labName: string; purpose: string; dueAt: string | null;
  returnedAt: string | null; status: string; createdAt: string;
  issuedByName: string; items: string | { elabsTag: string; name: string }[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: colors.success, BORROWED: colors.warning,
  MAINTENANCE: colors.accent, OUT_OF_SERVICE: colors.danger,
  RETURNED: colors.success, OVERDUE: colors.danger,
};
function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function isOverdue(dueAt: string | null, status: string) {
  if (status === "RETURNED" || !dueAt) return false;
  return new Date(dueAt) < new Date();
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? colors.textMuted;
  const labels: Record<string, string> = {
    AVAILABLE: "Available", BORROWED: "Borrowed",
    MAINTENANCE: "Maintenance", OUT_OF_SERVICE: "Out of Service",
    RETURNED: "Returned", OVERDUE: "Overdue",
  };
  return (
    <View style={[styles.badge, { backgroundColor: `${color}20` }]}>
      <Text style={[styles.badgeText, { color }]}>{labels[status] ?? status}</Text>
    </View>
  );
}

// ─── Success Overlay ──────────────────────────────────────────────────────────
function SuccessOverlay({ result, onDone }: { result: BorrowSuccess; onDone: () => void }) {
  return (
    <Modal transparent animationType="fade">
      <View style={styles.overlayBg}>
        <View style={styles.overlayCard}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle-outline" size={36} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>Borrow Issued!</Text>
          <Text style={styles.successSub}>
            Transaction <Text style={{ color: colors.primary, fontFamily: "monospace" }}>#{result.transactionId}</Text> created
          </Text>

          <Text style={styles.borrowedLabel}>BORROWED ITEMS</Text>
          {result.borrowedItems.map((item) => (
            <View key={item.elabsTag} style={styles.borrowedItem}>
              <View style={styles.itemCheckCircle}>
                <Ionicons name="checkmark" size={10} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTag}>{item.elabsTag}</Text>
                <Text style={styles.itemName}>{item.name}</Text>
              </View>
              <View style={styles.borrowedBadge}>
                <Text style={styles.borrowedBadgeText}>BORROWED</Text>
              </View>
            </View>
          ))}

          <Pressable style={styles.doneBtn} onPress={onDone}>
            <Text style={styles.doneBtnText}>View Active Borrows →</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── BORROW FORM (STAFF) ──────────────────────────────────────────────────────
function StaffBorrowForm({ labs, onSuccess }: { labs: Lab[]; onSuccess: (r: BorrowSuccess) => void }) {
  const [labId, setLabId] = useState<number>(labs[0]?.id ?? 0);
  const [indexNo, setIndexNo] = useState("");
  const [student, setStudent] = useState<Student | null>(null);
  const [studentError, setStudentError] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [conditionOut, setConditionOut] = useState("Good");
  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [itemSearch, setItemSearch] = useState("");
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [labPickerOpen, setLabPickerOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // fetch items when lab changes
  useEffect(() => {
    if (!labId) return;
    setLoadingItems(true);
    setSelectedTags(new Set());
    apiFetch(`/inventory/available-items/${labId}`)
      .then((r) => r.json())
      .then((d) => setAvailableItems(d.items ?? []))
      .finally(() => setLoadingItems(false));
  }, [labId]);

  // debounced student lookup
  const handleIndexNoChange = (val: string) => {
    setIndexNo(val);
    setStudent(null);
    setStudentError("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const clean = val.trim();
    if (clean.length < 6) return;
    debounceRef.current = setTimeout(async () => {
      setLookingUp(true);
      try {
        const res = await apiFetch(`/inventory/student-lookup?indexNo=${encodeURIComponent(clean)}`);
        if (res.ok) { setStudent((await res.json()).student); setStudentError(""); }
        else { setStudent(null); setStudentError("Student not found"); }
      } finally { setLookingUp(false); }
    }, 600);
  };

  const toggleItem = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  };

  const filteredItems = useMemo(() => {
    const q = itemSearch.toLowerCase().trim();
    if (!q) return availableItems;
    return availableItems.filter((it) =>
      [it.elabsTag, it.name, it.category, it.model].join(" ").toLowerCase().includes(q)
    );
  }, [availableItems, itemSearch]);

  const grouped = useMemo(() => {
    const g: Record<string, AvailableItem[]> = {};
    filteredItems.forEach((it) => {
      if (!g[it.category]) g[it.category] = [];
      g[it.category].push(it);
    });
    return g;
  }, [filteredItems]);

  const handleSubmit = async () => {
    setError("");
    if (selectedTags.size === 0) return setError("Select at least one item.");
    if (!student) return setError("Enter a valid student index number.");
    setSubmitting(true);
    try {
      const res = await apiFetch("/inventory/borrow", {
        method: "POST",
        body: JSON.stringify({
          labId, borrowerType: "STUDENT", borrowerUserId: student.id,
          purpose: purpose.trim() || null, dueAt: null,
          elabsTags: Array.from(selectedTags), conditionOut: conditionOut || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.detail || data.error || "Borrow failed");
      setSelectedTags(new Set()); setPurpose(""); setIndexNo(""); setStudent(null);
      onSuccess(data as BorrowSuccess);
    } catch { setError("Network error — check API is running."); }
    finally { setSubmitting(false); }
  };

  const selectedLab = labs.find((l) => l.id === labId);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Lab picker */}
      <Text style={styles.fieldLabel}>Lab</Text>
      <Pressable style={styles.pickerBtn} onPress={() => setLabPickerOpen(true)}>
        <Text style={styles.pickerBtnText}>{selectedLab?.name ?? "Select lab…"}</Text>
        <Text style={{ color: colors.textMuted }}>▾</Text>
      </Pressable>

      {/* Lab picker modal */}
      <Modal transparent animationType="slide" visible={labPickerOpen}>
        <Pressable style={styles.modalBackdrop} onPress={() => setLabPickerOpen(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerSheetTitle}>Select Lab</Text>
            {labs.map((l) => (
              <Pressable
                key={l.id}
                style={[styles.pickerOption, l.id === labId && styles.pickerOptionActive]}
                onPress={() => { setLabId(l.id); setLabPickerOpen(false); }}
              >
                <Text style={[styles.pickerOptionText, l.id === labId && { color: colors.primary }]}>{l.name}</Text>
                {l.id === labId && <Ionicons name="checkmark" size={16} color={colors.primary} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Student index lookup */}
      <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Student Index No.</Text>
      <TextInput
        style={styles.input}
        value={indexNo}
        onChangeText={handleIndexNoChange}
        placeholder="e.g. EG/2022/5401"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="characters"
      />
      {lookingUp && <Text style={styles.lookingUpText}>Searching…</Text>}
      {student && (
        <View style={styles.studentCard}>
          <View style={styles.studentAvatar}>
            <Text style={styles.studentAvatarText}>
              {student.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.studentName}>{student.fullName}</Text>
            <Text style={styles.studentMeta}>{student.indexNo} · {student.email}</Text>
          </View>
        </View>
      )}
      {studentError ? <Text style={styles.studentError}>{studentError}</Text> : null}

      {/* Purpose */}
      <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Purpose (optional)</Text>
      <TextInput
        style={styles.input}
        value={purpose}
        onChangeText={setPurpose}
        placeholder="e.g. EE601 Lab 3"
        placeholderTextColor={colors.textMuted}
      />

      {/* Condition Out */}
      <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Condition Out</Text>
      <View style={styles.conditionRow}>
        {["Excellent", "Good", "Fair", "Damaged"].map((c) => (
          <Pressable
            key={c}
            style={[styles.condChip, conditionOut === c && styles.condChipActive]}
            onPress={() => setConditionOut(c)}
          >
            <Text style={[styles.condChipText, conditionOut === c && styles.condChipTextActive]}>{c}</Text>
          </Pressable>
        ))}
      </View>

      {/* Item picker */}
      <View style={styles.itemPickerHeader}>
        <Text style={styles.fieldLabel}>
          Select Items
          <Text style={styles.availCount}> {availableItems.length} available</Text>
          {selectedTags.size > 0 && <Text style={styles.selectedCount}> · {selectedTags.size} selected</Text>}
        </Text>
        <View style={styles.selectAllRow}>
          <Pressable onPress={() => setSelectedTags(new Set(filteredItems.map((i) => i.elabsTag)))} style={styles.smallBtn}>
            <Text style={styles.smallBtnText}>All</Text>
          </Pressable>
          <Pressable onPress={() => setSelectedTags(new Set())} style={styles.smallBtn}>
            <Text style={styles.smallBtnText}>Clear</Text>
          </Pressable>
        </View>
      </View>

      <TextInput
        style={[styles.input, { marginBottom: spacing.sm }]}
        value={itemSearch}
        onChangeText={setItemSearch}
        placeholder="Search items…"
        placeholderTextColor={colors.textMuted}
      />

      {loadingItems ? (
        <ActivityIndicator color={colors.primary} style={{ padding: spacing.lg }} />
      ) : availableItems.length === 0 ? (
        <Text style={styles.emptyPickerText}>No available items in this lab.</Text>
      ) : (
        <View style={styles.itemList}>
          {Object.entries(grouped).map(([category, catItems]) => (
            <View key={category}>
              <Text style={styles.categoryHeader}>{category.toUpperCase()} ({catItems.length})</Text>
              {catItems.map((item) => {
                const checked = selectedTags.has(item.elabsTag);
                return (
                  <Pressable
                    key={item.elabsTag}
                    style={[styles.itemRow, checked && styles.itemRowChecked]}
                    onPress={() => toggleItem(item.elabsTag)}
                  >
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked && <Ionicons name="checkmark" size={12} color={colors.white} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                        <Text style={styles.itemTag}>{item.elabsTag}</Text>
                        <Text style={[styles.itemName, checked && { color: colors.textPrimary }]}>{item.name}</Text>
                      </View>
                      <Text style={styles.itemModel}>{item.model}</Text>
                    </View>
                    <View style={styles.availBadge}>
                      <Text style={styles.availBadgeText}>Available</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      )}

      {/* Submit */}
      <Pressable
        style={[
          styles.submitBtn,
          (submitting || selectedTags.size === 0 || !student) && styles.submitBtnDisabled,
        ]}
        onPress={handleSubmit}
        disabled={submitting || selectedTags.size === 0 || !student}
      >
        {submitting
          ? <ActivityIndicator color={colors.white} size="small" />
          : <Text style={styles.submitBtnText}>
              Issue Borrow ({selectedTags.size} item{selectedTags.size !== 1 ? "s" : ""})
            </Text>
        }
      </Pressable>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── BORROW FORM (STUDENT) ────────────────────────────────────────────────────
function StudentBorrowForm({ labs, userId, onSuccess }: { labs: Lab[]; userId: number; onSuccess: (r: BorrowSuccess) => void }) {
  const [labId, setLabId] = useState<number>(labs[0]?.id ?? 0);
  const [purpose, setPurpose] = useState("");
  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [labPickerOpen, setLabPickerOpen] = useState(false);

  useEffect(() => {
    if (!labId) return;
    setLoadingItems(true);
    setSelectedTags(new Set());
    apiFetch(`/inventory/available-items/${labId}`)
      .then((r) => r.json())
      .then((d) => setAvailableItems(d.items ?? []))
      .finally(() => setLoadingItems(false));
  }, [labId]);

  const toggleItem = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  };

  const handleSubmit = async () => {
    setError("");
    if (selectedTags.size === 0) return setError("Select at least one item.");
    setSubmitting(true);
    try {
      const res = await apiFetch("/inventory/borrow", {
        method: "POST",
        body: JSON.stringify({
          labId, borrowerType: "STUDENT", borrowerUserId: userId,
          purpose: purpose.trim() || null, dueAt: null,
          elabsTags: Array.from(selectedTags), conditionOut: "Good",
        }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.detail || data.error || "Borrow failed");
      setSelectedTags(new Set()); setPurpose("");
      onSuccess(data as BorrowSuccess);
    } catch { setError("Network error."); }
    finally { setSubmitting(false); }
  };

  const selectedLab = labs.find((l) => l.id === labId);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

      <Text style={styles.fieldLabel}>Lab</Text>
      <Pressable style={styles.pickerBtn} onPress={() => setLabPickerOpen(true)}>
        <Text style={styles.pickerBtnText}>{selectedLab?.name ?? "Select lab…"}</Text>
        <Text style={{ color: colors.textMuted }}>▾</Text>
      </Pressable>

      <Modal transparent animationType="slide" visible={labPickerOpen}>
        <Pressable style={styles.modalBackdrop} onPress={() => setLabPickerOpen(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerSheetTitle}>Select Lab</Text>
            {labs.map((l) => (
              <Pressable
                key={l.id}
                style={[styles.pickerOption, l.id === labId && styles.pickerOptionActive]}
                onPress={() => { setLabId(l.id); setLabPickerOpen(false); }}
              >
                <Text style={[styles.pickerOptionText, l.id === labId && { color: colors.primary }]}>{l.name}</Text>
                {l.id === labId && <Ionicons name="checkmark" size={16} color={colors.primary} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Purpose (optional)</Text>
      <TextInput
        style={styles.input}
        value={purpose}
        onChangeText={setPurpose}
        placeholder="e.g. EE601 Lab 3"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>
        Select Items
        <Text style={styles.availCount}> {availableItems.length} available</Text>
        {selectedTags.size > 0 && <Text style={styles.selectedCount}> · {selectedTags.size} selected</Text>}
      </Text>

      {loadingItems ? (
        <ActivityIndicator color={colors.primary} style={{ padding: spacing.lg }} />
      ) : availableItems.length === 0 ? (
        <Text style={styles.emptyPickerText}>No available items in this lab.</Text>
      ) : (
        <View style={styles.itemList}>
          {availableItems.map((item) => {
            const checked = selectedTags.has(item.elabsTag);
            return (
              <Pressable
                key={item.elabsTag}
                style={[styles.itemRow, checked && styles.itemRowChecked]}
                onPress={() => toggleItem(item.elabsTag)}
              >
                <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                  {checked && <Ionicons name="checkmark" size={12} color={colors.white} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                    <Text style={styles.itemTag}>{item.elabsTag}</Text>
                    <Text style={styles.itemName}>{item.name}</Text>
                  </View>
                  <Text style={styles.itemModel}>{item.category} · {item.model}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <Pressable
        style={[styles.submitBtn, (submitting || selectedTags.size === 0) && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting || selectedTags.size === 0}
      >
        {submitting
          ? <ActivityIndicator color={colors.white} size="small" />
          : <Text style={styles.submitBtnText}>Borrow ({selectedTags.size} item{selectedTags.size !== 1 ? "s" : ""})</Text>
        }
      </Pressable>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── MY BORROWS TAB ───────────────────────────────────────────────────────────
function MyBorrowsTab() {
  const [borrows, setBorrows] = useState<MyBorrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBorrows = useCallback(async () => {
    try {
      const res = await apiFetch("/inventory/my-borrows");
      if (res.ok) {
        const d = await res.json();
        setBorrows(d.borrows ?? []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchBorrows(); }, [fetchBorrows]);

  if (loading) return <ActivityIndicator color={colors.primary} style={{ margin: spacing.xl }} />;

  return (
    <FlatList
      data={borrows}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchBorrows(); setRefreshing(false); }} tintColor={colors.primary} />}
      ListEmptyComponent={
        <View style={{ padding: 60, alignItems: "center" }}>
          <Ionicons name="cube-outline" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.md }}>No borrow history yet</Text>
        </View>
      }
      renderItem={({ item }) => {
        const overdue = isOverdue(item.dueAt, item.status);
        const effectiveStatus = overdue ? "OVERDUE" : item.status;
        const parsedItems: { elabsTag: string; name: string }[] =
          typeof item.items === "string" ? JSON.parse(item.items) : (item.items ?? []);
        return (
          <View style={[styles.borrowCard, { borderColor: overdue ? `${colors.danger}40` : colors.border }]}>
            <View style={styles.borrowCardHeader}>
              <View>
                <Text style={styles.borrowId}>#{item.id}</Text>
                <Text style={styles.borrowLab}>{item.labName}{item.purpose ? ` — ${item.purpose}` : ""}</Text>
              </View>
              <StatusBadge status={effectiveStatus} />
            </View>
            <View style={styles.borrowItems}>
              {parsedItems.map((it) => (
                <View key={it.elabsTag} style={styles.borrowItemChip}>
                  <Ionicons name="checkmark" size={10} color={colors.success} style={{ marginRight: 4 }} />
                  <Text style={styles.borrowItemTag}>{it.elabsTag}</Text>
                  <Text style={styles.borrowItemName}>{it.name}</Text>
                </View>
              ))}
            </View>
            <View style={styles.borrowMeta}>
              <Text style={styles.metaText}>{fmt(item.createdAt)}</Text>
              <Text style={[styles.metaText, { color: overdue ? colors.danger : colors.textSecondary }]}>
                Due: {fmt(item.dueAt)}
              </Text>
              {item.returnedAt && <Text style={[styles.metaText, { color: colors.success }]}>Returned: {fmt(item.returnedAt)}</Text>}
            </View>
          </View>
        );
      }}
    />
  );
}

// ─── ACTIVE BORROWS TAB (STAFF) ───────────────────────────────────────────────
function ActiveBorrowsTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTx = useCallback(async () => {
    try {
      const res = await apiFetch("/inventory/transactions");
      if (res.ok) { const d = await res.json(); setTransactions(d.transactions ?? []); }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchTx(); }, [fetchTx]);

  const handleReturn = async (txId: number) => {
    Alert.alert("Confirm Return", "Mark this transaction as returned?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Return", style: "destructive",
        onPress: async () => {
          const res = await apiFetch("/inventory/return", { method: "POST", body: JSON.stringify({ transactionId: txId }) });
          if (res.ok) fetchTx();
          else { const d = await res.json(); Alert.alert("Error", d.error || "Return failed"); }
        },
      },
    ]);
  };

  if (loading) return <ActivityIndicator color={colors.primary} style={{ margin: spacing.xl }} />;

  const active = transactions.filter((t) => t.status === "BORROWED");

  return (
    <FlatList
      data={active}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchTx(); setRefreshing(false); }} tintColor={colors.primary} />}
      ListEmptyComponent={
        <View style={{ padding: 60, alignItems: "center" }}>
          <Ionicons name="clipboard-outline" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.md }}>No active borrows</Text>
        </View>
      }
      renderItem={({ item }) => {
        const overdue = isOverdue(item.dueAt, item.status);
        return (
          <View style={[styles.txCard, { borderColor: overdue ? `${colors.danger}40` : colors.border }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={styles.txId}>#{item.id} · {item.labName}</Text>
              <StatusBadge status={overdue ? "OVERDUE" : item.status} />
            </View>
            <Text style={styles.txBorrower}>
              {item.borrowerUserId ? `User #${item.borrowerUserId}` : item.borrowerGroupCode ?? "—"}
            </Text>
            {item.purpose ? <Text style={styles.txPurpose}>{item.purpose}</Text> : null}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
              <Text style={[styles.metaText, { color: overdue ? colors.danger : colors.textSecondary }]}>
                Due: {fmt(item.dueAt)}
              </Text>
              {item.status === "BORROWED" && (
                <Pressable style={styles.returnBtn} onPress={() => handleReturn(item.id)}>
                  <Text style={styles.returnBtnText}>Return</Text>
                </Pressable>
              )}
            </View>
          </View>
        );
      }}
    />
  );
}

// ─── ALL EQUIPMENT TAB ────────────────────────────────────────────────────────
function AllEquipmentTab() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const res = await apiFetch("/inventory/items");
      if (res.ok) { const d = await res.json(); setItems(d.items ?? []); }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return items;
    return items.filter((it) => [it.elabsTag, it.name, it.category, it.labName, it.status].join(" ").toLowerCase().includes(q));
  }, [items, search]);

  if (loading) return <ActivityIndicator color={colors.primary} style={{ margin: spacing.xl }} />;

  return (
    <View style={{ flex: 1 }}>
      <TextInput
        style={[styles.input, { margin: spacing.md, marginBottom: spacing.sm }]}
        value={search}
        onChangeText={setSearch}
        placeholder="Search by tag, name, category…"
        placeholderTextColor={colors.textMuted}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchItems(); setRefreshing(false); }} tintColor={colors.primary} />}
        ListEmptyComponent={<View style={{ padding: 40, alignItems: "center" }}><Text style={{ color: colors.textMuted }}>No items found</Text></View>}
        renderItem={({ item }) => (
          <View style={styles.equipCard}>
            <View style={styles.equipCardHeader}>
              <Text style={styles.equipName}>{item.name}</Text>
              <StatusBadge status={item.status} />
            </View>
            <Text style={styles.equipTag}>{item.elabsTag}</Text>
            <View style={styles.equipMeta}>
              <Text style={styles.metaText}>{item.category}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>{item.labName}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>{item.model}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

// ─── MAIN INVENTORY SCREEN ────────────────────────────────────────────────────
export default function InventoryScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [activeTab, setActiveTab] = useState<"items" | "borrow" | "active" | "myborrows">("myborrows");
  const [borrowSuccess, setBorrowSuccess] = useState<BorrowSuccess | null>(null);

  const isStaff = !user?.roles?.includes("STUDENT");

  useEffect(() => {
    loadUser().then(setUser);
    apiFetch("/labs").then((r) => r.json()).then((d) => setLabs(d.labs ?? []));
    // Default tab based on role
    loadUser().then((u) => {
      if (u?.roles?.includes("STUDENT")) setActiveTab("myborrows");
      else setActiveTab("items");
    });
  }, []);

  const staffTabs = [
    { id: "items" as const, label: "Equipment" },
    { id: "borrow" as const, label: "Issue Borrow" },
    { id: "active" as const, label: "Active" },
    { id: "myborrows" as const, label: "My Borrows" },
  ];

  const studentTabs = [
    { id: "borrow" as const, label: "Borrow" },
    { id: "myborrows" as const, label: "My Borrows" },
  ];

  const tabs = isStaff ? staffTabs : studentTabs;

  return (
    <View style={styles.container}>
      {borrowSuccess && (
        <SuccessOverlay
          result={borrowSuccess}
          onDone={() => { setBorrowSuccess(null); setActiveTab("myborrows"); }}
        />
      )}

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabBtnText, activeTab === tab.id && styles.tabBtnTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Content */}
      {activeTab === "items" && isStaff && <AllEquipmentTab />}
      {activeTab === "borrow" && labs.length > 0 && (
        <View style={{ flex: 1, padding: spacing.md }}>
          {isStaff
            ? <StaffBorrowForm labs={labs} onSuccess={(r) => { setBorrowSuccess(r); }} />
            : <StudentBorrowForm labs={labs} userId={user?.id ?? 0} onSuccess={(r) => { setBorrowSuccess(r); }} />
          }
        </View>
      )}
      {activeTab === "active" && isStaff && <ActiveBorrowsTab />}
      {activeTab === "myborrows" && <MyBorrowsTab />}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Tabs
  tabBar: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabBarContent: { paddingHorizontal: spacing.sm },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabBtnActive: { borderBottomColor: colors.accent },
  tabBtnText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: "600" },
  tabBtnTextActive: { color: colors.accent },

  // Badge
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: borderRadius.full },
  badgeText: { fontSize: fontSize.xs, fontWeight: "700" },

  // Equipment card
  equipCard: {
    backgroundColor: colors.bgCard, borderRadius: borderRadius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  equipCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  equipName: { fontSize: fontSize.md, fontWeight: "600", color: colors.textPrimary, flex: 1, marginRight: 8 },
  equipTag: { fontSize: fontSize.xs, color: colors.primary, fontWeight: "500", marginBottom: 6, fontFamily: "monospace" },
  equipMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaDot: { color: colors.textMuted, fontSize: fontSize.xs },

  // Borrow form
  fieldLabel: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: "600", marginBottom: 6 },
  input: {
    backgroundColor: colors.bgCard, borderRadius: borderRadius.sm,
    borderWidth: 1, borderColor: colors.border, padding: 12,
    color: colors.textPrimary, fontSize: fontSize.md,
  },
  pickerBtn: {
    backgroundColor: colors.bgCard, borderRadius: borderRadius.sm,
    borderWidth: 1, borderColor: colors.border, padding: 12,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  pickerBtnText: { color: colors.textPrimary, fontSize: fontSize.md },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  pickerSheet: {
    backgroundColor: colors.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: spacing.lg, paddingBottom: 40,
  },
  pickerSheetTitle: { fontSize: fontSize.lg, fontWeight: "700", color: colors.textPrimary, marginBottom: spacing.md },
  pickerOption: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  pickerOptionActive: { backgroundColor: `${colors.primary}10` },
  pickerOptionText: { fontSize: fontSize.md, color: colors.textPrimary },
  lookingUpText: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 },
  studentCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: `${colors.success}10`, borderRadius: borderRadius.sm,
    borderWidth: 1, borderColor: `${colors.success}40`, padding: spacing.sm, marginTop: 8,
  },
  studentAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.success, alignItems: "center", justifyContent: "center",
  },
  studentAvatarText: { color: colors.bg, fontWeight: "800", fontSize: fontSize.sm },
  studentName: { color: colors.success, fontWeight: "700", fontSize: fontSize.sm },
  studentMeta: { color: colors.textSecondary, fontSize: fontSize.xs },
  studentError: { color: colors.danger, fontSize: fontSize.xs, marginTop: 4 },
  conditionRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  condChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard,
  },
  condChipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}15` },
  condChipText: { color: colors.textSecondary, fontSize: fontSize.sm },
  condChipTextActive: { color: colors.primary, fontWeight: "600" },
  itemPickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.md, marginBottom: 6 },
  availCount: { color: colors.primary, fontWeight: "600" },
  selectedCount: { color: colors.warning, fontWeight: "600" },
  selectAllRow: { flexDirection: "row", gap: 6 },
  smallBtn: {
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.sm, paddingHorizontal: 12, paddingVertical: 5,
  },
  smallBtnText: { color: colors.textSecondary, fontSize: fontSize.xs },
  emptyPickerText: { color: colors.textMuted, textAlign: "center", padding: spacing.lg },
  itemList: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, overflow: "hidden", marginBottom: spacing.md },
  categoryHeader: {
    backgroundColor: colors.bgCard, padding: 8, paddingHorizontal: 14,
    color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: "700", letterSpacing: 0.8,
  },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.bgCard },
  itemRowChecked: { backgroundColor: `${colors.success}08` },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: colors.border, alignItems: "center", justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: colors.success, borderColor: colors.success },
  checkmark: { color: colors.bg, fontWeight: "700", fontSize: 13 },
  itemTag: { color: colors.primary, fontFamily: "monospace", fontWeight: "700", fontSize: fontSize.xs },
  itemName: { color: colors.textSecondary, fontSize: fontSize.sm },
  itemModel: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
  availBadge: { backgroundColor: `${colors.success}15`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full },
  availBadgeText: { color: colors.success, fontSize: fontSize.xs, fontWeight: "600" },
  submitBtn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.md,
    padding: 14, alignItems: "center", marginTop: spacing.md,
  },
  submitBtnDisabled: { backgroundColor: colors.bgCard },
  submitBtnText: { color: colors.bg, fontWeight: "700", fontSize: fontSize.md },
  errorBox: {
    backgroundColor: `${colors.danger}15`, borderWidth: 1, borderColor: `${colors.danger}30`,
    borderRadius: borderRadius.sm, padding: spacing.sm, marginBottom: spacing.md,
  },
  errorText: { color: colors.danger, fontSize: fontSize.sm },

  // Success overlay
  overlayBg: { flex: 1, backgroundColor: "rgba(0,8,20,0.88)", justifyContent: "center", alignItems: "center", padding: spacing.lg },
  overlayCard: {
    backgroundColor: colors.bgCard, borderRadius: 20, padding: 28,
    width: "100%", borderWidth: 1, borderColor: `${colors.success}40`,
  },
  successIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: `${colors.success}20`, borderWidth: 2, borderColor: colors.success,
    alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 14,
  },
  successTitle: { fontSize: fontSize.xl, fontWeight: "700", color: colors.success, textAlign: "center" },
  successSub: { color: colors.textSecondary, textAlign: "center", marginTop: 4, marginBottom: 20, fontSize: fontSize.sm },
  borrowedLabel: { fontSize: fontSize.xs, fontWeight: "700", color: colors.textMuted, letterSpacing: 1, marginBottom: 10 },
  borrowedItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: `${colors.success}08`, borderWidth: 1, borderColor: `${colors.success}30`,
    borderRadius: 10, padding: 10, marginBottom: 6,
  },
  itemCheckCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: `${colors.success}20`, borderWidth: 2, borderColor: colors.success,
    alignItems: "center", justifyContent: "center",
  },
  borrowedBadge: {
    backgroundColor: `${colors.warning}15`, borderWidth: 1, borderColor: `${colors.warning}40`,
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2,
  },
  borrowedBadgeText: { color: colors.warning, fontSize: fontSize.xs, fontWeight: "700" },
  doneBtn: {
    backgroundColor: colors.success, borderRadius: borderRadius.md,
    padding: 14, alignItems: "center", marginTop: 16,
  },
  doneBtnText: { color: colors.bg, fontWeight: "700", fontSize: fontSize.md },

  // My borrows
  borrowCard: {
    backgroundColor: colors.bgCard, borderRadius: borderRadius.md,
    borderWidth: 1, padding: spacing.md,
  },
  borrowCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  borrowId: { color: colors.primary, fontWeight: "700", fontFamily: "monospace", fontSize: fontSize.sm },
  borrowLab: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  borrowItems: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  borrowItemChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.bgCardLight, borderRadius: borderRadius.sm, padding: 5, paddingHorizontal: 10,
  },
  borrowItemTick: { color: colors.success, fontSize: fontSize.xs },
  borrowItemTag: { color: colors.primary, fontFamily: "monospace", fontWeight: "600", fontSize: fontSize.xs },
  borrowItemName: { color: colors.textPrimary, fontSize: fontSize.xs },
  borrowMeta: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
  metaText: { fontSize: fontSize.xs, color: colors.textSecondary },

  // Active borrows
  txCard: {
    backgroundColor: colors.bgCard, borderRadius: borderRadius.md,
    borderWidth: 1, padding: spacing.md,
  },
  txId: { color: colors.primary, fontWeight: "700", fontSize: fontSize.sm },
  txBorrower: { color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: 2 },
  txPurpose: { color: colors.textMuted, fontSize: fontSize.xs },
  returnBtn: {
    backgroundColor: `${colors.success}20`, borderWidth: 1, borderColor: `${colors.success}40`,
    borderRadius: borderRadius.sm, paddingHorizontal: 14, paddingVertical: 7,
  },
  returnBtnText: { color: colors.success, fontWeight: "600", fontSize: fontSize.sm },
});