// Payments page
import { state, commit, getTeam, membersOf, paymentsOf } from "../core/state.js";
import { initPage, heading, onAction, renderNoTeam, refresh } from "../core/shell.js";
import { openPaymentForm } from "../features/forms.js";
import { confirmDialog } from "../utils/modal.js";
import { escapeHtml, formatMoney, formatDate } from "../utils/format.js";

const el = document.getElementById("pageContent");

function render() {
  const team = getTeam();
  if (!team) return renderNoTeam(el);
  const names = Object.fromEntries(membersOf(team, true).map((m) => [m.id, m.name]));
  const list = [...paymentsOf(team)].sort((a, b) => b.date.localeCompare(a.date));
  el.innerHTML = heading("Payments", `<button class="btn btn-navy" data-action="add"><i class="bi bi-plus-lg"></i> Record payment</button>`) +
    `<div class="panel">${list.length ? list.map((p) => `<div class="row-item"><div class="row-icon"><i class="bi bi-cash-stack"></i></div>
      <div class="row-main"><div class="fw-semibold">${escapeHtml(names[p.from])} paid ${escapeHtml(names[p.to])}</div>
        <div class="small text-secondary">${formatDate(p.date)}${p.note ? " · " + escapeHtml(p.note) : ""}</div></div>
      <div class="text-end"><b class="pos">${formatMoney(p.amount)}</b><div><button class="btn btn-sm btn-link text-danger p-0" data-action="delete" data-id="${p.id}">Delete</button></div></div></div>`).join("")
      : `<div class="empty-state"><i class="bi bi-cash-stack"></i>No payments yet. Record one when someone pays a teammate.</div>`}</div>`;
}

onAction(el, {
  add: () => openPaymentForm(),
  delete: ({ id }) => confirmDialog("Delete this payment record? Balances will update.", () => {
    state.data.payments = state.data.payments.filter((p) => p.id !== id);
    commit(); refresh();
  }),
});
initPage({ onRender: render });
