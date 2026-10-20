// The three forms used on several pages: expense/claim, payment, member.
import { state, commit, getTeam, membersOf, logActivity } from "../core/state.js";
import { splitExpense } from "../core/calc.js";
import { getRate, loadRates } from "../core/rates.js";
import { refresh, teamBalances } from "../core/shell.js";
import { openModal, confirmDialog } from "../utils/modal.js";
import { showNotification } from "../utils/notification.js";
import { createId, escapeHtml, formatMoney, today, initials } from "../utils/format.js";

export const CATEGORIES = ["Stationery", "Internet", "Cleaning", "Software Subscription", "Travel", "Food & Refreshments", "Equipment", "Other"];
const CURRENCIES = ["NGN", "USD", "EUR", "GBP", "CAD", "GHS", "ZAR", "KES"];
const $ = (id) => document.getElementById(id);
const options = (items, selected) => items.map(([v, label]) => `<option value="${escapeHtml(v)}" ${v === selected ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
const radio = (name, value, label, checked) =>
  `<input type="radio" class="btn-check" name="${name}" id="${name}-${value}" value="${value}" ${checked ? "checked" : ""}><label class="btn btn-outline-secondary btn-sm" for="${name}-${value}">${label}</label>`;

function needTeam() {
  const team = getTeam();
  if (!team) showNotification("Create a team first.", "warning");
  return team;
}

/* ---------------- Expense / claim ---------------- */
export function openExpenseForm(id) {
  const team = needTeam(); if (!team) return;
  const active = membersOf(team);
  if (!active.length) return showNotification("Add team members first (Team Members page).", "warning");

  const old = state.data.expenses.find((e) => e.id === id);
  const e = old ?? { kind: "expense", title: "", originalAmount: "", currency: "NGN", date: today(), category: CATEGORIES[0],
    payerId: active[0].id, split: "equal", participants: active.map((m) => m.id), raw: {} };
  // keep archived members visible only if this record already uses them
  const list = membersOf(team, true).filter((m) => m.active !== false || e.participants.includes(m.id) || m.id === e.payerId);
  const rateFor = (cur) => (cur === "NGN" ? 1 : old?.currency === cur ? old.rate : getRate(cur));

  const body = openModal({
    title: old ? "Edit expense" : "Record expense or claim", size: "modal-lg", okText: "Save",
    body: `
      <div class="btn-group w-100 mb-2">${radio("exKind", "expense", "Expense", e.kind === "expense")}${radio("exKind", "claim", "Reimbursement claim", e.kind === "claim")}</div>
      <label class="form-label small mb-1" for="exTitle">Title / purpose</label>
      <input class="form-control mb-2" id="exTitle" maxlength="80" value="${escapeHtml(e.title)}">
      <div class="row g-2"><div class="col-7"><label class="form-label small mb-1" for="exAmount">Amount</label>
        <input class="form-control" id="exAmount" type="number" step="0.01" min="0" inputmode="decimal" value="${e.originalAmount}"></div>
        <div class="col-5"><label class="form-label small mb-1" for="exCurrency">Currency</label>
        <select class="form-select" id="exCurrency">${options(CURRENCIES.map((c) => [c, c]), e.currency)}</select></div></div>
      <div id="exRateInfo" class="small text-secondary my-1"></div>
      <div class="row g-2 mb-2"><div class="col-6"><label class="form-label small mb-1" for="exDate">Date</label>
        <input class="form-control" id="exDate" type="date" value="${e.date}"></div>
        <div class="col-6"><label class="form-label small mb-1" for="exCategory">Category</label>
        <select class="form-select" id="exCategory">${options(CATEGORIES.map((c) => [c, c]), e.category)}</select></div></div>
      <label class="form-label small mb-1" for="exPayer">Paid by / claimed by</label>
      <select class="form-select mb-2" id="exPayer">${options(list.map((m) => [m.id, m.name]), e.payerId)}</select>
      <div class="btn-group w-100 mb-2">${radio("exSplit", "equal", "Equal", e.split === "equal")}${radio("exSplit", "exact", "Exact amounts", e.split === "exact")}${radio("exSplit", "percent", "Percentage", e.split === "percent")}</div>
      ${list.map((m) => `<div class="d-flex align-items-center gap-2 py-1">
        <input type="checkbox" class="form-check-input who" value="${m.id}" id="who-${m.id}" ${e.participants.includes(m.id) ? "checked" : ""}>
        <label class="flex-grow-1" for="who-${m.id}">${escapeHtml(m.name)}</label>
        <input type="number" step="0.01" class="form-control form-control-sm who-raw" data-id="${m.id}" style="width:90px" value="${e.raw?.[m.id] ?? ""}" aria-label="${escapeHtml(m.name)} value">
        <span class="who-share small fw-semibold text-end" data-id="${m.id}" style="min-width:90px"></span></div>`).join("")}
      <div id="exSumLine" class="small text-secondary mt-1"></div>`,
    onSubmit() {
      const f = readForm();
      if (f.error) return f.error;
      const rate = rateFor(f.currency);
      if (!rate) return `No exchange rate for ${f.currency}. Go online once or use NGN.`;
      const amount = Math.round((f.original * 100) / rate);
      const { shares, error } = splitExpense({ split: f.split, totalKobo: amount, original: f.original, currency: f.currency, ids: f.ids, raw: f.raw });
      if (error) return error;
      // Expenses are approved straight away; new claims wait for approval.
      const status = f.kind === "expense" ? "approved" : old?.kind === "claim" ? old.status : "pending";
      const record = { ...old, id: old?.id ?? createId(), teamId: team.id, kind: f.kind, status, title: f.title, category: f.category,
        date: f.date, payerId: f.payerId, originalAmount: f.original, currency: f.currency, rate, amount, split: f.split,
        participants: f.ids, raw: f.raw, shares };
      if (old) Object.assign(old, record); else state.data.expenses.push(record);
      logActivity(team, `${old ? "Updated" : "Added"} ${f.kind} “${f.title}” · ${formatMoney(amount)}`);
      commit(); refresh(); showNotification(f.kind === "claim" && status === "pending" ? "Claim submitted for approval." : "Expense saved.");
    },
  });

  function readForm() {
    const v = (x) => $(x).value;
    const ids = [...document.querySelectorAll(".who:checked")].map((x) => x.value);
    const raw = {};
    document.querySelectorAll(".who-raw").forEach((x) => (raw[x.dataset.id] = x.value));
    const title = v("exTitle").trim(), original = parseFloat(v("exAmount"));
    if (!title) return { error: "Title cannot be empty." };
    if (!(original > 0)) return { error: "Amount must be greater than 0." };
    if (!v("exDate")) return { error: "Pick a date." };
    return { title, original, ids, raw, kind: document.querySelector("[name=exKind]:checked").value, currency: v("exCurrency"),
      date: v("exDate"), category: v("exCategory"), payerId: v("exPayer"), split: document.querySelector("[name=exSplit]:checked").value };
  }

  function updatePreview() {
    const cur = $("exCurrency").value, split = document.querySelector("[name=exSplit]:checked").value;
    const amount = parseFloat($("exAmount").value) || 0, rate = rateFor(cur);
    const totalKobo = rate ? Math.round((amount * 100) / rate) : 0;
    document.querySelectorAll(".who-raw").forEach((x) => (x.style.display = split === "equal" ? "none" : ""));
    $("exRateInfo").textContent = cur === "NGN" ? "" : rate ? `≈ ${formatMoney(totalKobo)} (1 ${cur} = ${formatMoney(100 / rate)}; rate is saved with the expense)` : `No rate available for ${cur} – check your connection.`;
    const ids = [...document.querySelectorAll(".who:checked")].map((x) => x.value), raw = {};
    document.querySelectorAll(".who-raw").forEach((x) => (raw[x.dataset.id] = x.value));
    const { shares, error } = splitExpense({ split, totalKobo, original: amount, currency: cur, ids, raw });
    document.querySelectorAll(".who-share").forEach((s) => (s.textContent = shares?.[s.dataset.id] != null ? formatMoney(shares[s.dataset.id]) : ""));
    $("exSumLine").textContent = error ? (amount ? error : "") : "Shares add up to the total ✔";
  }
  body.oninput = updatePreview;
  updatePreview();
  loadRates().then(() => $("exAmount") && updatePreview());
}

/* ---------------- Payment between two members ---------------- */
export function openPaymentForm(pre = {}) {
  const team = needTeam(); if (!team) return;
  const ms = membersOf(team);
  if (ms.length < 2) return showNotification("You need at least two members to record a payment.", "warning");
  const opts = ms.map((m) => [m.id, m.name]);
  openModal({
    title: "Record a payment", okText: "Record payment",
    body: `<label class="form-label small mb-1" for="payFrom">Paid by</label><select class="form-select mb-2" id="payFrom">${options(opts, pre.from ?? ms[0].id)}</select>
      <label class="form-label small mb-1" for="payTo">Paid to</label><select class="form-select mb-2" id="payTo">${options(opts, pre.to ?? ms[1].id)}</select>
      <label class="form-label small mb-1" for="payAmount">Amount (NGN)</label><input class="form-control mb-2" id="payAmount" type="number" step="0.01" min="0" value="${pre.amount ? pre.amount / 100 : ""}">
      <label class="form-label small mb-1" for="payDate">Date</label><input class="form-control mb-2" id="payDate" type="date" value="${today()}">
      <label class="form-label small mb-1" for="payNote">Note (optional)</label><input class="form-control" id="payNote" maxlength="80">`,
    onSubmit() {
      const from = $("payFrom").value, to = $("payTo").value, amount = Math.round(parseFloat($("payAmount").value) * 100);
      if (from === to) return "Payer and receiver must be different people.";
      if (!(amount > 0)) return "Amount must be greater than 0.";
      state.data.payments.push({ id: createId(), teamId: team.id, from, to, amount, date: $("payDate").value || today(), note: $("payNote").value.trim() });
      const name = (id) => ms.find((m) => m.id === id).name;
      logActivity(team, `${name(from)} paid ${name(to)} ${formatMoney(amount)}`);
      commit(); refresh(); showNotification("Payment recorded.");
    },
  });
}

/* ---------------- Member ---------------- */
export function openMemberForm(member) {
  const team = needTeam(); if (!team) return;
  openModal({
    title: member ? "Edit member" : "Add member",
    body: `<label class="form-label small mb-1" for="memName">Name</label><input class="form-control mb-2" id="memName" maxlength="40" value="${escapeHtml(member?.name ?? "")}">
      <label class="form-label small mb-1" for="memRole">Role (optional)</label><input class="form-control" id="memRole" maxlength="40" value="${escapeHtml(member?.role ?? "")}">`,
    onSubmit() {
      const name = $("memName").value.trim(), role = $("memRole").value.trim();
      if (!name) return "Name cannot be empty.";
      if (membersOf(team).some((m) => m !== member && m.name.toLowerCase() === name.toLowerCase())) return "A member with this name already exists.";
      if (member) Object.assign(member, { name, role });
      else { state.data.members.push({ id: createId(), teamId: team.id, name, role, active: true }); logActivity(team, `Added member ${name}`); }
      commit(); refresh();
    },
  });
}

// Members with an unsettled balance can't be removed; others are archived (history is kept).
export function removeMember(id) {
  const team = getTeam(), member = state.data.members.find((m) => m.id === id);
  const net = teamBalances(team)[id]?.net ?? 0;
  if (net !== 0)
    return openModal({ title: "Cannot remove member", body: `<p class="mb-0"><b>${escapeHtml(member.name)}</b> ${net > 0 ? "is still owed" : "still owes"} <b>${formatMoney(Math.abs(net))}</b>. Record a payment first, then remove them.</p>` });
  confirmDialog(`Remove ${escapeHtml(member.name)}? Their past expenses stay in the history.`, () => { member.active = false; commit(); refresh(); }, "Remove");
}
export { initials };
