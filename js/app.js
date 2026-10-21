// Overview (dashboard) page
import { state, getTeam, membersOf, expensesOf } from "./core/state.js";
import {
  initPage,
  teamBalances,
  openTeamForm,
  pagesPath,
} from "./core/shell.js";
import { openExpenseForm, openPaymentForm } from "./features/forms.js";
import { openModal } from "./utils/modal.js";
import {
  formatMoney,
  escapeHtml,
  monthOf,
  monthLabel,
  today,
} from "./utils/format.js";

function byId(id) {
  return document.getElementById(id);
}

const CHART_COLOURS = [
  "#172554",
  "#047857",
  "#60D5A5",
  "#818CF8",
  "#059669",
  "#CBD5E1",
  "#93C5FD",
  "#64748B",
];
const COLORS = CHART_COLOURS;

let viewMonth = monthOf(today());
let spendingChart = null;
let memberChart = null;

function greeting(name) {
  const hour = new Date().getHours();
  let timeOfDay = "evening";
  if (hour < 12) {
    timeOfDay = "morning";
  } else if (hour < 17) {
    timeOfDay = "afternoon";
  }
  return "Good " + timeOfDay + ", " + name;
}

function previousMonth(monthKey) {
  const parts = monthKey.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const date = new Date(year, month - 2, 1);
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
}

function totalOf(expenses) {
  return expenses.reduce((total, expense) => total + expense.amount, 0);
}

function inMonth(expenses, month) {
  return expenses.filter((expense) => monthOf(expense.date) === month);
}

function updateSpendingChange(approved, periodTotal) {
  const badge = byId("spendingChange");
  if (!badge) return;

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

  const percent = Math.round(((periodTotal - lastMonthTotal) / lastMonthTotal) * 100);
  let arrow = "";
  if (percent > 0) arrow = "▲ ";
  if (percent < 0) arrow = "▼ ";

  badge.textContent = arrow + Math.abs(percent) + "% vs last month";
  badge.className = "small-badge " + (percent > 0 ? "orange-badge" : "green-badge");
}

function renderRecentActivity(team) {
  const recentActivity = byId("recentActivity");
  if (!recentActivity) return;

  const recent = state.data.activities
    .filter((activity) => team && activity.teamId === team.id)
    .slice(0, 6);

  if (recent.length === 0) {
    recentActivity.innerHTML = '<div class="empty-state">No activity yet. Add the first expense or claim.</div>';
    return;
  }

  recentActivity.innerHTML = recent
    .map((activity) => {
      const when = new Date(activity.at).toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      });
      return `
        <div class="row-item">
          <div class="row-main small">${escapeHtml(activity.text)}</div>
          <small class="text-secondary">${when}</small>
        </div>`;
    })
    .join("");
}

