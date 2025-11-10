import { Injectable, inject, computed } from '@angular/core';
import { DataService } from './data.service';
import { Currency } from '../models/currency.model';

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private dataService = inject(DataService);

  private exchangeRates = computed(() => {
    const rates = new Map<string, number>();
    for (const currency of this.dataService.currencies()) {
      // FIX: The property is rateToCUP, not rateToUSD.
      rates.set(currency.code, currency.rateToCUP);
    }
    return rates;
  });

  convert(amount: number, fromCurrencyCode: string, toCurrencyCode: string): number {
    if (fromCurrencyCode === toCurrencyCode) {
      return amount;
    }

    const rates = this.exchangeRates();
    const fromRate = rates.get(fromCurrencyCode);
    const toRate = rates.get(toCurrencyCode);

    if (fromRate === undefined || toRate === undefined || toRate === 0) {
      console.error(`Unable to find exchange rate for ${fromCurrencyCode} or ${toCurrencyCode}`);
      return amount; 
    }

    // 1. Convertir el monto de la moneda de origen a la moneda base (CUP)
    const amountInCUP = amount * fromRate;
    
    // 2. Convertir de la moneda base (CUP) a la moneda de destino
    const convertedAmount = amountInCUP / toRate;

    return convertedAmount;
  }
}
