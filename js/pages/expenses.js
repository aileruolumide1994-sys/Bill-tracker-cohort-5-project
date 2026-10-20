// Expenses & Claims page
import { state, commit, getTeam, membersOf, expensesOf, logActivity } from "../core/state.js";
import { initPage, heading, onAction, renderNoTeam, refresh } from "../core/shell.js";
import { openExpenseForm, CATEGORIES } from "../features/forms.js";
import { confirmDialog } from "../utils/modal.js";
import { escapeHtml, formatMoney, formatDate, monthOf, monthLabel } from "../utils/format.js";

const pageContent = document.getElementById("pageContent");

// The current filter choices ("" means "no filter")
const filters = {
  q: new URLSearchParams(location.search).get("q") || "",
  member: "",
  category: "",
  month: "",
  status: "",
};

// The little coloured label for claims, e.g. "Claim · pending"
function claimBadge(expense) {
  if (expense.kind !== "claim") return "";

  let colour = "text-bg-warning";
  if (expense.status === "approved") colour = "badge-pos";
  if (expense.status === "rejected") colour = "badge-neg";

  return `<span class="badge ${colour}">Claim · ${expense.status}</span>`;
}

// Approve / Reject buttons (only shown when they make sense)
function reviewButtons(expense) {
  const approve = `<button class="btn btn-sm btn-link p-0" data-action="approve" data-id="${expense.id}">Approve</button> `;
  const reject = `<button class="btn btn-sm btn-link text-danger p-0" data-action="reject" data-id="${expense.id}">Reject</button> `;

  if (expense.status === "pending") return approve + reject;
  if (expense.status === "rejected") return approve;
  return "";
}

// HTML for one expense in the list
function expenseRowHtml(expense, names) {
  const payerName = names[expense.payerId] || "Unknown";
  const paidWord = expense.kind === "claim" ? "Claimed" : "Paid";

  let foreign = "";
  if (expense.currency !== "NGN") {
    foreign = " · " + formatMoney(expense.originalAmount * 100, expense.currency);
  }

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

// Does this expense pass all the current filters?
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

// One filter dropdown. options is a list of [value, label] pairs.
function filterSelect(key, allLabel, options) {
  let optionTags = `<option value="">${allLabel}</option>`;
  for (const option of options) {
    const selected = filters[key] === option[0] ? "selected" : "";
    optionTags += `<option value="${escapeHtml(option[0])}" ${selected}>${escapeHtml(option[1])}</option>`;
  }
  return `<div class="col-6 col-md-3">
            <select class="form-select form-select-sm" data-filter="${key}" aria-label="${allLabel}">${optionTags}</select>
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

  // Apply filters, newest first
  const shown = allExpenses.filter(matchesFilters);
  shown.sort(function (a, b) {
    return b.date.localeCompare(a.date);
  });

  // The list of months that have expenses (newest first, no repeats)
  const months = [];
  for (const expense of allExpenses) {
    const month = monthOf(expense.date);
    if (!months.includes(month)) months.push(month);
  }
  months.sort().reverse();

  // Build the dropdown option lists
  const memberOptions = members.map(function (m) { return [m.id, m.name]; });
  const categoryOptions = CATEGORIES.map(function (c) { return [c, c]; });
  const monthOptions = months.map(function (m) { return [m, monthLabel(m)]; });
  const statusOptions = [["approved", "Approved"], ["pending", "Pending"], ["rejected", "Rejected"]];

  // The list of expenses (or a message if there are none)
  let listHtml = "";
  if (shown.length === 0) {
    const message = allExpenses.length > 0
      ? "No expenses match these filters."
      : "No expenses yet. Add the first claim or bill for this team.";
    listHtml = `<div class="empty-state"><i class="bi bi-receipt"></i>${message}</div>`;
  } else {
    for (const expense of shown) {
      listHtml += expenseRowHtml(expense, names);
    }
  }

  pageContent.innerHTML =
    heading("Expenses & claims", `<button class="btn btn-navy" data-action="add"><i class="bi bi-plus-lg"></i> Add expense or claim</button>`) +
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

// Approve or reject a claim
function setStatus(id, status) {
  const expense = state.data.expenses.find(function (e) { return e.id === id; });
  expense.status = status;
  logActivity(getTeam(), "Claim “" + expense.title + "” " + status);
  commit();
  refresh();
}

onAction(pageContent, {
  add: function () {
    openExpenseForm();
  },
  edit: function (data) {
    openExpenseForm(data.id);
  },
  approve: function (data) {
    setStatus(data.id, "approved");
  },
  reject: function (data) {
    setStatus(data.id, "rejected");
  },
  delete: function (data) {
    confirmDialog("Delete this expense? Balances will update.", function () {
      state.data.expenses = state.data.expenses.filter(function (e) {
        return e.id !== data.id;
      });
      commit();
      refresh();
    });
  },
});

// When a filter dropdown changes, remember the choice and redraw
pageContent.addEventListener("change", function (event) {
  const key = event.target.dataset.filter;
  if (key) {
    filters[key] = event.target.value;
    render();
  }
});

initPage({
  onRender: render,
  onSearch: function (text) {
    filters.q = text;
    render();
  },
});
