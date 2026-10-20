// The three pop-up forms used on several pages:
//   1. Expense / claim     2. Payment between members     3. Member
import { state, commit, getTeam, membersOf, logActivity } from "../core/state.js";
import { splitExpense } from "../core/calc.js";
import { getRate, loadRates } from "../core/rates.js";
import { refresh, teamBalances } from "../core/shell.js";
import { openModal, confirmDialog } from "../utils/modal.js";
import { showNotification } from "../utils/notification.js";
import { createId, escapeHtml, formatMoney, today, initials } from "../utils/format.js";

export const CATEGORIES = ["Stationery", "Internet", "Cleaning", "Software Subscription", "Travel", "Food & Refreshments", "Equipment", "Other"];
const CURRENCIES = ["NGN", "USD", "EUR", "GBP", "CAD", "GHS", "ZAR", "KES"];

function byId(id) {
  return document.getElementById(id);
}

// Build <option> tags. items is a list of [value, label] pairs.
function optionsHtml(items, selectedValue) {
  let html = "";
  for (const item of items) {
    const value = item[0];
    const label = item[1];
    const selected = value === selectedValue ? "selected" : "";
    html += `<option value="${escapeHtml(value)}" ${selected}>${escapeHtml(label)}</option>`;
  }
  return html;
}

// Turn a list of plain values into [value, value] pairs for optionsHtml
function pairs(values) {
  return values.map(function (v) { return [v, v]; });
}

// One button-style radio choice
function radioHtml(name, value, label, checked) {
  return `<input type="radio" class="btn-check" name="${name}" id="${name}-${value}" value="${value}" ${checked ? "checked" : ""}>
          <label class="btn btn-outline-secondary btn-sm" for="${name}-${value}">${label}</label>`;
}

// Most forms need a team. If there isn't one, tell the user.
function needTeam() {
  const team = getTeam();
  if (!team) showNotification("Create a team first.", "warning");
  return team;
}

// Which radio button is selected? e.g. getChecked("exKind") -> "expense"
function getChecked(name) {
  return document.querySelector("[name=" + name + "]:checked").value;
}

// Ids of all the members whose checkbox is ticked
function getCheckedMemberIds() {
  const ids = [];
  for (const box of document.querySelectorAll(".who:checked")) {
    ids.push(box.value);
  }
  return ids;
}

// What the user typed in each person's amount/percent box: { memberId: "text" }
function getRawValues() {
  const raw = {};
  for (const input of document.querySelectorAll(".who-raw")) {
    raw[input.dataset.id] = input.value;
  }
  return raw;
}

/* ================= 1. Expense / claim ================= */

