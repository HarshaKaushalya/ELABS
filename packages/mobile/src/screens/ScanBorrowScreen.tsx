import { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/routes";
import { colors, fontSize, spacing } from "../lib/theme";

type Props = NativeStackScreenProps<RootStackParamList, "ScanBorrow">;

/**
 * ScanBorrow redirects to the Inventory screen where the full borrow
 * form lives (with lab picker, student lookup, item picker).
 */
export default function ScanBorrowScreen({ navigation }: Props) {
  useEffect(() => {
    // Replace so the user can press back from Inventory to Dashboard
    navigation.replace("Inventory");
  }, [navigation]);

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>Opening Borrow Form…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  text: { color: colors.textSecondary, fontSize: fontSize.md },
});