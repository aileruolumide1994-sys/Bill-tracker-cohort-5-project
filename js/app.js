const teamSelector = document.getElementById("teamSelector");
const teamList = document.getElementById("teamList");
const testSaveBtn = document.getElementById("testSaveBtn");
const monthElement = document.getElementById("currentMonth");
const greetingMessage = document.getElementById("greetingMessage");

// GREETING MESSAGE
function userGreeting(userName) {
  const hour = new Date().getHours();
  let greetings = "";

  if (hour > 1 && hour < 12) {
    greetings = `Good morning, ${userName}`;
  } else if (hour >= 12 && hour < 17) {
    greetings = `Good Afternoon, ${userName}`;
  } else {
    greetings = `Good Evening, ${userName}`;
  }
  return greetings;
}

window.onload = function () {
  const user = "Marvellous";
  greetingMessage.innerText = userGreeting(user);
};

import { loadData, saveData } from "./core/storage.js";
import { showNotification } from "./utils/notification.js";

let appData = loadData();

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

  teamList.innerHTML = `
  <button
              type="button"
              class="btn createTeamColor"
              data-bs-toggle="modal"
              data-bs-target="#createTeamModal"
            >
              <i class="bi bi-plus-lg"></i>
              Create Team
            </button>
  `;

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

if (testSaveBtn) {
  testSaveBtn.addEventListener("click", () => {
    saveApplicationData(appData);
  });
}

function renderCurrentMonth() {
  if (!monthElement) return;

  const currentDate = new Date();

  monthElement.textContent = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

renderCurrentMonth();

/* Formating amounts as Nigerian Naira */
function formatMoney(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

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

const createTeamForm = document.getElementById("createTeamForm");

createTeamForm.addEventListener("submit", function (event) {
  // Stop the browser from refreshing the page
  event.preventDefault();

  // Get the team name entered by the user
  const teamNameInput = document.getElementById("teamName");
  const teamName = teamNameInput.value.trim();

  // Don't allow an empty team name
  if (!teamName) {
    showNotification("Please enter a team name.", "warning");
    return;
  }

  // Create the new team object
  const newTeam = {
    id: crypto.randomUUID(),
    name: teamName,
  };

  // Add the team to our existing data
  appData.teams.push(newTeam);

  // Make the new team the active team
  appData.settings.activeTeamId = newTeam.id;

  try {
    // Save all application data to localStorage
    saveData(appData);

    // Update the team dropdown
    renderTeams();

    // Refresh dashboard figures if this function exists
    renderDashboard();

    // Clear the form
    createTeamForm.reset();

    // Close the modal
    const modalElement = document.getElementById("createTeamModal");
    const modal = bootstrap.Modal.getInstance(modalElement);
    modal.hide();

    showNotification("Team created successfully!", "success");
  } catch (error) {
    // Undo the in-memory changes if saving fails
    appData.teams.pop();
    appData.settings.activeTeamId = null;

    showNotification(error.message || "Could not save the new team.", "danger");
  }
});
