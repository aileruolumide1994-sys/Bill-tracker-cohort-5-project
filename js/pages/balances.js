// Team Balances page: who is owed money and who owes money.
import { getTeam, membersOf } from "../core/state.js";
import { initPage, heading, onAction, renderNoTeam, teamBalances, balanceBadge, pagesPath } from "../core/shell.js";
import { escapeHtml, formatMoney } from "../utils/format.js";

const pageContent = document.getElementById("pageContent");

// Show a "+" in front of positive amounts
function signedMoney(amount) {
  const sign = amount > 0 ? "+" : "";
  return sign + formatMoney(amount);
}

// Pick a CSS class for the net amount: green, red, or none
function netClass(net) {
  if (net > 0) return "pos";
  if (net < 0) return "neg";
  return "";
}

// One summary card at the top of the page
function summaryCard(label, value, cssClass = "") {
  return `
    <div class="col-12 col-md-4">
      <div class="panel mb-0">
        <small class="text-secondary">${label}</small>
        <div class="fs-5 fw-bold ${cssClass}">${formatMoney(value)}</div>
      </div>
    </div>`;
}

// One table row for one member
function memberRowHtml(member, row) {
  return `
    <tr>
      <td><b>${escapeHtml(member.name)}</b><div class="small text-secondary">${escapeHtml(member.role || "")}</div></td>
      <td class="text-end">${formatMoney(row.paid)}</td>
      <td class="text-end">${formatMoney(row.share)}</td>
      <td class="text-end">${formatMoney(row.settled)}</td>
      <td class="text-end ${netClass(row.net)}">${signedMoney(row.net)}</td>
      <td>${balanceBadge(row.net)}</td>
    </tr>`;
}

function render() {
  const team = getTeam();
  if (!team) {
    renderNoTeam(pageContent);
    return;
  }

  const balances = teamBalances(team);

  // Show active members, plus archived ones who still owe or are owed money
  const members = [];
  for (const member of membersOf(team, true)) {
    const isActive = member.active !== false;
    if (isActive || balances[member.id].net !== 0) {
      members.push(member);
    }
  }

  // Add up what is owed to members and what members owe
  let totalOwed = 0;
  let totalOwes = 0;
  for (const member of members) {
    const net = balances[member.id].net;
    if (net > 0) totalOwed = totalOwed + net;
    if (net < 0) totalOwes = totalOwes - net; // net is negative, so this adds
  }

  let tableHtml = "";
  if (members.length === 0) {
    tableHtml = `<div class="empty-state"><i class="bi bi-people"></i>No members yet. Add your team first.</div>`;
  } else {
    let rows = "";
    for (const member of members) {
      rows = rows + memberRowHtml(member, balances[member.id]);
    }
    tableHtml = `
      <table class="table align-middle mb-0">
        <thead>
          <tr>
            <th>Member</th><th class="text-end">Paid / claimed</th><th class="text-end">Share</th>
            <th class="text-end">Settled</th><th class="text-end">Net</th><th>Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  pageContent.innerHTML =
    heading("Team balances", `<button class="btn btn-navy" data-action="settle">Settle up</button>`) +
    `<div class="row g-3 mb-3">
       ${summaryCard("Owed to members", totalOwed, "pos")}
       ${summaryCard("Outstanding debts", totalOwes, "neg")}
       ${summaryCard("Net total", totalOwed - totalOwes)}
     </div>
     <div class="panel table-responsive">${tableHtml}</div>`;
}

onAction(pageContent, {
  settle: function () {
    location.href = pagesPath + "settle-up.html";
  },
});

initPage({ onRender: render });
