import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationDialogComponent {
  title = input<string>('Confirmar Acción');
  message = input<string>('¿Estás seguro de que quieres proceder?');
  confirmButtonText = input<string>('Eliminar');
  confirmButtonColor = input<'red' | 'green'>('red');
  iconType = input<'warning' | 'success'>('warning');
  
  confirm = output<void>();
  cancel = output<void>();

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
