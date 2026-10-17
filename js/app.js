import { loadData, saveData } from "./core/storage.js";
import { showNotification } from "./utils/notification.js";

let appData = loadData();

const teamSelector = document.getElementById("teamSelector");
const teamList = document.getElementById("teamList");

function renderTeams() {
  teamList.innerHTML = "";

  if (appData.teams.length === 0) {
    teamSelector.textContent = "No teams yet";

    teamList.innerHTML = `
            <li>
                <span class="dropdown-item-text">
                    Create your first team to get started.
                </span>
            </li>
        `;

    return;
  }

  let activeTeam = appData.teams.find(
    (team) => team.id === appData.settings.activeTeamId,
  );

  if (!activeTeam) {
    activeTeam = appData.teams[0];

    appData.settings.activeTeamId = activeTeam.id;
    saveData(appData);
  }

  teamSelector.textContent = activeTeam.name;

  appData.teams.forEach((team) => {
    const item = document.createElement("li");
    const button = document.createElement("button");

    button.type = "button";
    button.className = "dropdown-item";
    button.textContent = team.name;

    button.addEventListener("click", () => {
      appData.settings.activeTeamId = team.id;

      saveData(appData);
      renderTeams();

      renderDashboard();
    });

    item.appendChild(button);
    teamList.appendChild(item);
  });
}

// Temporary placeholder until we build the dashboard.
function renderDashboard() {
  console.log("Selected team:", appData.settings.activeTeamId);
}

renderTeams();

function saveApplicationData(data) {
  try {
    saveData(data);

    showNotification("Your changes have been saved successfully.", "success");
  } catch (error) {
    showNotification(error.message, "danger");
  }
}

const testSaveBtn = document.getElementById("testSaveBtn");

if (testSaveBtn) {
  testSaveBtn.addEventListener("click", () => {
    saveApplicationData(appData);
  });
}

