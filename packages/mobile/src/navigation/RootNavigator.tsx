import { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { loadTokenFromStorage } from "../lib/auth";
import { apiGet } from "../lib/api";
import { colors } from "../lib/theme";
import { View, ActivityIndicator } from "react-native";
import type { RootStackParamList } from "./routes";

import LoginScreen from "../screens/LoginScreen";
import { TabNavigator } from "./TabNavigator";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const [ready, setReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadTokenFromStorage().then((token) => {
      setIsLoggedIn(!!token);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    async function fetchUnread() {
      try {
        const data = await apiGet<{ messages: any[] }>("/messages/inbox");
        const unread = (data.messages ?? []).filter((m: any) => !m.isRead).length;
        setUnreadCount(unread);
      } catch {}
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator 
      initialRouteName={isLoggedIn ? "Dashboard" : "Login"}
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Dashboard" children={() => <TabNavigator unreadCount={unreadCount} />} />
    </Stack.Navigator>
  );
}