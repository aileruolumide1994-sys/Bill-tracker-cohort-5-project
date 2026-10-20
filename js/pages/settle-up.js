// Settle Up page: shows the fewest payments needed to clear every debt.
import { getTeam, membersOf } from "../core/state.js";
import { createSettlementPlan } from "../core/calc.js";
import { initPage, heading, onAction, renderNoTeam, teamBalances } from "../core/shell.js";
import { openPaymentForm } from "../features/forms.js";
import { escapeHtml, formatMoney } from "../utils/format.js";

const pageContent = document.getElementById("pageContent");
let plan = [];

// Build the HTML for one suggested payment
function paymentRowHtml(payment, number, names) {
  return `
    <div class="row-item">
      <div class="row-icon">${number}</div>
      <div class="row-main">
        <b>${escapeHtml(names[payment.from])}</b> pays <b>${escapeHtml(names[payment.to])}</b>
      </div>
      <b>${formatMoney(payment.amount)}</b>
      <button class="btn btn-sm btn-navy" data-action="record" data-i="${number - 1}">Record</button>
    </div>`;
}

function render() {
  const team = getTeam();
  if (!team) {
    renderNoTeam(pageContent);
    return;
  }

  // Look up a member's name from their id
  const names = {};
  for (const member of membersOf(team, true)) {
    names[member.id] = member.name;
  }

  plan = createSettlementPlan(teamBalances(team));

  let body = "";
  if (plan.length === 0) {
    body = `<div class="empty-state"><i class="bi bi-check-circle"></i>All settled. Nobody owes anything.</div>`;
  } else {
    const plural = plan.length > 1 ? "s" : "";
    body = `<p class="text-secondary small">${plan.length} payment${plural} clear every debt.</p>`;
    for (let i = 0; i < plan.length; i++) {
      body = body + paymentRowHtml(plan[i], i + 1, names);
    }
  }

  pageContent.innerHTML = heading("Settle up") + `<div class="panel">${body}</div>`;
}

// When a "Record" button is clicked, open the payment form pre-filled
onAction(pageContent, {
  record: function (data) {
    openPaymentForm(plan[Number(data.i)]);
  },
});

initPage({ onRender: render });
