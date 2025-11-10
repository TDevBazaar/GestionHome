export enum ExpenseStatus {
  Pending = 'PENDING',
  Completed = 'COMPLETED',
  Cancelled = 'CANCELLED',
}

export enum Priority {
  Low = 'Baja',
  Medium = 'Media',
  High = 'Alta',
}

export enum RecurrenceFrequency {
  Monthly = 'Mensual',
  Quarterly = 'Trimestral',
  Yearly = 'Anual',
}

export interface Expense {
  id: string;
  houseId: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  status: ExpenseStatus;
  dueDate?: Date | string;
  paidDate?: Date | string;
  priority: Priority;
  createdAt: Date;
  isRecurring?: boolean;
  recurrenceFrequency?: RecurrenceFrequency;
  recurrenceEndDate?: Date | string;
}