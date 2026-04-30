import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/routes";
import { Card } from "../components/Card";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Card>
        <Text style={styles.title}>ELABS Mobile</Text>
        <Text style={styles.text}>Authentication placeholder for JWT flow.</Text>
        <Pressable style={styles.button} onPress={() => navigation.replace("Dashboard")}>
          <Text style={styles.buttonText}>Continue (Demo)</Text>
        </Pressable>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f1f5f9", padding: 16 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  text: { color: "#334155", marginBottom: 12 },
  button: { backgroundColor: "#0f766e", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  buttonText: { color: "#ffffff", fontWeight: "600" }
});