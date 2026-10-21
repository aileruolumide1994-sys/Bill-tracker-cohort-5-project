// Expenses & Claims page
import {
  state,
  commit,
  getTeam,
  membersOf,
  expensesOf,
  logActivity,
} from "../core/state.js";
import {
  initPage,
  heading,
  onAction,
  renderNoTeam,
  refresh,
} from "../core/shell.js";
import { openExpenseForm, CATEGORIES } from "../features/forms.js";
import { confirmDialog } from "../utils/modal.js";
import {
  escapeHtml,
  formatMoney,
  formatDate,
  monthOf,
  monthLabel,
} from "../utils/format.js";

const el = document.getElementById("pageContent");
const filters = {
  q: new URLSearchParams(location.search).get("q") ?? "",
  member: "",
  category: "",
  month: "",
  status: "",
};

function row(e, names) {
  const claim =
    e.kind === "claim"
      ? `<span class="badge ${e.status === "approved" ? "badge-pos" : e.status === "rejected" ? "badge-neg" : "text-bg-warning"}">Claim · ${e.status}</span>`
      : "";
  const foreign =
    e.currency !== "NGN"
      ? ` · ${formatMoney(e.originalAmount * 100, e.currency)}`
      : "";
  const review =
    e.status === "pending"
      ? `<button class="btn btn-sm btn-link p-0" data-action="approve" data-id="${e.id}">Approve</button> <button class="btn btn-sm btn-link text-danger p-0" data-action="reject" data-id="${e.id}">Reject</button> `
      : e.status === "rejected"
        ? `<button class="btn btn-sm btn-link p-0" data-action="approve" data-id="${e.id}">Approve</button> `
        : "";
  return `<div class="row-item"><div class="row-icon"><i class="bi bi-receipt"></i></div>
    <div class="row-main"><div class="fw-semibold text-truncate">${escapeHtml(e.title)} ${claim}</div>
      <div class="small text-secondary">${escapeHtml(e.category)} · ${e.kind === "claim" ? "Claimed" : "Paid"} by ${escapeHtml(names[e.payerId] ?? "Unknown")} · ${formatDate(e.date)} · ${e.split} split${foreign}</div></div>
    <div class="text-end"><b>${formatMoney(e.amount)}</b><div>${review}<button class="btn btn-sm btn-link p-0" data-action="edit" data-id="${e.id}">Edit</button>
      <button class="btn btn-sm btn-link text-danger p-0" data-action="delete" data-id="${e.id}">Delete</button></div></div></div>`;
}

function render() {
  const team = getTeam();
  if (!team) return renderNoTeam(el);
  const names = Object.fromEntries(
    membersOf(team, true).map((m) => [m.id, m.name]),
  );
  const all = expensesOf(team);
  const q = filters.q.toLowerCase();
  const shown = all
    .filter(
      (e) =>
        (!filters.member ||
          e.payerId === filters.member ||
          e.shares[filters.member] != null) &&
        (!filters.category || e.category === filters.category) &&
        (!filters.month || monthOf(e.date) === filters.month) &&
        (!filters.status || e.status === filters.status) &&
        (!q || e.title.toLowerCase().includes(q)),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const months = [...new Set(all.map((e) => monthOf(e.date)))].sort().reverse();
  const select = (key, label, opts) =>
    `<div class="col-6 col-md-3"><select class="form-select form-select-sm" data-filter="${key}" aria-label="${label}"><option value="">${label}</option>${opts.map(([v, t]) => `<option value="${escapeHtml(v)}" ${filters[key] === v ? "selected" : ""}>${escapeHtml(t)}</option>`).join("")}</select></div>`;

  el.innerHTML =
    heading(
      "Expenses & claims",
      `<button class="btn btn-navy" data-action="add"><i class="bi bi-plus-lg"></i> Add expense or claim</button>`,
    ) +
    `<div class="panel"><div class="row g-2">
      ${select(
        "member",
        "All members",
        membersOf(team, true).map((m) => [m.id, m.name]),
      )}
      ${select(
        "category",
        "All categories",
        CATEGORIES.map((c) => [c, c]),
      )}
      ${select(
        "month",
        "All months",
        months.map((m) => [m, monthLabel(m)]),
      )}
      ${select("status", "Any status", [
        ["approved", "Approved"],
        ["pending", "Pending"],
        ["rejected", "Rejected"],
      ])}</div></div>` +
    `<div class="panel">${
      shown.length
        ? shown.map((e) => row(e, names)).join("")
        : `<div class="empty-state"><i class="bi bi-receipt"></i>${all.length ? "No expenses match these filters." : "No expenses yet. Add the first claim or bill for this team."}</div>`
    }</div>`;
}

function setStatus(id, status) {
  const e = state.data.expenses.find((x) => x.id === id);
  e.status = status;
  logActivity(getTeam(), `Claim “${e.title}” ${status}`);
  commit();
  refresh();
}

onAction(el, {
  add: () => openExpenseForm(),
  edit: ({ id }) => openExpenseForm(id),
  approve: ({ id }) => setStatus(id, "approved"),
  reject: ({ id }) => setStatus(id, "rejected"),
  delete: ({ id }) =>
    confirmDialog("Delete this expense? Balances will update.", () => {
      state.data.expenses = state.data.expenses.filter((e) => e.id !== id);
      commit();
      refresh();
    }),
});
el.addEventListener("change", (event) => {
  const key = event.target.dataset.filter;
  if (key) {
    filters[key] = event.target.value;
    render();
  }
});

initPage({
  onRender: render,
  onSearch: (q) => {
    filters.q = q;
    render();
  },
});
