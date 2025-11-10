import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppNotification, NotificationAction, NotificationType } from '../models/notification.model';

@Component({
  selector: 'app-notification-toast',
  templateUrl: './notification-toast.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationToastComponent {
  notification = input.required<AppNotification>();
  dismiss = output<string>();
  executeAction = output<{ actionId: string, notificationId: string, context: any }>();

  onDismiss(): void {
    this.dismiss.emit(this.notification().id);
  }
  
  onAction(action: NotificationAction): void {
    this.executeAction.emit({
      actionId: action.id,
      notificationId: this.notification().id,
      context: this.notification().context
    });
  }

  containerClasses(): string {
    const type = this.notification().type;
    switch (type) {
        case 'success': return 'bg-green-500 dark:bg-green-600';
        case 'error': return 'bg-red-500 dark:bg-red-600';
        case 'warning': return 'bg-yellow-500 dark:bg-yellow-600';
        case 'info': return 'bg-sky-500 dark:bg-sky-600';
        default: return 'bg-slate-700';
    }
  }

  actionButtonClasses(): string {
    const type = this.notification().type;
    switch (type) {
        case 'success': return 'bg-green-700 text-white';
        case 'error': return 'bg-red-700 text-white';
        case 'warning': return 'bg-yellow-700 text-white';
        case 'info': return 'bg-sky-700 text-white';
        default: return 'bg-slate-600 text-white';
    }
  }
}