function drawCharts(inView, members) {
  if (typeof Chart === "undefined") return;

  const totals = {};
  for (const expense of inView) {
    totals[expense.category] = (totals[expense.category] ?? 0) + expense.amount;
  }

  const categories = Object.keys(totals);
  const categoryTotals = { ...totals };
  const colours = categories.map((_, index) => CHART_COLOURS[index % CHART_COLOURS.length]);

  if (spendingChart) spendingChart.destroy();
  spendingChart = new Chart(byId("spendingCategoryChart"), {
    type: "doughnut",
    data: {
      labels: categories,
      datasets: [
        {
          data: categories.map((category) => categoryTotals[category] / 100),
          backgroundColor: colours,
          borderWidth: 0,
          hoverOffset: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `${context.label}: ${formatMoney(context.raw * 100)}`,
          },
        },
      },
    },
  });

  let legend = "";
  if (categories.length === 0) {
    legend = '<div class="text-secondary small">No spending in this period.</div>';
  } else {
    legend = categories
      .map(
        (category, index) =>
          `<div class="legend-item"><span class="legend-dot" style="background:${colours[index]}"></span><span class="legend-name">${escapeHtml(category)}</span><span class="legend-value">${formatMoney(categoryTotals[category])}</span></div>`,
      )
      .join("");
  }
  byId("categoryLegend").innerHTML = legend;

  const paid = {};
  const share = {};
  for (const expense of inView) {
    paid[expense.payerId] = (paid[expense.payerId] ?? 0) + expense.amount;
    for (const memberId in expense.shares) {
      share[memberId] = (share[memberId] ?? 0) + expense.shares[memberId];
    }
  }

  const shownMembers = members.filter(
    (member) => member.active !== false || paid[member.id] || share[member.id],
  );

  const names = shownMembers.map((member) => member.name);
  const paidData = shownMembers.map((member) => (paid[member.id] ?? 0) / 100);
  const shareData = shownMembers.map((member) => (share[member.id] ?? 0) / 100);

  if (memberChart) memberChart.destroy();
  memberChart = new Chart(byId("memberContributionChart"), {
    type: "bar",
    data: {
      labels: names,
      datasets: [
        {
          label: "Paid / Claimed",
          data: paidData,
          backgroundColor: "#172554",
          borderRadius: 3,
        },
        {
          label: "Allocated Share",
          data: shareData,
          backgroundColor: "#047857",
          borderRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          align: "end",
          labels: { boxWidth: 8, boxHeight: 8, font: { size: 9 } },
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${formatMoney(context.raw * 100)}`,
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
            callback: (value) => formatMoney(value * 100),
          },
        },
      },
    },
  });
}

function render() {
  const team = getTeam();
  const members = team ? membersOf(team, true) : [];
  const allExpenses = team ? expensesOf(team) : [];
  const approved = allExpenses.filter((expense) => expense.status === "approved");
  const pending = allExpenses.filter((expense) => expense.status === "pending");
  const inView = viewMonth === "all" ? approved : inMonth(approved, viewMonth);

  const balances = team ? teamBalances(team) : {};
  const netValues = Object.values(balances).map((balance) => balance.net);

  byId("greetingMessage").textContent = greeting(state.data.settings.userName || "there");
  byId("teamIntro").textContent = team
    ? `Here's your team's financial overview for ${team.name}.`
    : "Create a team to get started.";
  byId("currentMonth").textContent = viewMonth === "all" ? "All time" : monthLabel(viewMonth);

  const noticeArea = byId("dashboardNotice");
  if (!team) {
    noticeArea.innerHTML = `
      <div class="alert alert-info d-flex justify-content-between align-items-center mb-0">
        Create your first team to start tracking petty cash.
        <button class="btn btn-sm btn-navy" id="noticeBtn" type="button">Create team</button>
      </div>`;
    const noticeBtn = byId("noticeBtn");
    if (noticeBtn) noticeBtn.onclick = () => openTeamForm();
  } else {
    noticeArea.innerHTML = "";
  }

  const periodTotal = totalOf(inView);
  byId("totalTeamSpending").textContent = formatMoney(periodTotal);
  byId("spendingPeriod").textContent = viewMonth === "all" ? "All time" : monthLabel(viewMonth);
  updateSpendingChange(approved, periodTotal);

  byId("pendingClaims").textContent = formatMoney(totalOf(pending));
  byId("pendingClaimsCount").textContent = String(pending.length);
  byId("availablePettyCash").textContent = formatMoney(team ? team.pettyCash : 0);

  const custodian = team ? members.find((member) => member.id === team.custodianId) : null;
  byId("pettyCashCustodian").textContent = custodian ? custodian.name : "Not assigned";

  byId("membersToSettle").textContent = String(netValues.filter((n) => n !== 0).length);
  const totalDebt = netValues.filter((n) => n < 0).reduce((sum, n) => sum - n, 0);
  byId("settlementBalance").textContent = `${formatMoney(totalDebt)} to balance`;

  const imbalance = netValues.reduce((sum, n) => sum + n, 0);
  byId("auditBalance").textContent = formatMoney(imbalance);
  byId("auditTitle").innerHTML = `${imbalance === 0 ? "Ledger balanced" : "Ledger out of balance"} <span>•</span>`;

  byId("chartTotalSpending").textContent = formatMoney(periodTotal);
  byId("chartExpenseCount").textContent = `${inView.length} expense${inView.length === 1 ? "" : "s"}`;

  drawCharts(inView, members);
  renderRecentActivity(team);
}

byId("addExpenseBtn")?.addEventListener("click", () => openExpenseForm());
byId("recordPaymentBtn")?.addEventListener("click", () => openPaymentForm());
byId("filtersBtn")?.addEventListener(
  "click",
  () => {
    location.href = `${pagesPath}expenses.html`;
  },
);
byId("auditSheetBtn")?.addEventListener(
  "click",
  () => {
    location.href = `${pagesPath}balances.html`;
  },
);
byId("adjustRulesBtn")?.addEventListener(
  "click",
  () => {
    location.href = `${pagesPath}members.html`;
  },
);
byId("dateFilterBtn")?.addEventListener("click", function () {
  const team = getTeam();
  const months = [monthOf(today())];

  if (team) {
    for (const expense of expensesOf(team)) {
      const month = monthOf(expense.date);
      if (!months.includes(month)) months.push(month);
    }
  }

  months.sort().reverse();
  const keys = ["all", ...months];

  const optionTags = keys
    .map((key) => {
      const label = key === "all" ? "All time" : monthLabel(key);
      const selected = key === viewMonth ? "selected" : "";
      return `<option value="${key}" ${selected}>${label}</option>`;
    })
    .join("");

  openModal({
    title: "Choose period",
    okText: "Apply",
    body: `<select class="form-select" id="monthPick" aria-label="Period">${optionTags}</select>`,
    onSubmit() {
      viewMonth = byId("monthPick").value;
      render();
    },
  });
});

initPage({ onRender: render });

