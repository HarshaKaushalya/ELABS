import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, StyleSheet } from "react-native";
import { colors, fontSize } from "../lib/theme";

// ─── Screens ─────────────────────────────────────────────────────────────────
import DashboardScreen from "../screens/DashboardScreen";
import InventoryScreen from "../screens/InventoryScreen";
import MessagesScreen from "../screens/MessagesScreen";
import MessageThreadScreen from "../screens/MessageThreadScreen";
import AiAssistantScreen from "../screens/AiAssistantScreen";
import MyLabsScreen from "../screens/MyLabsScreen";
import LabGroupScreen from "../screens/LabGroupScreen";
import ModuleDetailScreen from "../screens/ModuleDetailScreen";
import SessionDetailScreen from "../screens/SessionDetailScreen";
import ScanEntryScreen from "../screens/ScanEntryScreen";
import ScanExitScreen from "../screens/ScanExitScreen";
import ScanBorrowScreen from "../screens/ScanBorrowScreen";
import ScanReturnScreen from "../screens/ScanReturnScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import CoursesScreen from "../screens/CoursesScreen";
import CourseDetailScreen from "../screens/CourseDetailScreen";
import SettingsScreen from "../screens/SettingsScreen";

import type {
  TabParamList,
  HomeStackParamList,
  LabsStackParamList,
  InventoryStackParamList,
  MessagesStackParamList,
  ProfileStackParamList,
} from "./routes";

const Tab = createBottomTabNavigator<TabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const LabsStack = createNativeStackNavigator<LabsStackParamList>();
const InventoryStack = createNativeStackNavigator<InventoryStackParamList>();
const MessagesStack = createNativeStackNavigator<MessagesStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const darkHeader = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { fontWeight: "600" as const, color: colors.textPrimary },
  headerShadowVisible: false,
};

// ─── Tab Stacks ───────────────────────────────────────────────────────────────

function DashboardStack() {
  return (
    <HomeStack.Navigator screenOptions={{ ...darkHeader, contentStyle: { backgroundColor: colors.bg }, animation: "slide_from_right" }}>
      <HomeStack.Screen name="Dashboard" component={DashboardScreen} options={{ title: "ELABS", headerBackVisible: false }} />
      <HomeStack.Screen name="ScanEntry" component={ScanEntryScreen} options={{ title: "Scan Entry" }} />
      <HomeStack.Screen name="ScanExit" component={ScanExitScreen} options={{ title: "Scan Exit" }} />
      <HomeStack.Screen name="ScanBorrow" component={ScanBorrowScreen} options={{ title: "Borrow Equipment" }} />
      <HomeStack.Screen name="ScanReturn" component={ScanReturnScreen} options={{ title: "Return Equipment" }} />
      <HomeStack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "Notifications" }} />
    </HomeStack.Navigator>
  );
}

function LabsStack_() {
  return (
    <LabsStack.Navigator screenOptions={{ ...darkHeader, contentStyle: { backgroundColor: colors.bg }, animation: "slide_from_right" }}>
      <LabsStack.Screen name="MyLabs" component={MyLabsScreen} options={{ title: "Lab Groups" }} />
      <LabsStack.Screen name="LabGroup" component={LabGroupScreen} options={({ route }) => ({ title: route.params.groupName })} />
      <LabsStack.Screen name="ModuleDetail" component={ModuleDetailScreen} options={({ route }) => ({ title: `${route.params.moduleCode}` })} />
      <LabsStack.Screen name="SessionDetail" component={SessionDetailScreen} options={{ title: "Lab Session" }} />
      <LabsStack.Screen name="Courses" component={CoursesScreen} options={{ title: "Courses" }} />
      <LabsStack.Screen name="CourseDetail" component={CourseDetailScreen} options={({ route }) => ({ title: route.params.moduleCode })} />
    </LabsStack.Navigator>
  );
}

function InventoryStack_() {
  return (
    <InventoryStack.Navigator screenOptions={{ ...darkHeader, contentStyle: { backgroundColor: colors.bg }, animation: "slide_from_right" }}>
      <InventoryStack.Screen name="Inventory" component={InventoryScreen} options={{ title: "Inventory" }} />
    </InventoryStack.Navigator>
  );
}

function MessagesStack_() {
  return (
    <MessagesStack.Navigator screenOptions={{ ...darkHeader, contentStyle: { backgroundColor: colors.bg }, animation: "slide_from_right" }}>
      <MessagesStack.Screen name="Messages" component={MessagesScreen} options={{ title: "Messages" }} />
      <MessagesStack.Screen name="MessageThread" component={MessageThreadScreen} options={({ route }) => ({ title: route.params.subject })} />
    </MessagesStack.Navigator>
  );
}

function ProfileStack_() {
  return (
    <ProfileStack.Navigator screenOptions={{ ...darkHeader, contentStyle: { backgroundColor: colors.bg }, animation: "slide_from_right" }}>
      <ProfileStack.Screen name="Settings" component={SettingsScreen} options={{ title: "Profile & Settings" }} />
      <ProfileStack.Screen name="AiAssistant" component={AiAssistantScreen} options={{ title: "ELABS AI Assistant" }} />
    </ProfileStack.Navigator>
  );
}

// ─── Tab Icon ─────────────────────────────────────────────────────────────────

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function TabIcon({ name, focused, badge }: { name: IoniconName; focused: boolean; badge?: number }) {
  return (
    <View style={styles.iconWrap}>
      <Ionicons
        name={focused ? name.replace("-outline", "") as IoniconName : name}
        size={24}
        color={focused ? colors.primary : colors.textMuted}
      />
      {badge && badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Main Tab Navigator ───────────────────────────────────────────────────────

export function TabNavigator({ unreadCount = 0 }: { unreadCount?: number }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={DashboardStack}
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon name="home-outline" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="LabsTab"
        component={LabsStack_}
        options={{
          title: "Labs",
          tabBarIcon: ({ focused }) => <TabIcon name="flask-outline" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="InventoryTab"
        component={InventoryStack_}
        options={{
          title: "Inventory",
          tabBarIcon: ({ focused }) => <TabIcon name="clipboard-outline" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="MessagesTab"
        component={MessagesStack_}
        options={{
          title: "Messages",
          tabBarIcon: ({ focused }) => <TabIcon name="chatbubbles-outline" focused={focused} badge={unreadCount} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack_}
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => <TabIcon name="person-outline" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconWrap: { position: "relative", alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: "700" },
});
