// Everything the pages share: team dropdown, search box, balance badge, helpers.
import { state, commit, getTeam, setTeam, membersOf, expensesOf, paymentsOf } from "./state.js";
import { calculateBalances } from "./calc.js";
import { openModal } from "../utils/modal.js";
import { showNotification } from "../utils/notification.js";
import { createId, escapeHtml, formatMoney } from "../utils/format.js";

export const pagesPath = location.pathname.includes("/pages/") ? "" : "pages/";
let renderPage = () => {};

export const teamBalances = (team) => calculateBalances(membersOf(team, true), expensesOf(team), paymentsOf(team));

export const heading = (title, actions = "") =>
  `<div class="page-heading"><h2 class="h4 fw-bold mb-0">${title}</h2><div class="d-flex gap-2 flex-wrap">${actions}</div></div>`;

export const balanceBadge = (n) =>
  n > 0 ? `<span class="badge badge-pos">Owed ${formatMoney(n)}</span>`
  : n < 0 ? `<span class="badge badge-neg">Owes ${formatMoney(-n)}</span>`
  : `<span class="badge badge-zero">Settled</span>`;

// Click handling by data-action="name" instead of inline onclick
export function onAction(root, handlers) {
  root.addEventListener("click", (event) => {
    const el = event.target.closest("[data-action]");
    if (el && handlers[el.dataset.action]) handlers[el.dataset.action](el.dataset);
  });
}

export function renderNoTeam(el) {
  el.innerHTML = `<div class="panel empty-state"><i class="bi bi-people"></i><p>Create your first team to start tracking petty cash.</p><button class="btn btn-navy">Create team</button></div>`;
  el.querySelector("button").onclick = () => openTeamForm();
}

export function openTeamForm(team) {
  openModal({
    title: team ? "Rename team" : "Create a team",
    okText: team ? "Save" : "Create team",
    body: `<label class="form-label" for="teamName">Team name</label>
           <input class="form-control" id="teamName" maxlength="60" placeholder="e.g. Marketing Team" value="${escapeHtml(team?.name ?? "")}">`,
    onSubmit() {
      const name = document.getElementById("teamName").value.trim();
      if (!name) return "Please enter a team name.";
      if (team) team.name = name;
      else {
        const created = { id: createId(), name, pettyCash: 0, custodianId: null };
        state.data.teams.push(created);
        state.data.settings.activeTeamId = created.id;
      }
      commit(); refresh();
      showNotification(team ? "Team renamed." : "Team created.");
    },
  });
}

export function refresh() { renderChrome(); renderPage(); }

function renderChrome() {
  const team = getTeam();
  document.getElementById("teamSelector").textContent = team ? team.name : "No teams yet";
  const items = state.data.teams.map((t) =>
    `<li><button type="button" class="dropdown-item ${t.id === team?.id ? "active" : ""}" data-team="${t.id}">${escapeHtml(t.name)}</button></li>`);
  items.push(`${items.length ? '<li><hr class="dropdown-divider"></li>' : ""}<li><button type="button" class="dropdown-item" data-team="__new"><i class="bi bi-plus-lg"></i> New team</button></li>`);
  document.getElementById("teamList").innerHTML = items.join("");

  const imbalance = team ? Object.values(teamBalances(team)).reduce((s, b) => s + b.net, 0) : 0;
  const badge = document.querySelector(".balance-badge");
  badge.classList.toggle("text-bg-danger", imbalance !== 0);
  badge.querySelector(".balance-text").textContent = imbalance === 0 ? "System Balanced (₦0.00)" : `Imbalance ${formatMoney(imbalance)}`;
  document.querySelector(".profile-avatar").textContent = (state.data.settings.userName || "?")[0].toUpperCase();
}

export function initPage({ onRender, onSearch } = {}) {
  renderPage = onRender ?? renderPage;
  document.getElementById("teamList").addEventListener("click", (event) => {
    const id = event.target.closest("[data-team]")?.dataset.team;
    if (!id) return;
    if (id === "__new") openTeamForm(); else { setTeam(id); refresh(); }
  });
  const form = document.querySelector(".search-form");
  const input = form.querySelector("input");
  input.value = new URLSearchParams(location.search).get("q") ?? "";
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!onSearch) location.href = `${pagesPath}expenses.html?q=${encodeURIComponent(input.value)}`;
  });
  if (onSearch) input.addEventListener("input", () => onSearch(input.value));
  refresh();
}
