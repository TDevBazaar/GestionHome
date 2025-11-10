import { Component, ChangeDetectionStrategy, output, inject, input, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { House } from '../models/house.model';
import { Currency } from '../models/currency.model';

@Component({
  selector: 'app-house-form',
  templateUrl: './house-form.component.html',
  imports: [ReactiveFormsModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HouseFormComponent implements OnInit {
  save = output<Omit<House, 'id'> | House>();
  close = output<void>();
  house = input<House | null>(null);
  currencies = input.required<Currency[]>();

  // FIX: Explicitly type `fb` as FormBuilder to resolve type inference issue.
  private fb: FormBuilder = inject(FormBuilder);
  
  isEditMode = false;
  formTitle = 'Añadir Nueva Casa';

  houseForm = this.fb.group({
    name: ['', Validators.required],
    address: ['', Validators.required],
    currency: ['USD', Validators.required],
    imageUrl: [''],
  });

  ngOnInit(): void {
    const houseData = this.house();
    if (houseData) {
      this.isEditMode = true;
      this.formTitle = 'Editar Casa';
      this.houseForm.patchValue(houseData);
    }
  }

  onSubmit(): void {
    if (this.houseForm.valid) {
      const formValue = this.houseForm.getRawValue();
      let houseData: Omit<House, 'id'> | House;
      
      const houseId = this.house()?.id ?? '';
      const imageUrl = formValue.imageUrl || `https://picsum.photos/seed/${houseId || crypto.randomUUID()}/400/200`;

      if (this.isEditMode) {
        houseData = {
          id: this.house()!.id,
          name: formValue.name!,
          address: formValue.address!,
          currency: formValue.currency!,
          imageUrl: formValue.imageUrl!
        };
      } else {
        houseData = {
          name: formValue.name!,
          address: formValue.address!,
          currency: formValue.currency!,
          imageUrl: imageUrl
        };
      }
      this.save.emit(houseData);
      this.closeForm();
    }
  }

  closeForm(): void {
    this.close.emit();
  }
}
