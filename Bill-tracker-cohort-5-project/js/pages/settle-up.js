// Settle Up page: the fewest payments that clear every debt
import { getTeam, membersOf } from "../core/state.js";
import { createSettlementPlan } from "../core/calc.js";
import { initPage, heading, onAction, renderNoTeam, teamBalances } from "../core/shell.js";
import { openPaymentForm } from "../features/forms.js";
import { escapeHtml, formatMoney } from "../utils/format.js";

const el = document.getElementById("pageContent");
let plan = [];

function render() {
  const team = getTeam();
  if (!team) return renderNoTeam(el);
  const names = Object.fromEntries(membersOf(team, true).map((m) => [m.id, m.name]));
  plan = createSettlementPlan(teamBalances(team));
  el.innerHTML = heading("Settle up") + `<div class="panel">${plan.length
    ? `<p class="text-secondary small">${plan.length} payment${plan.length > 1 ? "s" : ""} clear every debt.</p>` +
      plan.map((p, i) => `<div class="row-item"><div class="row-icon">${i + 1}</div>
        <div class="row-main"><b>${escapeHtml(names[p.from])}</b> pays <b>${escapeHtml(names[p.to])}</b></div><b>${formatMoney(p.amount)}</b>
        <button class="btn btn-sm btn-navy" data-action="record" data-i="${i}">Record</button></div>`).join("")
    : `<div class="empty-state"><i class="bi bi-check-circle"></i>All settled. Nobody owes anything.</div>`}</div>`;
}

onAction(el, { record: ({ i }) => openPaymentForm(plan[+i]) });
initPage({ onRender: render });
