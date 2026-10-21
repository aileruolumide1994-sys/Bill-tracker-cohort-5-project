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

const pageContent = document.getElementById("pageContent");
const filters = {
  q: new URLSearchParams(location.search).get("q") ?? "",
  member: "",
  category: "",
  month: "",
  status: "",
};

function claimBadge(expense) {
  if (expense.kind !== "claim") return "";

  let className = "text-bg-warning";
  if (expense.status === "approved") className = "badge-pos";
  if (expense.status === "rejected") className = "badge-neg";

  return `<span class="badge ${className}">Claim · ${expense.status}</span>`;
}

function reviewButtons(expense) {
  if (expense.status === "pending") {
    return `
      <button class="btn btn-sm btn-link p-0" data-action="approve" data-id="${expense.id}">Approve</button>
      <button class="btn btn-sm btn-link text-danger p-0" data-action="reject" data-id="${expense.id}">Reject</button>
    `;
  }

  if (expense.status === "rejected") {
    return `<button class="btn btn-sm btn-link p-0" data-action="approve" data-id="${expense.id}">Approve</button>`;
  }

  return "";
}

function expenseRowHtml(expense, names) {
  const payerName = names[expense.payerId] || "Unknown";
  const paidWord = expense.kind === "claim" ? "Claimed" : "Paid";
  const foreign =
    expense.currency !== "NGN"
      ? ` · ${formatMoney(expense.originalAmount * 100, expense.currency)}`
      : "";

  return `
    <div class="row-item">
      <div class="row-icon"><i class="bi bi-receipt"></i></div>
      <div class="row-main">
        <div class="fw-semibold text-truncate">${escapeHtml(expense.title)} ${claimBadge(expense)}</div>
        <div class="small text-secondary">${escapeHtml(expense.category)} · ${paidWord} by ${escapeHtml(payerName)} · ${formatDate(expense.date)} · ${expense.split} split${foreign}</div>
      </div>
      <div class="text-end">
        <b>${formatMoney(expense.amount)}</b>
        <div>
          ${reviewButtons(expense)}
          <button class="btn btn-sm btn-link p-0" data-action="edit" data-id="${expense.id}">Edit</button>
          <button class="btn btn-sm btn-link text-danger p-0" data-action="delete" data-id="${expense.id}">Delete</button>
        </div>
      </div>
    </div>`;
}

function matchesFilters(expense) {
  const search = filters.q.toLowerCase();

  if (filters.member) {
    const isPayer = expense.payerId === filters.member;
    const hasShare = expense.shares[filters.member] !== undefined;
    if (!isPayer && !hasShare) return false;
  }

  if (filters.category && expense.category !== filters.category) return false;
  if (filters.month && monthOf(expense.date) !== filters.month) return false;
  if (filters.status && expense.status !== filters.status) return false;
  if (search && !expense.title.toLowerCase().includes(search)) return false;

  return true;
}

function filterSelect(key, allLabel, options) {
  const optionTags = options
    .map(([value, label]) => {
      const selected = filters[key] === value ? "selected" : "";
      return `<option value="${escapeHtml(value)}" ${selected}>${escapeHtml(label)}</option>`;
    })
    .join("");

  return `
    <div class="col-6 col-md-3">
      <select class="form-select form-select-sm" data-filter="${key}" aria-label="${allLabel}">
        <option value="">${allLabel}</option>
        ${optionTags}
      </select>
    </div>`;
}

function render() {
  const team = getTeam();

  if (!team) {
    renderNoTeam(pageContent);
    return;
  }

  const members = membersOf(team, true);
  const names = {};
  for (const member of members) {
    names[member.id] = member.name;
  }

  const allExpenses = expensesOf(team);
  const shown = allExpenses
    .filter(matchesFilters)
    .sort((a, b) => b.date.localeCompare(a.date));

  const months = [...new Set(allExpenses.map((expense) => monthOf(expense.date)))]
    .sort()
    .reverse();

  const memberOptions = members.map((member) => [member.id, member.name]);
  const categoryOptions = CATEGORIES.map((category) => [category, category]);
  const monthOptions = months.map((month) => [month, monthLabel(month)]);
  const statusOptions = [
    ["approved", "Approved"],
    ["pending", "Pending"],
    ["rejected", "Rejected"],
  ];

  let listHtml = "";
  if (shown.length === 0) {
    const message =
      allExpenses.length > 0
        ? "No expenses match these filters."
        : "No expenses yet. Add the first claim or bill for this team.";
    listHtml = `<div class="empty-state"><i class="bi bi-receipt"></i>${message}</div>`;
  } else {
    for (const expense of shown) {
      listHtml += expenseRowHtml(expense, names);
    }
  }

  pageContent.innerHTML =
    heading(
      "Expenses & claims",
      `<button class="btn btn-navy" data-action="add"><i class="bi bi-plus-lg"></i> Add expense or claim</button>`,
    ) +
    `<div class="panel">
      <div class="row g-2">
        ${filterSelect("member", "All members", memberOptions)}
        ${filterSelect("category", "All categories", categoryOptions)}
        ${filterSelect("month", "All months", monthOptions)}
        ${filterSelect("status", "Any status", statusOptions)}
      </div>
    </div>
    <div class="panel">${listHtml}</div>`;
}

function setStatus(id, status) {
  const expense = state.data.expenses.find((item) => item.id === id);
  if (!expense) return;

  expense.status = status;
  logActivity(getTeam(), `Claim “${expense.title}” ${status}`);
  commit();
  refresh();
}

onAction(pageContent, {
  add: () => openExpenseForm(),
  edit: ({ id }) => openExpenseForm(id),
  approve: ({ id }) => setStatus(id, "approved"),
  reject: ({ id }) => setStatus(id, "rejected"),
  delete: ({ id }) => {
    confirmDialog("Delete this expense? Balances will update.", () => {
      state.data.expenses = state.data.expenses.filter((expense) => expense.id !== id);
      commit();
      refresh();
    });
  },
});

pageContent.addEventListener("change", (event) => {
  const key = event.target.dataset.filter;
  if (!key) return;

  filters[key] = event.target.value;
  render();
});

initPage({
  onRender: render,
  onSearch: (q) => {
    filters.q = q;
    render();
  },
});
