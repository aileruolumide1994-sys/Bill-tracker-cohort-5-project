// Overview (dashboard) page
import { state, getTeam, membersOf, expensesOf } from "./core/state.js";
import { initPage, teamBalances, openTeamForm, pagesPath } from "./core/shell.js";
import { openExpenseForm, openPaymentForm } from "./features/forms.js";
import { openModal } from "./utils/modal.js";
import { formatMoney, escapeHtml, monthOf, monthLabel, today } from "./utils/format.js";

function byId(id) {
  return document.getElementById(id);
}

const CHART_COLOURS = ["#172554", "#047857", "#60D5A5", "#818CF8", "#059669", "#CBD5E1", "#93C5FD", "#64748B"];

let viewMonth = monthOf(today()); // "YYYY-MM", or "all" for all time
let spendingChart = null;         // the two Chart.js charts (so we can redraw them)
let memberChart = null;

/* ---------- small helpers ---------- */

function greeting(name) {
  const hour = new Date().getHours();
  let timeOfDay = "evening";
  if (hour < 12) timeOfDay = "morning";
  else if (hour < 17) timeOfDay = "afternoon";
  return "Good " + timeOfDay + ", " + name;
}

// "2026-10" -> "2026-09"
function previousMonth(monthKey) {
  const parts = monthKey.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const date = new Date(year, month - 2, 1); // JS months start at 0, so month-2 is the previous month
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
}

// Add up the amount of a list of expenses
function totalOf(expenses) {
  let total = 0;
  for (const expense of expenses) {
    total += expense.amount;
  }
  return total;
}

// Keep only expenses in a given month
function inMonth(expenses, month) {
  return expenses.filter(function (e) {
    return monthOf(e.date) === month;
  });
}

/* ---------- drawing the page ---------- */

// The "up/down % vs last month" badge
function updateSpendingChange(approved, thisPeriodTotal) {
  const badge = byId("spendingChange");

  if (viewMonth === "all") {
    badge.textContent = "All-time total";
    badge.className = "small-badge blue-badge";
    return;
  }

  const lastMonthTotal = totalOf(inMonth(approved, previousMonth(viewMonth)));
  if (!lastMonthTotal) {
    badge.textContent = "No data last month";
    badge.className = "small-badge green-badge";
    return;
  }

  const percent = Math.round(((thisPeriodTotal - lastMonthTotal) / lastMonthTotal) * 100);
  let arrow = "";
  if (percent > 0) arrow = "▲ ";
  if (percent < 0) arrow = "▼ ";

  badge.textContent = arrow + Math.abs(percent) + "% vs last month";
  badge.className = "small-badge " + (percent > 0 ? "orange-badge" : "green-badge");
}

