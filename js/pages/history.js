// Activity History page: every expense, claim and payment for the active team.
// The page layout is in pages/history.html; this file fills it in.
import { getTeam, membersOf, expensesOf, paymentsOf } from "../core/state.js";
import { initPage } from "../core/shell.js";
import { CATEGORIES } from "../features/forms.js";
import { escapeHtml, formatMoney, formatDate, monthOf, monthLabel, today } from "../utils/format.js";

function byId(id) {
  return document.getElementById(id);
}

const PAGE_SIZE = 10; // rows per page
const filters = { q: "", member: "", category: "", month: "" };
let currentPage = 1;

const STATUS_BADGE = {
  approved: "badge-pos",
  rejected: "badge-neg",
  pending: "text-bg-warning",
  completed: "badge-pos",
};

// "approved" -> "Approved"
function capitalise(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Combine expenses, claims and payments into one list of simple rows
function buildRows(team) {
  const names = {};
  for (const member of membersOf(team, true)) {
    names[member.id] = member.name;
  }
  function nameOf(id) {
    return names[id] || "Unknown";
  }

  const rows = [];

  for (const expense of expensesOf(team)) {
    rows.push({
      date: expense.date,
      type: expense.kind === "claim" ? "Claim" : "Expense",
      title: expense.title,
      memberIds: [expense.payerId],
      member: nameOf(expense.payerId),
      category: expense.category,
      amount: expense.amount,
      status: expense.status,
    });
  }

  for (const payment of paymentsOf(team)) {
    rows.push({
      date: payment.date,
      type: "Payment",
      title: payment.note || "Payment",
      memberIds: [payment.from, payment.to],
      member: nameOf(payment.from) + " → " + nameOf(payment.to),
      category: "Settlement",
      amount: payment.amount,
      status: "completed",
    });
  }

  // Newest first
  rows.sort(function (a, b) {
    return b.date.localeCompare(a.date);
  });
  return rows;
}

// Fill a <select> with options. Keeps the current choice if it's still available.
function fillSelect(id, firstLabel, options, currentValue) {
  const select = byId(id);

  let html = `<option value="">${firstLabel}</option>`;
  let currentStillExists = false;
  for (const option of options) {
    html += `<option value="${escapeHtml(option[0])}">${escapeHtml(option[1])}</option>`;
    if (option[0] === currentValue) currentStillExists = true;
  }

  select.innerHTML = html;
  select.value = currentStillExists ? currentValue : "";
}

// Does a row pass the filters?
function rowMatches(row) {
  const search = filters.q.trim().toLowerCase();

  if (search && !row.title.toLowerCase().includes(search)) return false;
  if (filters.member && !row.memberIds.includes(filters.member)) return false;
  if (filters.category && row.category !== filters.category) return false;
  if (filters.month && monthOf(row.date) !== filters.month) return false;
  return true;
}

// Count how many rows have a certain type, e.g. countType(rows, "Claim")
function countType(rows, type) {
  let count = 0;
  for (const row of rows) {
    if (row.type === type) count++;
  }
  return count;
}

function rowHtml(row) {
  const badge = STATUS_BADGE[row.status] || "text-bg-secondary";
  return `
    <tr>
      <td>${formatDate(row.date)}</td>
      <td>${row.type}</td>
      <td>${escapeHtml(row.title)}</td>
      <td>${escapeHtml(row.member)}</td>
      <td>${escapeHtml(row.category)}</td>
      <td class="fw-semibold">${formatMoney(row.amount)}</td>
      <td><span class="badge ${badge}">${capitalise(row.status)}</span></td>
    </tr>`;
}

function render() {
  const team = getTeam();
  const rows = team ? buildRows(team) : [];
  byId("historyCurrentMonth").textContent = monthLabel(monthOf(today()));

  // --- Filter dropdowns ---
  const members = team ? membersOf(team, true) : [];
  const months = [];
  for (const row of rows) {
    const month = monthOf(row.date);
    if (!months.includes(month)) months.push(month);
  }
  months.sort().reverse();

  const categories = CATEGORIES.concat(["Settlement"]);
  fillSelect("historyMemberFilter", "All members", members.map(function (m) { return [m.id, m.name]; }), filters.member);
  fillSelect("historyCategoryFilter", "All categories", categories.map(function (c) { return [c, c]; }), filters.category);
  fillSelect("historyMonthFilter", "All months", months.map(function (m) { return [m, monthLabel(m)]; }), filters.month);

  // If a chosen option disappeared, the select reset itself - remember that
  filters.member = byId("historyMemberFilter").value;
  filters.category = byId("historyCategoryFilter").value;
  filters.month = byId("historyMonthFilter").value;

  const shown = rows.filter(rowMatches);

  // --- Summary cards ---
  const uniqueMembers = [];
  for (const row of shown) {
    for (const id of row.memberIds) {
      if (!uniqueMembers.includes(id)) uniqueMembers.push(id);
    }
  }
  byId("historyTotalActivities").textContent = shown.length;
  byId("historyTotalExpenses").textContent = countType(shown, "Expense");
  byId("historyTotalPayments").textContent = countType(shown, "Payment");
  byId("historyTotalClaims").textContent = countType(shown, "Claim");
  byId("historyTotalMembers").textContent = uniqueMembers.length;

  // --- Table and pagination ---
  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PAGE_SIZE;
  const visible = shown.slice(start, start + PAGE_SIZE);

  let tableRows = "";
  for (const row of visible) {
    tableRows += rowHtml(row);
  }
  byId("historyTableBody").innerHTML = tableRows;
  byId("historyEmptyState").hidden = visible.length > 0;

  if (shown.length > 0) {
    byId("historyResultsCount").textContent =
      "Showing " + (start + 1) + "–" + (start + visible.length) + " of " + shown.length + " activities";
    byId("historyPageNumber").textContent = "Page " + currentPage + " of " + totalPages;
  } else {
    byId("historyResultsCount").textContent = "No activities to display";
    byId("historyPageNumber").textContent = "—";
  }

  byId("historyPrevPage").disabled = currentPage <= 1;
  byId("historyNextPage").disabled = currentPage >= totalPages;
}

// When a filter changes: save it, go back to page 1, redraw
function onFilterChange(key) {
  return function (event) {
    filters[key] = event.target.value;
    currentPage = 1;
    render();
  };
}

byId("historySearch").addEventListener("input", onFilterChange("q"));
byId("historyMemberFilter").addEventListener("change", onFilterChange("member"));
byId("historyCategoryFilter").addEventListener("change", onFilterChange("category"));
byId("historyMonthFilter").addEventListener("change", onFilterChange("month"));

byId("historyPrevPage").addEventListener("click", function () {
  currentPage--;
  render();
});
byId("historyNextPage").addEventListener("click", function () {
  currentPage++;
  render();
});

byId("historyResetFilters").addEventListener("click", function () {
  filters.q = "";
  filters.member = "";
  filters.category = "";
  filters.month = "";
  byId("historySearch").value = "";
  currentPage = 1;
  render();
});

initPage({ onRender: render });
