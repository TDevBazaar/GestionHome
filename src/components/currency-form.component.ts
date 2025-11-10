import { Component, ChangeDetectionStrategy, output, inject, input, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Currency } from '../models/currency.model';

@Component({
  selector: 'app-currency-form',
  templateUrl: './currency-form.component.html',
  imports: [ReactiveFormsModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencyFormComponent implements OnInit {
  save = output<Currency>();
  close = output<void>();
  currency = input<Currency | null>(null);

  // FIX: Explicitly type `fb` as FormBuilder to resolve type inference issue.
  private fb: FormBuilder = inject(FormBuilder);
  
  isEditMode = false;
  formTitle = 'Añadir Nueva Moneda';

  currencyForm = this.fb.group({
    name: ['', Validators.required],
    code: ['', [Validators.required, Validators.pattern(/^[A-Z]{3}$/)]], // ISO 4217
    symbol: ['', Validators.required],
    // FIX: Changed rateToUSD to rateToCUP to match the data model.
    rateToCUP: [1, [Validators.required, Validators.min(0.000001)]],
  });

  ngOnInit(): void {
    const currencyData = this.currency();
    if (currencyData) {
      this.isEditMode = true;
      this.formTitle = 'Editar Moneda';
      this.currencyForm.patchValue(currencyData);
      this.currencyForm.controls.code.disable();
      // FIX: The base currency is CUP, not USD.
      if (currencyData.code === 'CUP') {
        this.currencyForm.controls.rateToCUP.disable();
      }
    }
  }

  onSubmit(): void {
    if (this.currencyForm.valid) {
      this.save.emit(this.currencyForm.getRawValue() as Currency);
      this.closeForm();
    }
  }

  closeForm(): void {
    this.close.emit();
  }
}