function renderCurrentMonth() {
  const monthElement = document.getElementById("currentMonth");

  if (!monthElement) return;

  const currentDate = new Date();

  monthElement.textContent = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

renderCurrentMonth();

/* Format amounts as Nigerian Naira */
function formatMoney(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

/* Get the current month and year */
function getCurrentMonth() {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

/* Calculate dashboard figures from stored records */
function getDashboardSummary() {
  const expenses = appData.expenses || [];
  const members = appData.members || [];

  // Total value of expenses
  const totalSpending = expenses.reduce((total, expense) => {
    return total + Number(expense.amount || 0);
  }, 0);

  // Claims awaiting approval
  const pendingExpenses = expenses.filter((expense) => {
    return expense.status === "pending";
  });

  const pendingTotal = pendingExpenses.reduce((total, expense) => {
    return total + Number(expense.amount || 0);
  }, 0);

  // Petty cash balance comes from settings
  const pettyCash = Number(appData.settings?.pettyCashBalance || 0);

  // Members with a positive outstanding balance
  const membersToSettle = members.filter((member) => {
    return Number(member.balance || 0) > 0;
  });

  const settlementTotal = membersToSettle.reduce((total, member) => {
    return total + Number(member.balance || 0);
  }, 0);

  return {
    totalSpending,
    pendingTotal,
    pendingCount: pendingExpenses.length,
    pettyCash,
    membersToSettle: membersToSettle.length,
    settlementTotal,
    expenseCount: expenses.length,
  };
}

/* Put calculated figures into the summary cards */
function renderDashboardSummary() {
  const summary = getDashboardSummary();

  document.getElementById("totalTeamSpending").textContent = formatMoney(
    summary.totalSpending,
  );

  document.getElementById("pendingClaims").textContent = formatMoney(
    summary.pendingTotal,
  );

  document.getElementById("pendingClaimsCount").textContent =
    summary.pendingCount;

  document.getElementById("availablePettyCash").textContent = formatMoney(
    summary.pettyCash,
  );

  document.getElementById("membersToSettle").textContent =
    summary.membersToSettle;

  document.getElementById("settlementBalance").textContent =
    `${formatMoney(summary.settlementTotal)} to balance`;

  document.getElementById("spendingPeriod").textContent = getCurrentMonth();

  document.getElementById("chartTotalSpending").textContent = formatMoney(
    summary.totalSpending,
  );

  document.getElementById("chartExpenseCount").textContent =
    `${summary.expenseCount} expenses`;

  // This is a simple placeholder until the audit calculation is built.
  document.getElementById("auditBalance").textContent = formatMoney(0);
}
renderDashboardSummary();

let spendingChart = null;

function renderSpendingChart() {
  const expenses = appData.expenses || [];

  // Group expenses by category
  const categoryTotals = {};

  expenses.forEach((expense) => {
    const category = expense.category || "Uncategorized";
    const amount = Number(expense.amount || 0);

    if (!categoryTotals[category]) {
      categoryTotals[category] = 0;
    }

    categoryTotals[category] += amount;
  });

  const categories = Object.keys(categoryTotals);
  const amounts = Object.values(categoryTotals);

  const chartColors = [
    "#172554",
    "#047857",
    "#60D5A5",
    "#818CF8",
    "#059669",
    "#CBD5E1",
    "#93C5FD",
    "#64748B",
  ];

  const canvas = document.getElementById("spendingCategoryChart");

  if (!canvas || typeof Chart === "undefined") return;

  // Destroy the previous chart before drawing a new one
  if (spendingChart) {
    spendingChart.destroy();
  }

  spendingChart = new Chart(canvas, {
    type: "doughnut",

    data: {
      labels: categories,
      datasets: [
        {
          data: amounts,
          backgroundColor: categories.map((category, index) => {
            return chartColors[index % chartColors.length];
          }),
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
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.label}: ${formatMoney(context.raw)}`;
            },
          },
        },
      },
    },
  });

  // Create the legend underneath the chart
  const legend = document.getElementById("categoryLegend");
  legend.innerHTML = "";

  categories.forEach((category, index) => {
    const item = document.createElement("div");
    item.className = "legend-item";

    const dot = document.createElement("span");
    dot.className = "legend-dot";
    dot.style.backgroundColor = chartColors[index % chartColors.length];

    const name = document.createElement("span");
    name.className = "legend-name";
    name.textContent = category;

    const value = document.createElement("span");
    value.className = "legend-value";
    value.textContent = formatMoney(categoryTotals[category]);

    item.append(dot, name, value);
    legend.appendChild(item);
  });
}

renderDashboardSummary();
renderSpendingChart();

let memberChart = null;

function renderMemberChart() {
  const members = appData.members || [];
  const canvas = document.getElementById("memberContributionChart");

  if (!canvas || typeof Chart === "undefined") return;

  if (memberChart) {
    memberChart.destroy();
  }

  memberChart = new Chart(canvas, {
    type: "bar",

    data: {
      labels: members.map((member) => member.name || "Unnamed"),

      datasets: [
        {
          label: "Paid / Claimed",
          data: members.map((member) => Number(member.totalPaid || 0)),
          backgroundColor: "#172554",
          borderRadius: 3,
        },
        {
          label: "Allocated Share",
          data: members.map((member) => Number(member.targetShare || 0)),
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
          labels: {
            boxWidth: 8,
            boxHeight: 8,
            font: {
              size: 9,
            },
          },
        },

        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${formatMoney(context.raw)}`;
            },
          },
        },
      },

      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            font: {
              size: 9,
            },
          },
        },

        y: {
          beginAtZero: true,
          grid: {
            color: "#F1F5F9",
          },
          ticks: {
            font: {
              size: 9,
            },
            callback: function (value) {
              return formatMoney(value);
            },
          },
        },
      },
    },
  });
}
renderDashboardSummary();
renderSpendingChart();
renderMemberChart();