// The "recent activity" list
function renderRecentActivity(team) {
  const recent = state.data.activities
    .filter(function (a) { return team && a.teamId === team.id; })
    .slice(0, 6);

  if (recent.length === 0) {
    byId("recentActivity").innerHTML = `<div class="empty-state">No activity yet. Add the first expense or claim.</div>`;
    return;
  }

  let html = "";
  for (const activity of recent) {
    const when = new Date(activity.at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
    html += `
      <div class="row-item">
        <div class="row-main small">${escapeHtml(activity.text)}</div>
        <small class="text-secondary">${when}</small>
      </div>`;
  }
  byId("recentActivity").innerHTML = html;
}

function render() {
  const team = getTeam();

  byId("greetingMessage").textContent = greeting(state.data.settings.userName || "there");
  byId("teamIntro").textContent = team
    ? "Here's your team's financial overview for " + team.name + "."
    : "Create a team to get started.";
  byId("currentMonth").textContent = viewMonth === "all" ? "All time" : monthLabel(viewMonth);

  // Show a "create your first team" banner when there are no teams
  if (team) {
    byId("dashboardNotice").innerHTML = "";
  } else {
    byId("dashboardNotice").innerHTML = `
      <div class="alert alert-info d-flex justify-content-between align-items-center mb-0">
        Create your first team to start tracking petty cash.
        <button class="btn btn-sm btn-navy" id="noticeBtn">Create team</button>
      </div>`;
    byId("noticeBtn").onclick = function () {
      openTeamForm();
    };
  }

  // Gather the data for this team
  const members = team ? membersOf(team, true) : [];
  const allExpenses = team ? expensesOf(team) : [];
  const approved = allExpenses.filter(function (e) { return e.status === "approved"; });
  const pending = allExpenses.filter(function (e) { return e.status === "pending"; });
  const inView = viewMonth === "all" ? approved : inMonth(approved, viewMonth);
  const periodTotal = totalOf(inView);

  // Everyone's net balance as a simple list of numbers
  const balances = team ? teamBalances(team) : {};
  const nets = [];
  for (const id in balances) {
    nets.push(balances[id].net);
  }

  let membersToSettle = 0;
  let totalDebt = 0;
  let imbalance = 0;
  for (const net of nets) {
    if (net !== 0) membersToSettle++;
    if (net < 0) totalDebt -= net;
    imbalance += net;
  }

  // Card: total spending
  byId("totalTeamSpending").textContent = formatMoney(periodTotal);
  byId("spendingPeriod").textContent = viewMonth === "all" ? "All time" : monthLabel(viewMonth);
  updateSpendingChange(approved, periodTotal);

  // Card: pending claims
  byId("pendingClaims").textContent = formatMoney(totalOf(pending));
  byId("pendingClaimsCount").textContent = pending.length;

  // Card: petty cash
  byId("availablePettyCash").textContent = formatMoney(team ? team.pettyCash : 0);
  let custodianName = "Not assigned";
  if (team) {
    const custodian = members.find(function (m) { return m.id === team.custodianId; });
    if (custodian) custodianName = custodian.name;
  }
  byId("pettyCashCustodian").textContent = custodianName;

  // Card: settlement and ledger check
  byId("membersToSettle").textContent = membersToSettle;
  byId("settlementBalance").textContent = formatMoney(totalDebt) + " to balance";
  byId("auditBalance").textContent = formatMoney(imbalance);
  byId("auditTitle").firstChild.textContent = imbalance === 0 ? "Ledger balanced " : "Ledger out of balance ";

  // Chart header
  byId("chartTotalSpending").textContent = formatMoney(periodTotal);
  byId("chartExpenseCount").textContent = inView.length + " expense" + (inView.length === 1 ? "" : "s");

  drawCharts(inView, members);
  renderRecentActivity(team);
}

/* ---------- charts (Chart.js) ---------- */

function drawCharts(inView, members) {
  if (typeof Chart === "undefined") return; // Chart.js didn't load (e.g. offline)

  // --- Donut chart: spending per category ---
  const categoryTotals = {};
  for (const expense of inView) {
    if (!categoryTotals[expense.category]) categoryTotals[expense.category] = 0;
    categoryTotals[expense.category] += expense.amount;
  }
  const categories = Object.keys(categoryTotals);

  const amountsInNaira = categories.map(function (c) { return categoryTotals[c] / 100; });
  const colours = categories.map(function (c, i) { return CHART_COLOURS[i % CHART_COLOURS.length]; });

  if (spendingChart) spendingChart.destroy(); // remove the old chart before drawing a new one
  spendingChart = new Chart(byId("spendingCategoryChart"), {
    type: "doughnut",
    data: {
      labels: categories,
      datasets: [{ data: amountsInNaira, backgroundColor: colours, borderWidth: 0, hoverOffset: 5 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context) {
              return context.label + ": " + formatMoney(context.raw * 100);
            },
          },
        },
      },
    },
  });

  // The legend next to the donut
  let legend = "";
  if (categories.length === 0) {
    legend = `<div class="text-secondary small">No spending in this period.</div>`;
  } else {
    for (let i = 0; i < categories.length; i++) {
      legend += `
        <div class="legend-item">
          <span class="legend-dot" style="background:${colours[i]}"></span>
          <span class="legend-name">${escapeHtml(categories[i])}</span>
          <span class="legend-value">${formatMoney(categoryTotals[categories[i]])}</span>
        </div>`;
    }
  }
  byId("categoryLegend").innerHTML = legend;

  // --- Bar chart: what each member paid vs. their share ---
  const paid = {};
  const share = {};
  for (const expense of inView) {
    paid[expense.payerId] = (paid[expense.payerId] || 0) + expense.amount;
    for (const id in expense.shares) {
      share[id] = (share[id] || 0) + expense.shares[id];
    }
  }

  // Show active members, plus archived ones who took part in this period
  const shownMembers = members.filter(function (m) {
    return m.active !== false || paid[m.id] || share[m.id];
  });

  const names = shownMembers.map(function (m) { return m.name; });
  const paidData = shownMembers.map(function (m) { return (paid[m.id] || 0) / 100; });
  const shareData = shownMembers.map(function (m) { return (share[m.id] || 0) / 100; });

  if (memberChart) memberChart.destroy();
  memberChart = new Chart(byId("memberContributionChart"), {
    type: "bar",
    data: {
      labels: names,
      datasets: [
        { label: "Paid / Claimed", data: paidData, backgroundColor: "#172554", borderRadius: 3 },
        { label: "Allocated Share", data: shareData, backgroundColor: "#047857", borderRadius: 3 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top", align: "end", labels: { boxWidth: 8, boxHeight: 8, font: { size: 9 } } },
        tooltip: {
          callbacks: {
            label: function (context) {
              return context.dataset.label + ": " + formatMoney(context.raw * 100);
            },
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 9 } } },
        y: {
          beginAtZero: true,
          grid: { color: "#F1F5F9" },
          ticks: {
            font: { size: 9 },
            callback: function (value) {
              return formatMoney(value * 100);
            },
          },
        },
      },
    },
  });
}

/* ---------- buttons ---------- */

byId("addExpenseBtn").addEventListener("click", function () {
  openExpenseForm();
});
byId("recordPaymentBtn").addEventListener("click", function () {
  openPaymentForm();
});
byId("filtersBtn").addEventListener("click", function () {
  location.href = pagesPath + "expenses.html";
});
byId("auditSheetBtn").addEventListener("click", function () {
  location.href = pagesPath + "balances.html";
});
byId("adjustRulesBtn").addEventListener("click", function () {
  location.href = pagesPath + "members.html";
});

// The "choose a month" button opens a small window with a dropdown
byId("dateFilterBtn").addEventListener("click", function () {
  const team = getTeam();

  // Collect every month that has an expense (plus this month)
  const months = [monthOf(today())];
  if (team) {
    for (const expense of expensesOf(team)) {
      const month = monthOf(expense.date);
      if (!months.includes(month)) months.push(month);
    }
  }
  months.sort().reverse();
  const keys = ["all"].concat(months);

  let optionTags = "";
  for (const key of keys) {
    const label = key === "all" ? "All time" : monthLabel(key);
    const selected = key === viewMonth ? "selected" : "";
    optionTags += `<option value="${key}" ${selected}>${label}</option>`;
  }

  openModal({
    title: "Choose period",
    okText: "Apply",
    body: `<select class="form-select" id="monthPick" aria-label="Period">${optionTags}</select>`,
    onSubmit: function () {
      viewMonth = byId("monthPick").value;
      render();
    },
  });
});

initPage({ onRender: render });