// Pass an expense id to edit it, or nothing to add a new one.
export function openExpenseForm(id) {
  const team = needTeam();
  if (!team) return;

  const activeMembers = membersOf(team);
  if (activeMembers.length === 0) {
    showNotification("Add team members first (Team Members page).", "warning");
    return;
  }

  // The expense being edited (undefined when adding a new one)
  const oldExpense = state.data.expenses.find(function (e) { return e.id === id; });

  // Starting values for the form
  let expense = oldExpense;
  if (!expense) {
    expense = {
      kind: "expense",
      title: "",
      originalAmount: "",
      currency: "NGN",
      date: today(),
      category: CATEGORIES[0],
      payerId: activeMembers[0].id,
      split: "equal",
      participants: activeMembers.map(function (m) { return m.id; }),
      raw: {},
    };
  }
  const savedRaw = expense.raw || {};

  // Show archived members only if this expense already uses them
  const memberList = membersOf(team, true).filter(function (m) {
    const isActive = m.active !== false;
    const isUsed = expense.participants.includes(m.id) || m.id === expense.payerId;
    return isActive || isUsed;
  });

  // Which exchange rate to use for a currency?
  function rateFor(currency) {
    if (currency === "NGN") return 1;
    if (oldExpense && oldExpense.currency === currency) return oldExpense.rate; // keep the saved rate
    return getRate(currency);
  }

  // One row per member: checkbox, name, amount box, and their calculated share
  let memberRows = "";
  for (const m of memberList) {
    const checked = expense.participants.includes(m.id) ? "checked" : "";
    const rawValue = savedRaw[m.id] !== undefined ? savedRaw[m.id] : "";
    memberRows += `
      <div class="d-flex align-items-center gap-2 py-1">
        <input type="checkbox" class="form-check-input who" value="${m.id}" id="who-${m.id}" ${checked}>
        <label class="flex-grow-1" for="who-${m.id}">${escapeHtml(m.name)}</label>
        <input type="number" step="0.01" class="form-control form-control-sm who-raw" data-id="${m.id}"
               style="width:90px" value="${rawValue}" aria-label="${escapeHtml(m.name)} value">
        <span class="who-share small fw-semibold text-end" data-id="${m.id}" style="min-width:90px"></span>
      </div>`;
  }

  const formHtml = `
    <div class="btn-group w-100 mb-2">
      ${radioHtml("exKind", "expense", "Expense", expense.kind === "expense")}
      ${radioHtml("exKind", "claim", "Reimbursement claim", expense.kind === "claim")}
    </div>
    <label class="form-label small mb-1" for="exTitle">Title / purpose</label>
    <input class="form-control mb-2" id="exTitle" maxlength="80" value="${escapeHtml(expense.title)}">
    <div class="row g-2">
      <div class="col-7">
        <label class="form-label small mb-1" for="exAmount">Amount</label>
        <input class="form-control" id="exAmount" type="number" step="0.01" min="0" inputmode="decimal" value="${expense.originalAmount}">
      </div>
      <div class="col-5">
        <label class="form-label small mb-1" for="exCurrency">Currency</label>
        <select class="form-select" id="exCurrency">${optionsHtml(pairs(CURRENCIES), expense.currency)}</select>
      </div>
    </div>
    <div id="exRateInfo" class="small text-secondary my-1"></div>
    <div class="row g-2 mb-2">
      <div class="col-6">
        <label class="form-label small mb-1" for="exDate">Date</label>
        <input class="form-control" id="exDate" type="date" value="${expense.date}">
      </div>
      <div class="col-6">
        <label class="form-label small mb-1" for="exCategory">Category</label>
        <select class="form-select" id="exCategory">${optionsHtml(pairs(CATEGORIES), expense.category)}</select>
      </div>
    </div>
    <label class="form-label small mb-1" for="exPayer">Paid by / claimed by</label>
    <select class="form-select mb-2" id="exPayer">
      ${optionsHtml(memberList.map(function (m) { return [m.id, m.name]; }), expense.payerId)}
    </select>
    <div class="btn-group w-100 mb-2">
      ${radioHtml("exSplit", "equal", "Equal", expense.split === "equal")}
      ${radioHtml("exSplit", "exact", "Exact amounts", expense.split === "exact")}
      ${radioHtml("exSplit", "percent", "Percentage", expense.split === "percent")}
    </div>
    ${memberRows}
    <div id="exSumLine" class="small text-secondary mt-1"></div>`;

  // Read everything the user entered. Returns { error } if something is missing.
  function readForm() {
    const title = byId("exTitle").value.trim();
    const original = parseFloat(byId("exAmount").value);

    if (!title) return { error: "Title cannot be empty." };
    if (!(original > 0)) return { error: "Amount must be greater than 0." };
    if (!byId("exDate").value) return { error: "Pick a date." };

    return {
      title: title,
      original: original,
      ids: getCheckedMemberIds(),
      raw: getRawValues(),
      kind: getChecked("exKind"),
      currency: byId("exCurrency").value,
      date: byId("exDate").value,
      category: byId("exCategory").value,
      payerId: byId("exPayer").value,
      split: getChecked("exSplit"),
    };
  }

  // Runs when the user clicks Save
  function save() {
    const form = readForm();
    if (form.error) return form.error;

    const rate = rateFor(form.currency);
    if (!rate) return "No exchange rate for " + form.currency + ". Go online once or use NGN.";

    // Convert to kobo in NGN
    const amount = Math.round((form.original * 100) / rate);

    const result = splitExpense({
      split: form.split,
      totalKobo: amount,
      original: form.original,
      currency: form.currency,
      ids: form.ids,
      raw: form.raw,
    });
    if (result.error) return result.error;

    // Expenses are approved straight away. New claims wait for approval.
    let status = "pending";
    if (form.kind === "expense") {
      status = "approved";
    } else if (oldExpense && oldExpense.kind === "claim") {
      status = oldExpense.status; // keep the claim's current status when editing
    }

    const record = {
      id: oldExpense ? oldExpense.id : createId(),
      teamId: team.id,
      kind: form.kind,
      status: status,
      title: form.title,
      category: form.category,
      date: form.date,
      payerId: form.payerId,
      originalAmount: form.original,
      currency: form.currency,
      rate: rate,
      amount: amount,
      split: form.split,
      participants: form.ids,
      raw: form.raw,
      shares: result.shares,
    };

    if (oldExpense) {
      Object.assign(oldExpense, record); // update in place
    } else {
      state.data.expenses.push(record);
    }

    const verb = oldExpense ? "Updated" : "Added";
    logActivity(team, verb + " " + form.kind + " “" + form.title + "” · " + formatMoney(amount));
    commit();
    refresh();

    if (form.kind === "claim" && status === "pending") {
      showNotification("Claim submitted for approval.");
    } else {
      showNotification("Expense saved.");
    }
  }

  const modalBody = openModal({
    title: oldExpense ? "Edit expense" : "Record expense or claim",
    size: "modal-lg",
    okText: "Save",
    body: formHtml,
    onSubmit: save,
  });

  // Update the live preview (converted amount and each person's share)
  function updatePreview() {
    const currency = byId("exCurrency").value;
    const split = getChecked("exSplit");
    const amount = parseFloat(byId("exAmount").value) || 0;
    const rate = rateFor(currency);

    let totalKobo = 0;
    if (rate) totalKobo = Math.round((amount * 100) / rate);

    // Only show the amount/percent boxes when the split isn't equal
    for (const input of document.querySelectorAll(".who-raw")) {
      input.style.display = split === "equal" ? "none" : "";
    }

    // Exchange rate message
    let rateText = "";
    if (currency !== "NGN") {
      if (rate) {
        rateText = "≈ " + formatMoney(totalKobo) + " (1 " + currency + " = " + formatMoney(100 / rate) + "; rate is saved with the expense)";
      } else {
        rateText = "No rate available for " + currency + " – check your connection.";
      }
    }
    byId("exRateInfo").textContent = rateText;

    // Each person's share
    const result = splitExpense({
      split: split,
      totalKobo: totalKobo,
      original: amount,
      currency: currency,
      ids: getCheckedMemberIds(),
      raw: getRawValues(),
    });

    for (const span of document.querySelectorAll(".who-share")) {
      const share = result.shares ? result.shares[span.dataset.id] : undefined;
      span.textContent = share !== undefined ? formatMoney(share) : "";
    }

    // The message under the list
    let sumText = "Shares add up to the total ✔";
    if (result.error) {
      sumText = amount ? result.error : "";
    }
    byId("exSumLine").textContent = sumText;
  }

  modalBody.oninput = updatePreview;
  updatePreview();

  // Fetch exchange rates, then refresh the preview if the form is still open
  loadRates().then(function () {
    if (byId("exAmount")) updatePreview();
  });
}

