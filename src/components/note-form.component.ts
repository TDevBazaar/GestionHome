import { Component, ChangeDetectionStrategy, output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Note } from '../models/note.model';

@Component({
  selector: 'app-note-form',
  templateUrl: './note-form.component.html',
  imports: [ReactiveFormsModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoteFormComponent {
  save = output<Omit<Note, 'id' | 'createdAt' | 'houseId'>>();
  close = output<void>();

  // FIX: Explicitly type `fb` as FormBuilder to resolve type inference issue.
  private fb: FormBuilder = inject(FormBuilder);

  noteForm = this.fb.group({
    title: ['', Validators.required],
    content: ['', Validators.required],
    author: ['System', Validators.required],
    isPinned: [false]
  });

  onSubmit(): void {
    if (this.noteForm.valid) {
      this.save.emit(this.noteForm.getRawValue() as Omit<Note, 'id' | 'createdAt' | 'houseId'>);
      this.closeForm();
    }
  }

  closeForm(): void {
    this.close.emit();
  }
}
