export function formatAmount(amount: number, symbol: string): string {
  const rounded = Math.round(amount);
  const formatted = Math.abs(rounded).toLocaleString('en-US');
  const sign = rounded < 0 ? '-' : '';
  return `${sign}${symbol} ${formatted}`;
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 1000) / 10}%`;
}
