// Team Balances page
import { getTeam, membersOf } from "../core/state.js";
import { initPage, heading, onAction, renderNoTeam, teamBalances, balanceBadge, pagesPath } from "../core/shell.js";
import { escapeHtml, formatMoney } from "../utils/format.js";

const el = document.getElementById("pageContent");
const signed = (n) => (n > 0 ? "+" : "") + formatMoney(n);

function render() {
  const team = getTeam();
  if (!team) return renderNoTeam(el);
  const b = teamBalances(team);
  const members = membersOf(team, true).filter((m) => m.active !== false || b[m.id].net !== 0);
  const owed = members.reduce((s, m) => s + Math.max(b[m.id].net, 0), 0);
  const owes = members.reduce((s, m) => s - Math.min(b[m.id].net, 0), 0);
  const card = (label, value, cls = "") => `<div class="col-12 col-md-4"><div class="panel mb-0"><small class="text-secondary">${label}</small><div class="fs-5 fw-bold ${cls}">${formatMoney(value)}</div></div></div>`;
  el.innerHTML = heading("Team balances", `<button class="btn btn-navy" data-action="settle">Settle up</button>`) +
    `<div class="row g-3 mb-3">${card("Owed to members", owed, "pos")}${card("Outstanding debts", owes, "neg")}${card("Net total", owed - owes)}</div>
    <div class="panel table-responsive">${members.length ? `<table class="table align-middle mb-0"><thead><tr><th>Member</th><th class="text-end">Paid / claimed</th><th class="text-end">Share</th><th class="text-end">Settled</th><th class="text-end">Net</th><th>Status</th></tr></thead><tbody>
      ${members.map((m) => { const x = b[m.id]; return `<tr><td><b>${escapeHtml(m.name)}</b><div class="small text-secondary">${escapeHtml(m.role || "")}</div></td>
        <td class="text-end">${formatMoney(x.paid)}</td><td class="text-end">${formatMoney(x.share)}</td><td class="text-end">${formatMoney(x.settled)}</td>
        <td class="text-end ${x.net > 0 ? "pos" : x.net < 0 ? "neg" : ""}">${signed(x.net)}</td><td>${balanceBadge(x.net)}</td></tr>`; }).join("")}</tbody></table>`
      : `<div class="empty-state"><i class="bi bi-people"></i>No members yet. Add your team first.</div>`}</div>`;
}

onAction(el, { settle: () => (location.href = `${pagesPath}settle-up.html`) });
initPage({ onRender: render });
