import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./routes";
import LoginScreen from "../screens/LoginScreen";
import DashboardScreen from "../screens/DashboardScreen";
import ScanEntryScreen from "../screens/ScanEntryScreen";
import ScanExitScreen from "../screens/ScanExitScreen";
import ScanBorrowScreen from "../screens/ScanBorrowScreen";
import ScanReturnScreen from "../screens/ScanReturnScreen";
import InventoryScreen from "../screens/InventoryScreen";
import MyLabsScreen from "../screens/MyLabsScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import MessagesScreen from "../screens/MessagesScreen";
import AiAssistantScreen from "../screens/AiAssistantScreen";
import SettingsScreen from "../screens/SettingsScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerStyle: { backgroundColor: "#0f172a" }, headerTintColor: "#f8fafc" }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="ScanEntry" component={ScanEntryScreen} options={{ title: "Scan Entry" }} />
      <Stack.Screen name="ScanExit" component={ScanExitScreen} options={{ title: "Scan Exit" }} />
      <Stack.Screen name="ScanBorrow" component={ScanBorrowScreen} options={{ title: "Borrow Scan" }} />
      <Stack.Screen name="ScanReturn" component={ScanReturnScreen} options={{ title: "Return Scan" }} />
      <Stack.Screen name="Inventory" component={InventoryScreen} />
      <Stack.Screen name="MyLabs" component={MyLabsScreen} options={{ title: "My Labs" }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Messages" component={MessagesScreen} />
      <Stack.Screen name="AiAssistant" component={AiAssistantScreen} options={{ title: "AI Assistant" }} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}