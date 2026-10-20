// Payments page: a list of money paid between team members.
import { state, commit, getTeam, membersOf, paymentsOf } from "../core/state.js";
import { initPage, heading, onAction, renderNoTeam, refresh } from "../core/shell.js";
import { openPaymentForm } from "../features/forms.js";
import { confirmDialog } from "../utils/modal.js";
import { escapeHtml, formatMoney, formatDate } from "../utils/format.js";

const pageContent = document.getElementById("pageContent");

// HTML for one payment in the list
function paymentRowHtml(payment, names) {
  let note = "";
  if (payment.note) {
    note = " · " + escapeHtml(payment.note);
  }

  return `
    <div class="row-item">
      <div class="row-icon"><i class="bi bi-cash-stack"></i></div>
      <div class="row-main">
        <div class="fw-semibold">${escapeHtml(names[payment.from])} paid ${escapeHtml(names[payment.to])}</div>
        <div class="small text-secondary">${formatDate(payment.date)}${note}</div>
      </div>
      <div class="text-end">
        <b class="pos">${formatMoney(payment.amount)}</b>
        <div><button class="btn btn-sm btn-link text-danger p-0" data-action="delete" data-id="${payment.id}">Delete</button></div>
      </div>
    </div>`;
}

function render() {
  const team = getTeam();
  if (!team) {
    renderNoTeam(pageContent);
    return;
  }

  // Look up member names by id
  const names = {};
  for (const member of membersOf(team, true)) {
    names[member.id] = member.name;
  }

  // Newest payment first
  const payments = paymentsOf(team).slice();
  payments.sort(function (a, b) {
    return b.date.localeCompare(a.date);
  });

  let body = "";
  if (payments.length === 0) {
    body = `<div class="empty-state"><i class="bi bi-cash-stack"></i>No payments yet. Record one when someone pays a teammate.</div>`;
  } else {
    for (const payment of payments) {
      body += paymentRowHtml(payment, names);
    }
  }

  pageContent.innerHTML =
    heading("Payments", `<button class="btn btn-navy" data-action="add"><i class="bi bi-plus-lg"></i> Record payment</button>`) +
    `<div class="panel">${body}</div>`;
}

onAction(pageContent, {
  add: function () {
    openPaymentForm();
  },
  delete: function (data) {
    confirmDialog("Delete this payment record? Balances will update.", function () {
      state.data.payments = state.data.payments.filter(function (p) {
        return p.id !== data.id;
      });
      commit();
      refresh();
    });
  },
});

initPage({ onRender: render });
