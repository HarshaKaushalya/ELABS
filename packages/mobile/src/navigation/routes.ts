export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  ScanEntry: undefined;
  ScanExit: undefined;
  ScanBorrow: undefined;
  ScanReturn: undefined;
  Inventory: undefined;
  MyLabs: undefined;
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
  Notifications: "Notifications",
  Messages: "Messages",
  AiAssistant: "AiAssistant",
  Settings: "Settings"
};