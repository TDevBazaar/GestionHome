export type NotificationType = 'error' | 'success' | 'info' | 'warning';

export interface NotificationAction {
  label: string;
  id: string; // e.g., 'snooze', 'pay'
}

export interface AppNotification {
  id: string;
  message: string;
  type: NotificationType;
  isPersistent: boolean;
  duration?: number;
  actions?: NotificationAction[];
  context?: { [key: string]: any }; // To pass data like expenseId
}
