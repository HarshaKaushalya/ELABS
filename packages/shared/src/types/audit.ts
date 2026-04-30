export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  resource: string;
  at: string;
}