import { Component, ChangeDetectionStrategy, output, inject, input, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Priority, Expense, ExpenseStatus, RecurrenceFrequency } from '../models/expense.model';

@Component({
  selector: 'app-expense-form',
  templateUrl: './expense-form.component.html',
  imports: [ReactiveFormsModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseFormComponent implements OnInit {
  save = output<Omit<Expense, 'id' | 'createdAt' | 'houseId' | 'currency'> | Expense>();
  close = output<void>();
  categories = input.required<string[]>();
  expense = input<Expense | null>(null);

  private fb: FormBuilder = inject(FormBuilder);

  isEditMode = false;
  formTitle = 'Añadir Nuevo Gasto';
  priorities = Object.values(Priority);
  recurrenceFrequencies = Object.values(RecurrenceFrequency);

  expenseForm = this.fb.group({
    description: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    category: ['Sin categorizar', Validators.required],
    dueDate: ['', [this.dateNotInPastValidator()]],
    priority: [Priority.Medium, Validators.required],
    isRecurring: [false],
    recurrenceFrequency: [RecurrenceFrequency.Monthly],
    recurrenceEndDate: [''],
  });
  
  ngOnInit(): void {
    const expenseData = this.expense();
    if (expenseData) {
      this.isEditMode = true;
      this.formTitle = 'Editar Gasto';
      this.expenseForm.patchValue({
        ...expenseData,
        dueDate: expenseData.dueDate ? this.formatDate(expenseData.dueDate) : '',
        recurrenceEndDate: expenseData.recurrenceEndDate ? this.formatDate(expenseData.recurrenceEndDate) : '',
      });
    }

    this.expenseForm.get('isRecurring')?.valueChanges.subscribe(isRecurring => {
      const freqControl = this.expenseForm.get('recurrenceFrequency');
      if (isRecurring) {
        freqControl?.setValidators(Validators.required);
      } else {
        freqControl?.clearValidators();
      }
      freqControl?.updateValueAndValidity();
    });
  }

  onSubmit(): void {
    if (this.expenseForm.valid) {
      const formValue = this.expenseForm.getRawValue();
      const existingExpense = this.expense();

      const expenseData: Partial<Expense> = {
          description: formValue.description!,
          amount: formValue.amount!,
          category: formValue.category!,
          dueDate: formValue.dueDate ? new Date(formValue.dueDate) : undefined,
          priority: formValue.priority as Priority,
          isRecurring: formValue.isRecurring!,
          recurrenceFrequency: formValue.isRecurring ? formValue.recurrenceFrequency as RecurrenceFrequency : undefined,
          recurrenceEndDate: formValue.isRecurring && formValue.recurrenceEndDate ? new Date(formValue.recurrenceEndDate) : undefined,
      };
      
      if (!formValue.isRecurring) {
        delete expenseData.recurrenceFrequency;
        delete expenseData.recurrenceEndDate;
      }

      if (existingExpense) {
          this.save.emit({ ...existingExpense, ...expenseData });
      } else {
          this.save.emit({
            ...expenseData,
            status: ExpenseStatus.Pending
          } as Omit<Expense, 'id' | 'createdAt' | 'houseId' | 'currency'>);
      }
      
      this.closeForm();
    }
  }

  closeForm(): void {
    this.close.emit();
  }
  
  private dateNotInPastValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        if (!control.value || this.isEditMode) {
            return null;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const controlDate = new Date(control.value);
        
        return controlDate < today ? { dateInPast: true } : null;
    };
  }

  private formatDate(date: Date | string): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
