export interface AttendanceEvent {
  id: string;
  userId: string;
  labId: string;
  eventType: "enter" | "exit";
  scannedAt: string;
}