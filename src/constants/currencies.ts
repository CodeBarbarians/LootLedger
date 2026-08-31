export interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'PKR', symbol: '₨', label: 'PKR' },
  { code: 'USD', symbol: '$', label: 'USD' },
  { code: 'INR', symbol: '₹', label: 'INR' },
  { code: 'GBP', symbol: '£', label: 'GBP' },
  { code: 'EUR', symbol: '€', label: 'EUR' },
  { code: 'AED', symbol: 'د.إ', label: 'AED' },
  { code: 'SAR', symbol: '﷼', label: 'SAR' },
];
