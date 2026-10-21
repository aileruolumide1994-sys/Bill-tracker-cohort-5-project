// Pure money logic (no DOM) — easy to test.
import { formatMoney } from "../utils/format.js";

// Split `total` (whole kobo) by weights. Leftover kobo go to the biggest remainders,
// so the shares ALWAYS add up exactly to the total.
export function allocate(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!sum) return weights.map(() => 0);
  const parts = weights.map((w, i) => {
    const x = (total * w) / sum;
    return { i, floor: Math.floor(x), rest: x - Math.floor(x) };
  });
  let left = total - parts.reduce((s, p) => s + p.floor, 0);
  [...parts].sort((a, b) => b.rest - a.rest).forEach((p) => { if (left > 0) { p.floor++; left--; } });
  return parts.map((p) => p.floor);
}

// split: "equal" | "exact" (amounts in the expense currency) | "percent"
export function splitExpense({ split, totalKobo, original, currency, ids, raw }) {
  if (!ids.length) return { error: "Select at least one member to share this." };
  let weights = ids.map(() => 1);
  if (split !== "equal") {
    weights = ids.map((id) => parseFloat(raw[id]) || 0);
    const sum = weights.reduce((a, b) => a + b, 0);
    if (weights.some((w) => w < 0)) return { error: "Values cannot be negative." };
    if (split === "exact" && Math.round(sum * 100) !== Math.round(original * 100))
      return { error: `Exact amounts total ${formatMoney(sum * 100, currency)} but must equal ${formatMoney(original * 100, currency)}.` };
    if (split === "percent" && Math.abs(sum - 100) > 1e-6)
      return { error: `Percentages total ${+sum.toFixed(4)}% but must equal 100%.` };
  }
  const amounts = allocate(totalKobo, weights);
  return { shares: Object.fromEntries(ids.map((id, i) => [id, amounts[i]])) };
}

// net > 0: the team owes them money. net < 0: they owe the team.
// Only APPROVED expenses count (pending / rejected claims don't move balances).
export function calculateBalances(members, expenses, payments) {
  const b = {};
  const row = (id) => (b[id] ??= { paid: 0, share: 0, settled: 0, net: 0 });
  members.forEach((m) => row(m.id));
  expenses.filter((e) => e.status === "approved").forEach((e) => {
    row(e.payerId).paid += e.amount;
    for (const id in e.shares) row(id).share += e.shares[id];
  });
  payments.forEach((p) => { row(p.from).settled += p.amount; row(p.to).settled -= p.amount; });
  for (const id in b) b[id].net = b[id].paid - b[id].share + b[id].settled;
  return b;
}

// Match the biggest debtor with the biggest creditor until everyone is at zero.
export function createSettlementPlan(balances) {
  const credit = [], debt = [], plan = [];
  for (const id in balances) {
    if (balances[id].net > 0) credit.push([id, balances[id].net]);
    else if (balances[id].net < 0) debt.push([id, -balances[id].net]);
  }
  while (credit.length && debt.length) {
    credit.sort((a, b) => b[1] - a[1]);
    debt.sort((a, b) => b[1] - a[1]);
    const amount = Math.min(credit[0][1], debt[0][1]);
    plan.push({ from: debt[0][0], to: credit[0][0], amount });
    credit[0][1] -= amount; debt[0][1] -= amount;
    if (!credit[0][1]) credit.shift();
    if (!debt[0][1]) debt.shift();
  }
  return plan;
}
