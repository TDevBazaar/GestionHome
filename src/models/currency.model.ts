export interface Currency {
  code: string; // e.g., 'CUP' (Primary Key)
  name: string; // e.g., 'Peso Cubano'
  symbol: string; // e.g., '$MN'
  rateToCUP: number; // Tasa de cambio a CUP. CUP es 1.
}