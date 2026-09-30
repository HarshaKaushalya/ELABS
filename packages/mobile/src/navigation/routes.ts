import type { NavigatorScreenParams } from "@react-navigation/native";

// ─── Stack param lists per tab ───────────────────────────────────────────────

export type HomeStackParamList = {
  Dashboard: undefined;
  ScanEntry: undefined;
  ScanExit: undefined;
  ScanBorrow: undefined;
  ScanReturn: undefined;
  Notifications: undefined;
};

export type LabsStackParamList = {
  MyLabs: undefined;
  LabGroup: { groupId: number; groupName: string };
  ModuleDetail: { moduleId: number; moduleCode: string; moduleName: string; semesterId: number; semesterName: string };
  SessionDetail: { sessionId: number };
  Courses: undefined;
  CourseDetail: { moduleId: number; moduleCode: string; moduleName: string };
};

export type InventoryStackParamList = {
  Inventory: undefined;
};

export type MessagesStackParamList = {
  Messages: undefined;
  MessageThread: { messageId: number; subject: string; senderName: string; body: string; createdAt: string };
};

export type ProfileStackParamList = {
  Settings: undefined;
  AiAssistant: undefined;
};

// ─── Tab param list ───────────────────────────────────────────────────────────

export type TabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  LabsTab: NavigatorScreenParams<LabsStackParamList>;
  InventoryTab: NavigatorScreenParams<InventoryStackParamList>;
  MessagesTab: NavigatorScreenParams<MessagesStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

// ─── Root (wraps tabs + Login) ────────────────────────────────────────────────

export type RootStackParamList = {
  Login: undefined;
  Dashboard: NavigatorScreenParams<TabParamList>;
};

// ─── Legacy flat list kept for backwards compat (used in some screens) ────────
export const ROUTES = {
  Login: "Login",
  Dashboard: "Dashboard",
  // HomeTab screens
  ScanEntry: "ScanEntry",
  ScanExit: "ScanExit",
  ScanBorrow: "ScanBorrow",
  ScanReturn: "ScanReturn",
  Notifications: "Notifications",
  // LabsTab screens
  MyLabs: "MyLabs",
  LabGroup: "LabGroup",
  ModuleDetail: "ModuleDetail",
  SessionDetail: "SessionDetail",
  Courses: "Courses",
  CourseDetail: "CourseDetail",
  // InventoryTab screens
  Inventory: "Inventory",
  // MessagesTab screens
  Messages: "Messages",
  MessageThread: "MessageThread",
  // ProfileTab screens
  AiAssistant: "AiAssistant",
  Settings: "Settings",
} as const;