/* ================= 2. Payment between two members ================= */

// Pass { from, to, amount } to pre-fill the form (used by the Settle Up page).
export function openPaymentForm(prefill = {}) {
  const team = needTeam();
  if (!team) return;

  const members = membersOf(team);
  if (members.length < 2) {
    showNotification("You need at least two members to record a payment.", "warning");
    return;
  }

  const memberOptions = members.map(function (m) { return [m.id, m.name]; });
  const fromId = prefill.from || members[0].id;
  const toId = prefill.to || members[1].id;
  const amountText = prefill.amount ? prefill.amount / 100 : "";

  function nameOf(id) {
    return members.find(function (m) { return m.id === id; }).name;
  }

  function save() {
    const from = byId("payFrom").value;
    const to = byId("payTo").value;
    const amount = Math.round(parseFloat(byId("payAmount").value) * 100);

    if (from === to) return "Payer and receiver must be different people.";
    if (!(amount > 0)) return "Amount must be greater than 0.";

    state.data.payments.push({
      id: createId(),
      teamId: team.id,
      from: from,
      to: to,
      amount: amount,
      date: byId("payDate").value || today(),
      note: byId("payNote").value.trim(),
    });

    logActivity(team, nameOf(from) + " paid " + nameOf(to) + " " + formatMoney(amount));
    commit();
    refresh();
    showNotification("Payment recorded.");
  }

  openModal({
    title: "Record a payment",
    okText: "Record payment",
    body: `
      <label class="form-label small mb-1" for="payFrom">Paid by</label>
      <select class="form-select mb-2" id="payFrom">${optionsHtml(memberOptions, fromId)}</select>
      <label class="form-label small mb-1" for="payTo">Paid to</label>
      <select class="form-select mb-2" id="payTo">${optionsHtml(memberOptions, toId)}</select>
      <label class="form-label small mb-1" for="payAmount">Amount (NGN)</label>
      <input class="form-control mb-2" id="payAmount" type="number" step="0.01" min="0" value="${amountText}">
      <label class="form-label small mb-1" for="payDate">Date</label>
      <input class="form-control mb-2" id="payDate" type="date" value="${today()}">
      <label class="form-label small mb-1" for="payNote">Note (optional)</label>
      <input class="form-control" id="payNote" maxlength="80">`,
    onSubmit: save,
  });
}

