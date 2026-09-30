import { useEffect, useState, useCallback } from "react";
import {
  FlatList, Pressable, RefreshControl, StyleSheet,
  Text, View, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/routes";
import { apiGet } from "../lib/api";
import { colors, spacing, borderRadius, fontSize } from "../lib/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Courses">;

interface Enrollment {
  moduleId: number;
  moduleCode: string;
  moduleName: string;
  credits: number;
  semesterName: string;
  lecturedBy?: string;
}

export default function CoursesScreen({ navigation }: Props) {
  const [courses, setCourses] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCourses = useCallback(async () => {
    try {
      const data = await apiGet<{ enrollments: Enrollment[] }>("/courses/my-enrollments");
      setCourses(data.enrollments ?? []);
    } catch {
      // fallback
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchCourses();
    setRefreshing(false);
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      ) : courses.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="book-outline" size={56} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No Courses</Text>
          <Text style={styles.emptyText}>You are not enrolled in any courses yet.</Text>
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => String(item.moduleId)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListHeaderComponent={() => (
            <Text style={styles.count}>{courses.length} enrolled module{courses.length !== 1 ? "s" : ""}</Text>
          )}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
              onPress={() => navigation.navigate("CourseDetail", {
                moduleId: item.moduleId,
                moduleCode: item.moduleCode,
                moduleName: item.moduleName,
              })}
            >
              <View style={styles.cardLeft}>
                <View style={styles.codeTag}>
                  <Text style={styles.codeText}>{item.moduleCode}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.moduleName} numberOfLines={2}>{item.moduleName}</Text>
                  <Text style={styles.semesterText}>{item.semesterName}</Text>
                  {item.lecturedBy && (
                    <Text style={styles.lecturerText}>{item.lecturedBy}</Text>
                  )}
                </View>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.credits}>{item.credits}</Text>
                <Text style={styles.creditsLabel}>credits</Text>
                <Ionicons name="chevron-forward-outline" size={16} color={colors.textMuted} style={{ marginTop: 4 }} />
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.md, gap: spacing.sm },
  count: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.sm },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: "700", color: colors.textPrimary },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: "center" },

  card: {
    backgroundColor: colors.bgCard, borderRadius: borderRadius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
    flexDirection: "row", alignItems: "center", gap: spacing.md,
  },
  cardLeft: { flex: 1, flexDirection: "row", gap: spacing.md },
  codeTag: {
    backgroundColor: colors.primary + "20", borderRadius: borderRadius.sm,
    padding: spacing.sm, alignSelf: "flex-start", minWidth: 64, alignItems: "center",
  },
  codeText: { fontSize: fontSize.sm, fontWeight: "700", color: colors.primary },
  cardInfo: { flex: 1 },
  moduleName: { fontSize: fontSize.md, fontWeight: "600", color: colors.textPrimary, marginBottom: 4 },
  semesterText: { fontSize: fontSize.xs, color: colors.textMuted },
  lecturerText: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  cardRight: { alignItems: "center" },
  credits: { fontSize: fontSize.xl, fontWeight: "800", color: colors.accent },
  creditsLabel: { fontSize: fontSize.xs, color: colors.textMuted },
});
