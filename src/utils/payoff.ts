export interface PayoffPlanDebt {
  id: number;
  name: string;
  balance: number;
  aprPercent: number;
  minimumPayment: number;
}

export interface PayoffOrderEntry {
  id: number;
  name: string;
  monthsToPayoff: number;
}

export interface PayoffResult {
  order: PayoffOrderEntry[];
  totalMonths: number;
}

// Safety cap so a minimum payment that doesn't outpace interest can't loop forever.
const MAX_MONTHS = 1200;
const EPSILON = 0.005;

function simulate(debts: PayoffPlanDebt[], extraPayment: number, orderIds: number[]): PayoffResult {
  const balances = new Map(debts.map((d) => [d.id, d.balance]));
  const monthlyRates = new Map(debts.map((d) => [d.id, d.aprPercent / 100 / 12]));
  const minimums = new Map(debts.map((d) => [d.id, d.minimumPayment]));
  const payoffMonth = new Map<number, number>();

  let month = 0;
  while (orderIds.some((id) => (balances.get(id) ?? 0) > EPSILON) && month < MAX_MONTHS) {
    month++;

    // Minimum payments (plus this month's interest) go to every debt still owing.
    for (const id of orderIds) {
      const balance = balances.get(id) ?? 0;
      if (balance <= EPSILON) continue;
      const withInterest = balance + balance * (monthlyRates.get(id) ?? 0);
      const payment = Math.min(minimums.get(id) ?? 0, withInterest);
      balances.set(id, withInterest - payment);
    }

    // The extra payment rolls onto the highest-priority debt still owing, then the next.
    let extra = extraPayment;
    for (const id of orderIds) {
      if (extra <= EPSILON) break;
      const balance = balances.get(id) ?? 0;
      if (balance <= EPSILON) continue;
      const pay = Math.min(extra, balance);
      balances.set(id, balance - pay);
      extra -= pay;
    }

    for (const id of orderIds) {
      if (!payoffMonth.has(id) && (balances.get(id) ?? 0) <= EPSILON) {
        payoffMonth.set(id, month);
      }
    }
  }

  const order = orderIds.map((id) => {
    const debt = debts.find((d) => d.id === id)!;
    return { id, name: debt.name, monthsToPayoff: payoffMonth.get(id) ?? month };
  });
  return { order, totalMonths: month };
}

export function snowballOrder(debts: PayoffPlanDebt[]): number[] {
  return [...debts].sort((a, b) => a.balance - b.balance).map((d) => d.id);
}

export function avalancheOrder(debts: PayoffPlanDebt[]): number[] {
  return [...debts].sort((a, b) => b.aprPercent - a.aprPercent).map((d) => d.id);
}

export function computePayoffProjections(
  debts: PayoffPlanDebt[],
  extraPayment: number
): { snowball: PayoffResult; avalanche: PayoffResult } | null {
  if (debts.length === 0) return null;
  return {
    snowball: simulate(debts, extraPayment, snowballOrder(debts)),
    avalanche: simulate(debts, extraPayment, avalancheOrder(debts)),
  };
}
