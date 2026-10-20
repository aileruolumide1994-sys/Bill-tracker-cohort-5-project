// All the money maths lives here. It never touches the page (no DOM),
// which makes it easy to understand and test.
import { formatMoney } from "../utils/format.js";

// Split `total` kobo between people according to `weights`.
// Example: allocate(100, [1, 1, 1]) -> [34, 33, 33]
// Dividing can leave leftover kobo, so we hand them out one at a time
// to whoever had the biggest remainder. The parts always add up to the total.
export function allocate(total, weights) {
  let weightSum = 0;
  for (const weight of weights) {
    weightSum = weightSum + weight;
  }
  if (weightSum === 0) {
    return weights.map(function () { return 0; });
  }

  // Step 1: give everyone their share rounded DOWN
  const parts = [];
  let given = 0;
  for (let i = 0; i < weights.length; i++) {
    const exactShare = (total * weights[i]) / weightSum;
    const rounded = Math.floor(exactShare);
    parts.push({ index: i, amount: rounded, remainder: exactShare - rounded });
    given = given + rounded;
  }

  // Step 2: hand out leftover kobo, biggest remainder first
  let leftover = total - given;
  const byRemainder = parts.slice().sort(function (a, b) {
    return b.remainder - a.remainder;
  });
  for (const part of byRemainder) {
    if (leftover > 0) {
      part.amount = part.amount + 1;
      leftover = leftover - 1;
    }
  }

  return parts.map(function (part) { return part.amount; });
}

// Work out how much each person owes for one expense.
// split is "equal", "exact" (amounts) or "percent".
// Returns { shares: { memberId: kobo } } or { error: "message" }
export function splitExpense({ split, totalKobo, original, currency, ids, raw }) {
  if (ids.length === 0) {
    return { error: "Select at least one member to share this." };
  }

  // Equal split: everyone gets weight 1
  let weights = ids.map(function () { return 1; });

  if (split !== "equal") {
    // Read what the user typed for each person
    weights = ids.map(function (id) {
      return parseFloat(raw[id]) || 0;
    });

    let sum = 0;
    for (const weight of weights) {
      if (weight < 0) return { error: "Values cannot be negative." };
      sum = sum + weight;
    }

    if (split === "exact" && Math.round(sum * 100) !== Math.round(original * 100)) {
      return {
        error:
          "Exact amounts total " + formatMoney(sum * 100, currency) +
          " but must equal " + formatMoney(original * 100, currency) + ".",
      };
    }
    if (split === "percent" && Math.abs(sum - 100) > 0.000001) {
      return { error: "Percentages total " + sum.toFixed(2) + "% but must equal 100%." };
    }
  }

  const amounts = allocate(totalKobo, weights);
  const shares = {};
  for (let i = 0; i < ids.length; i++) {
    shares[ids[i]] = amounts[i];
  }
  return { shares: shares };
}

// Work out each member's balance.
//   net > 0  -> the team owes them money
//   net < 0  -> they owe the team money
// Only APPROVED expenses count.
export function calculateBalances(members, expenses, payments) {
  const balances = {};

  // Make sure a person has a balance row, then return it
  function getRow(id) {
    if (!balances[id]) {
      balances[id] = { paid: 0, share: 0, settled: 0, net: 0 };
    }
    return balances[id];
  }

  for (const member of members) {
    getRow(member.id);
  }

  for (const expense of expenses) {
    if (expense.status !== "approved") continue; // skip pending/rejected

    getRow(expense.payerId).paid += expense.amount;
    for (const id in expense.shares) {
      getRow(id).share += expense.shares[id];
    }
  }

  for (const payment of payments) {
    getRow(payment.from).settled += payment.amount;
    getRow(payment.to).settled -= payment.amount;
  }

  for (const id in balances) {
    const row = balances[id];
    row.net = row.paid - row.share + row.settled;
  }

  return balances;
}

// Suggest who should pay whom so everyone ends at zero.
// Idea: repeatedly match the biggest debtor with the biggest creditor.
export function createSettlementPlan(balances) {
  const creditors = []; // people owed money: { id, amount }
  const debtors = [];   // people who owe money: { id, amount }
  const plan = [];

  for (const id in balances) {
    const net = balances[id].net;
    if (net > 0) creditors.push({ id: id, amount: net });
    if (net < 0) debtors.push({ id: id, amount: -net });
  }

  const biggestFirst = function (a, b) { return b.amount - a.amount; };

  while (creditors.length > 0 && debtors.length > 0) {
    creditors.sort(biggestFirst);
    debtors.sort(biggestFirst);

    const creditor = creditors[0];
    const debtor = debtors[0];
    const amount = Math.min(creditor.amount, debtor.amount);

    plan.push({ from: debtor.id, to: creditor.id, amount: amount });

    creditor.amount -= amount;
    debtor.amount -= amount;

    // Anyone who reached zero is finished - remove them
    if (creditor.amount === 0) creditors.shift();
    if (debtor.amount === 0) debtors.shift();
  }

  return plan;
}
