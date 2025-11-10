import { Component, ChangeDetectionStrategy, output, inject, input, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { User, UserRole } from '../models/user.model';
import { House } from '../models/house.model';

@Component({
  selector: 'app-user-form',
  standalone: true,
  templateUrl: './user-form.component.html',
  imports: [ReactiveFormsModule, CommonModule, TitleCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormComponent implements OnInit {
  save = output<User>();
  close = output<void>();
  user = input<User | null>(null);
  houses = input.required<House[]>();

  private fb: FormBuilder = inject(FormBuilder);
  
  isEditMode = false;
  formTitle = 'Añadir Nuevo Usuario';
  userRoles = Object.values(UserRole);

  userForm = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
    role: [UserRole.User, Validators.required],
    houseAssignments: this.fb.group({})
  });

  get houseAssignmentsFormGroup(): FormGroup {
    return this.userForm.get('houseAssignments') as FormGroup;
  }

  ngOnInit(): void {
    // Populate house assignments controls
    this.houses().forEach(house => {
        this.houseAssignmentsFormGroup.addControl(house.id, new FormControl(false));
    });

    const userData = this.user();
    if (userData) {
      this.isEditMode = true;
      this.formTitle = 'Editar Usuario';
      
      // Password is not required when editing
      this.userForm.get('password')?.clearValidators();
      this.userForm.get('password')?.updateValueAndValidity();
      
      this.userForm.patchValue({
        username: userData.username,
        role: userData.role,
      });

      // Set house assignments checkboxes
      if (userData.role === UserRole.User) {
        const assignments: { [key: string]: boolean } = {};
        userData.assignedHouseIds.forEach(id => {
            assignments[id] = true;
        });
        this.houseAssignmentsFormGroup.patchValue(assignments);
      }
    }
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      const formValue = this.userForm.getRawValue();
      const existingUser = this.user();
      
      const assignedHouseIds = Object.keys(formValue.houseAssignments)
        .filter(houseId => formValue.houseAssignments[houseId as keyof typeof formValue.houseAssignments]);

      const userData: User = {
          id: existingUser?.id || '', // Will be set by data service if new
          username: formValue.username!,
          role: formValue.role!,
          assignedHouseIds: formValue.role === UserRole.User ? assignedHouseIds : [],
      };
      
      // Only include password if it was provided
      if (formValue.password) {
        userData.password = formValue.password;
      } else if (!this.isEditMode) {
        // This case should be prevented by validators, but as a safeguard
        console.error("Password is required for new users.");
        return;
      }

      this.save.emit(userData);
      this.closeForm();
    }
  }

  closeForm(): void {
    this.close.emit();
  }
}
