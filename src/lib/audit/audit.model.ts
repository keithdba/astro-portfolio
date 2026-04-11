/**
 * audit.model.ts
 *
 * Types and interfaces for the audit logging system.
 */

export type AuditEventType =
  | 'login_success'
  | 'login_failure'
  | 'logout_success'
  | 'logout_failure'
  | 'message_read'
  | 'message_archived'
  | 'message_deleted'
  | 'credential_change'
  | 'admin_action';

export interface AuditLog {
  id: string;
  timestamp: string;
  admin_id: string | 'system' | 'anonymous';
  action: AuditEventType;
  metadata: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

export interface AuditLogQuery {
  action?: AuditEventType;
  admin_id?: string;
  startDate?: string;
  endDate?: string;
}
