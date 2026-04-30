import { StyleSheet, Text, View } from "react-native";
import { Card } from "../components/Card";

export default function NotificationsScreen() {
  return (
    <View style={styles.container}>
      <Card>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.text}>Mobile notification feed placeholder.</Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9", padding: 16 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  text: { color: "#334155" }
});