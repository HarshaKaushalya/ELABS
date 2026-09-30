import { StyleSheet, Text, View } from "react-native";

type OfflineQueueBadgeProps = {
  count: number;
};

export function OfflineQueueBadge({ count }: OfflineQueueBadgeProps) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>Offline Queue: {count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { backgroundColor: "#fef3c7", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, alignSelf: "flex-start" },
  text: { color: "#92400e", fontWeight: "600" }
});