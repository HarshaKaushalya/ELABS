import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./routes";
import { colors } from "../lib/theme";

import LoginScreen from "../screens/LoginScreen";
import DashboardScreen from "../screens/DashboardScreen";
import ScanEntryScreen from "../screens/ScanEntryScreen";
import ScanExitScreen from "../screens/ScanExitScreen";
import ScanBorrowScreen from "../screens/ScanBorrowScreen";
import ScanReturnScreen from "../screens/ScanReturnScreen";
import InventoryScreen from "../screens/InventoryScreen";
import MyLabsScreen from "../screens/MyLabsScreen";
import LabGroupScreen from "../screens/LabGroupScreen";
import ModuleDetailScreen from "../screens/ModuleDetailScreen";
import SessionDetailScreen from "../screens/SessionDetailScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import MessagesScreen from "../screens/MessagesScreen";
import AiAssistantScreen from "../screens/AiAssistantScreen";
import SettingsScreen from "../screens/SettingsScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

const darkHeader = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { fontWeight: "600" as const },
  headerShadowVisible: false,
};

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        ...darkHeader,
        contentStyle: { backgroundColor: colors.bg },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: "ELABS", headerBackVisible: false }}
      />
      <Stack.Screen name="ScanEntry" component={ScanEntryScreen} options={{ title: "Scan Entry" }} />
      <Stack.Screen name="ScanExit" component={ScanExitScreen} options={{ title: "Scan Exit" }} />
      <Stack.Screen name="ScanBorrow" component={ScanBorrowScreen} options={{ title: "Borrow Equipment" }} />
      <Stack.Screen name="ScanReturn" component={ScanReturnScreen} options={{ title: "Return Equipment" }} />
      <Stack.Screen name="Inventory" component={InventoryScreen} options={{ title: "Inventory" }} />
      <Stack.Screen name="MyLabs" component={MyLabsScreen} options={{ title: "Lab Groups" }} />
      <Stack.Screen
        name="LabGroup"
        component={LabGroupScreen}
        options={({ route }) => ({ title: route.params.groupName })}
      />
      <Stack.Screen
        name="ModuleDetail"
        component={ModuleDetailScreen}
        options={({ route }) => ({ title: `${route.params.moduleCode}: ${route.params.moduleName}` })}
      />
      <Stack.Screen
        name="SessionDetail"
        component={SessionDetailScreen}
        options={{ title: "Lab Session" }}
      />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "Notifications" }} />
      <Stack.Screen name="Messages" component={MessagesScreen} options={{ title: "Messages" }} />
      <Stack.Screen name="AiAssistant" component={AiAssistantScreen} options={{ title: "AI Assistant" }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
    </Stack.Navigator>
  );
}