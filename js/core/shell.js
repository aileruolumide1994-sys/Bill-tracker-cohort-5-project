// Things every page shares: the team dropdown, the search box, the balance badge,
// and a few helper functions for building page HTML.
import { state, commit, getTeam, setTeam, membersOf, expensesOf, paymentsOf } from "./state.js";
import { calculateBalances } from "./calc.js";
import { openModal } from "../utils/modal.js";
import { showNotification } from "../utils/notification.js";
import { createId, escapeHtml, formatMoney } from "../utils/format.js";

// Pages live in /pages/, the home page does not. This lets links work from both.
export const pagesPath = location.pathname.includes("/pages/") ? "" : "pages/";

// Each page tells us how to draw itself (see initPage below)
let renderPage = function () {};

// Balances for every member of a team
export function teamBalances(team) {
  return calculateBalances(membersOf(team, true), expensesOf(team), paymentsOf(team));
}

// The title row at the top of a page, with optional buttons on the right
export function heading(title, actions = "") {
  return `
    <div class="page-heading">
      <h2 class="h4 fw-bold mb-0">${title}</h2>
      <div class="d-flex gap-2 flex-wrap">${actions}</div>
    </div>`;
}

// A coloured label showing if someone is owed money, owes money, or is settled
export function balanceBadge(net) {
  if (net > 0) return `<span class="badge badge-pos">Owed ${formatMoney(net)}</span>`;
  if (net < 0) return `<span class="badge badge-neg">Owes ${formatMoney(-net)}</span>`;
  return `<span class="badge badge-zero">Settled</span>`;
}

// Handle clicks on any element with data-action="name".
// handlers looks like: { name: function (dataset) { ... } }
export function onAction(root, handlers) {
  root.addEventListener("click", function (event) {
    const element = event.target.closest("[data-action]");
    if (!element) return;

    const handler = handlers[element.dataset.action];
    if (handler) handler(element.dataset);
  });
}

// What to show when there are no teams yet
export function renderNoTeam(element) {
  element.innerHTML = `
    <div class="panel empty-state">
      <i class="bi bi-people"></i>
      <p>Create your first team to start tracking petty cash.</p>
      <button class="btn btn-navy">Create team</button>
    </div>`;
  element.querySelector("button").onclick = function () {
    openTeamForm();
  };
}

// Form to create a team (or rename one if you pass an existing team)
export function openTeamForm(team) {
  const isRename = Boolean(team);
  const currentName = team ? team.name : "";

  openModal({
    title: isRename ? "Rename team" : "Create a team",
    okText: isRename ? "Save" : "Create team",
    body: `
      <label class="form-label" for="teamName">Team name</label>
      <input class="form-control" id="teamName" maxlength="60"
             placeholder="e.g. Marketing Team" value="${escapeHtml(currentName)}">`,
    onSubmit: function () {
      const name = document.getElementById("teamName").value.trim();
      if (!name) return "Please enter a team name.";

      if (isRename) {
        team.name = name;
      } else {
        const newTeam = { id: createId(), name: name, pettyCash: 0, custodianId: null };
        state.data.teams.push(newTeam);
        state.data.settings.activeTeamId = newTeam.id; // switch to the new team
      }

      commit();
      refresh();
      showNotification(isRename ? "Team renamed." : "Team created.");
    },
  });
}

// Redraw the header and the current page
export function refresh() {
  renderChrome();
  renderPage();
}

// Draw the parts shared by every page (team dropdown, balance badge, avatar)
function renderChrome() {
  const team = getTeam();

  document.getElementById("teamSelector").textContent = team ? team.name : "No teams yet";

  // Build the dropdown list of teams
  let items = "";
  for (const t of state.data.teams) {
    const isActive = team && t.id === team.id;
    items += `<li><button type="button" class="dropdown-item ${isActive ? "active" : ""}"
                data-team="${t.id}">${escapeHtml(t.name)}</button></li>`;
  }
  if (state.data.teams.length > 0) {
    items += `<li><hr class="dropdown-divider"></li>`;
  }
  items += `<li><button type="button" class="dropdown-item" data-team="__new">
              <i class="bi bi-plus-lg"></i> New team</button></li>`;
  document.getElementById("teamList").innerHTML = items;

  // Add up everyone's net balance. In a healthy ledger this is always 0.
  let imbalance = 0;
  if (team) {
    const balances = teamBalances(team);
    for (const id in balances) {
      imbalance += balances[id].net;
    }
  }

  const badge = document.querySelector(".balance-badge");
  badge.classList.toggle("text-bg-danger", imbalance !== 0);
  badge.querySelector(".balance-text").textContent =
    imbalance === 0 ? "System Balanced (₦0.00)" : "Imbalance " + formatMoney(imbalance);

  // The round avatar shows the first letter of the user's name
  const userName = state.data.settings.userName || "?";
  document.querySelector(".profile-avatar").textContent = userName[0].toUpperCase();
}

// Call this once at the bottom of every page script.
// onRender: draws the page.  onSearch (optional): runs as the user types in the search box.
export function initPage({ onRender, onSearch } = {}) {
  if (onRender) renderPage = onRender;

  // Clicking a team in the dropdown
  document.getElementById("teamList").addEventListener("click", function (event) {
    const button = event.target.closest("[data-team]");
    if (!button) return;

    const id = button.dataset.team;
    if (id === "__new") {
      openTeamForm();
    } else {
      setTeam(id);
      refresh();
    }
  });

  // The search box in the header
  const form = document.querySelector(".search-form");
  const input = form.querySelector("input");
  input.value = new URLSearchParams(location.search).get("q") || "";

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!onSearch) {
      // Pages without their own search send you to the Expenses page
      location.href = pagesPath + "expenses.html?q=" + encodeURIComponent(input.value);
    }
  });

  if (onSearch) {
    input.addEventListener("input", function () {
      onSearch(input.value);
    });
  }

  refresh();
}
