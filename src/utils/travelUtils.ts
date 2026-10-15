import { ExpenseItem, Traveler, DebtSettlement, Trip, DayPlan } from '../types/travel';

export function calculateNetBalances(members: Traveler[], expenses: ExpenseItem[]) {
  const balances: Record<string, number> = {};
  members.forEach((m) => {
    balances[m.id] = 0;
  });

  expenses.forEach((exp) => {
    const paidBy = exp.paidById;
    const splitWith = exp.splitWithIds.length > 0 ? exp.splitWithIds : members.map((m) => m.id);
    const splitAmount = exp.amount / splitWith.length;

    // Credit payer
    if (balances[paidBy] !== undefined) {
      balances[paidBy] += exp.amount;
    }

    // Debit participants
    splitWith.forEach((id) => {
      if (balances[id] !== undefined) {
        balances[id] -= splitAmount;
      }
    });
  });

  return balances;
}

export function simplifyDebts(members: Traveler[], expenses: ExpenseItem[]): DebtSettlement[] {
  const balances = calculateNetBalances(members, expenses);

  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  Object.entries(balances).forEach(([id, bal]) => {
    const rounded = Math.round(bal * 100) / 100;
    if (rounded < -0.01) {
      debtors.push({ id, amount: -rounded });
    } else if (rounded > 0.01) {
      creditors.push({ id, amount: rounded });
    }
  });

  // Sort descending by amount
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements: DebtSettlement[] = [];

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
    const settleAmt = Math.min(debtor.amount, creditor.amount);

    if (settleAmt > 0.01) {
      settlements.push({
        fromMemberId: debtor.id,
        toMemberId: creditor.id,
        amount: Math.round(settleAmt * 100) / 100,
        settled: false,
      });
    }

    debtor.amount -= settleAmt;
    creditor.amount -= settleAmt;

    if (debtor.amount < 0.01) dIdx++;
    if (creditor.amount < 0.01) cIdx++;
  }

  return settlements;
}

export function formatCurrency(amount: number, currency: string = 'SGD'): string {
  const sym = currency === 'SGD' ? 'S$' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'JPY' ? '¥' : '$';
  return `${sym}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function generateWhatsAppSummary(trip: Trip, activeDay: DayPlan): string {
  const header = `🇸🇬 *${trip.title.toUpperCase()}*\n📅 Day ${activeDay.dayNumber} · ${activeDay.date}\n🌤️ Weather: ${activeDay.weather.temp} (${activeDay.weather.condition})\n`;

  const meetup = `\n📍 *CURRENT MEETUP BEACON*\nPlace: ${trip.meetupPoint.name}\nTime: ${trip.meetupPoint.time}\nNote: ${trip.meetupPoint.notes}\n`;

  let schedule = `\n🗓️ *TODAY'S SCHEDULE*\n`;
  activeDay.activities.forEach((act) => {
    const leader = trip.members.find((m) => m.id === act.assignedLeaderId)?.name || 'Crew';
    schedule += `• ${act.time}: *${act.title}*\n  📍 ${act.location} (Lead: ${leader})\n`;
  });

  const settlements = simplifyDebts(trip.members, trip.expenses);
  let debts = `\n💰 *FAIRSHARE EXPENSE SPLITS*\n`;
  if (settlements.length === 0) {
    debts += `All group balances currently even lah!\n`;
  } else {
    settlements.slice(0, 4).forEach((s) => {
      const from = trip.members.find((m) => m.id === s.fromMemberId)?.name || 'Someone';
      const to = trip.members.find((m) => m.id === s.toMemberId)?.name || 'Someone';
      debts += `• ${from} ➡️ ${to}: ${formatCurrency(s.amount, trip.currency)}\n`;
    });
  }

  const footer = `\n📲 _Generated via CrewVoyage Singapore Group Hub_`;

  return `${header}${meetup}${schedule}${debts}${footer}`;
}
