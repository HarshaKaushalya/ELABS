export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  ScanEntry: undefined;
  ScanExit: undefined;
  ScanBorrow: undefined;
  ScanReturn: undefined;
  Inventory: undefined;
  MyLabs: undefined;
  LabGroup: { groupId: number; groupName: string };
  ModuleDetail: { moduleId: number; moduleCode: string; moduleName: string; semesterId: number; semesterName: string };
  SessionDetail: { sessionId: number };
  Notifications: undefined;
  Messages: undefined;
  AiAssistant: undefined;
  Settings: undefined;
};

export const ROUTES: { [K in keyof RootStackParamList]: K } = {
  Login: "Login",
  Dashboard: "Dashboard",
  ScanEntry: "ScanEntry",
  ScanExit: "ScanExit",
  ScanBorrow: "ScanBorrow",
  ScanReturn: "ScanReturn",
  Inventory: "Inventory",
  MyLabs: "MyLabs",
  LabGroup: "LabGroup",
  ModuleDetail: "ModuleDetail",
  SessionDetail: "SessionDetail",
  Notifications: "Notifications",
  Messages: "Messages",
  AiAssistant: "AiAssistant",
  Settings: "Settings",
};