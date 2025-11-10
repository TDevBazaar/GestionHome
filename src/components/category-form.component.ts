import { Component, ChangeDetectionStrategy, output, inject, input, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-category-form',
  templateUrl: './category-form.component.html',
  imports: [ReactiveFormsModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryFormComponent implements OnInit {
  save = output<{ oldName?: string, newName: string }>();
  close = output<void>();
  category = input<string | null>(null);

  // FIX: Explicitly type `fb` as FormBuilder to resolve type inference issue.
  private fb: FormBuilder = inject(FormBuilder);
  
  isEditMode = false;
  formTitle = 'Añadir Nueva Categoría';

  categoryForm = this.fb.group({
    name: ['', Validators.required],
  });

  ngOnInit(): void {
    const categoryName = this.category();
    if (categoryName) {
      this.isEditMode = true;
      this.formTitle = 'Editar Categoría';
      this.categoryForm.setValue({ name: categoryName });
    }
  }

  onSubmit(): void {
    if (this.categoryForm.valid) {
      const newName = this.categoryForm.getRawValue().name!;
      const oldName = this.isEditMode ? this.category()! : undefined;
      this.save.emit({ oldName, newName });
      this.closeForm();
    }
  }

  closeForm(): void {
    this.close.emit();
  }
}