/* ================= 3. Member ================= */

// Pass a member to edit them, or nothing to add a new one.
export function openMemberForm(member) {
  const team = needTeam();
  if (!team) return;

  const currentName = member ? member.name : "";
  const currentRole = member && member.role ? member.role : "";

  function save() {
    const name = byId("memName").value.trim();
    const role = byId("memRole").value.trim();
    if (!name) return "Name cannot be empty.";

    // Don't allow two members with the same name
    const nameTaken = membersOf(team).some(function (m) {
      return m !== member && m.name.toLowerCase() === name.toLowerCase();
    });
    if (nameTaken) return "A member with this name already exists.";

    if (member) {
      member.name = name;
      member.role = role;
    } else {
      state.data.members.push({ id: createId(), teamId: team.id, name: name, role: role, active: true });
      logActivity(team, "Added member " + name);
    }

    commit();
    refresh();
  }

  openModal({
    title: member ? "Edit member" : "Add member",
    body: `
      <label class="form-label small mb-1" for="memName">Name</label>
      <input class="form-control mb-2" id="memName" maxlength="40" value="${escapeHtml(currentName)}">
      <label class="form-label small mb-1" for="memRole">Role (optional)</label>
      <input class="form-control" id="memRole" maxlength="40" value="${escapeHtml(currentRole)}">`,
    onSubmit: save,
  });
}

// Members who still owe (or are owed) money can't be removed.
// Everyone else is "archived" so their history is kept.
export function removeMember(id) {
  const team = getTeam();
  const member = state.data.members.find(function (m) { return m.id === id; });

  const balances = teamBalances(team);
  const net = balances[id] ? balances[id].net : 0;

  if (net !== 0) {
    const situation = net > 0 ? "is still owed" : "still owes";
    openModal({
      title: "Cannot remove member",
      body: `<p class="mb-0"><b>${escapeHtml(member.name)}</b> ${situation} <b>${formatMoney(Math.abs(net))}</b>. Record a payment first, then remove them.</p>`,
    });
    return;
  }

  confirmDialog(
    "Remove " + escapeHtml(member.name) + "? Their past expenses stay in the history.",
    function () {
      member.active = false;
      commit();
      refresh();
    },
    "Remove"
  );
}

export { initials };
