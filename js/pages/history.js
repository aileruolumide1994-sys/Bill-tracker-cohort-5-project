// Activity History page: every expense, claim and payment for the active team.
// The markup lives in pages/history.html; this file fills it in.
import { getTeam, membersOf, expensesOf, paymentsOf } from "../core/state.js";
import { initPage } from "../core/shell.js";
import { CATEGORIES } from "../features/forms.js";
import { escapeHtml, formatMoney, formatDate, monthOf, monthLabel, today } from "../utils/format.js";

const $ = (id) => document.getElementById(id);
const PAGE_SIZE = 10;
const filters = { q: "", member: "", category: "", month: "" };
let page = 1;

const STATUS_BADGE = { approved: "badge-pos", rejected: "badge-neg", pending: "text-bg-warning", completed: "badge-pos" };
const label = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Turn expenses, claims and payments into one list of rows.
function buildRows(team) {
  const names = Object.fromEntries(membersOf(team, true).map((m) => [m.id, m.name]));
  const name = (id) => names[id] ?? "Unknown";
  const expenses = expensesOf(team).map((e) => ({
    date: e.date, type: e.kind === "claim" ? "Claim" : "Expense", title: e.title,
    memberIds: [e.payerId], member: name(e.payerId), category: e.category, amount: e.amount, status: e.status,
  }));
  const payments = paymentsOf(team).map((p) => ({
    date: p.date, type: "Payment", title: p.note || "Payment",
    memberIds: [p.from, p.to], member: `${name(p.from)} → ${name(p.to)}`, category: "Settlement", amount: p.amount, status: "completed",
  }));
  return [...expenses, ...payments].sort((a, b) => b.date.localeCompare(a.date));
}

function fillSelect(id, firstLabel, options, current) {
  const select = $(id);
  select.innerHTML = `<option value="">${firstLabel}</option>` +
    options.map(([v, t]) => `<option value="${escapeHtml(v)}">${escapeHtml(t)}</option>`).join("");
  select.value = options.some(([v]) => v === current) ? current : "";
}

function render() {
  const team = getTeam();
  const rows = team ? buildRows(team) : [];
  $("historyCurrentMonth").textContent = monthLabel(monthOf(today()));

  // Filter dropdowns
  const members = team ? membersOf(team, true) : [];
  const months = [...new Set(rows.map((r) => monthOf(r.date)))].sort().reverse();
  fillSelect("historyMemberFilter", "All members", members.map((m) => [m.id, m.name]), filters.member);
  fillSelect("historyCategoryFilter", "All categories", [...CATEGORIES, "Settlement"].map((c) => [c, c]), filters.category);
  fillSelect("historyMonthFilter", "All months", months.map((m) => [m, monthLabel(m)]), filters.month);
  filters.member = $("historyMemberFilter").value;
  filters.category = $("historyCategoryFilter").value;
  filters.month = $("historyMonthFilter").value;

  const q = filters.q.trim().toLowerCase();
  const shown = rows.filter((r) =>
    (!q || r.title.toLowerCase().includes(q)) &&
    (!filters.member || r.memberIds.includes(filters.member)) &&
    (!filters.category || r.category === filters.category) &&
    (!filters.month || monthOf(r.date) === filters.month));

  // Summary cards
  $("historyTotalActivities").textContent = shown.length;
  $("historyTotalExpenses").textContent = shown.filter((r) => r.type === "Expense").length;
  $("historyTotalPayments").textContent = shown.filter((r) => r.type === "Payment").length;
  $("historyTotalClaims").textContent = shown.filter((r) => r.type === "Claim").length;
  $("historyTotalMembers").textContent = new Set(shown.flatMap((r) => r.memberIds)).size;

  // Table + pagination
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  page = Math.min(page, pages);
  const start = (page - 1) * PAGE_SIZE;
  const visible = shown.slice(start, start + PAGE_SIZE);

  $("historyTableBody").innerHTML = visible.map((r) => `<tr>
      <td>${formatDate(r.date)}</td><td>${r.type}</td><td>${escapeHtml(r.title)}</td>
      <td>${escapeHtml(r.member)}</td><td>${escapeHtml(r.category)}</td>
      <td class="fw-semibold">${formatMoney(r.amount)}</td>
      <td><span class="badge ${STATUS_BADGE[r.status] ?? "text-bg-secondary"}">${label(r.status)}</span></td></tr>`).join("");
  $("historyEmptyState").hidden = visible.length > 0;
  $("historyResultsCount").textContent = shown.length
    ? `Showing ${start + 1}–${start + visible.length} of ${shown.length} activities`
    : "No activities to display";
  $("historyPageNumber").textContent = shown.length ? `Page ${page} of ${pages}` : "—";
  $("historyPrevPage").disabled = page <= 1;
  $("historyNextPage").disabled = page >= pages;
}

const update = (key) => (event) => { filters[key] = event.target.value; page = 1; render(); };
$("historySearch").addEventListener("input", update("q"));
$("historyMemberFilter").addEventListener("change", update("member"));
$("historyCategoryFilter").addEventListener("change", update("category"));
$("historyMonthFilter").addEventListener("change", update("month"));
$("historyPrevPage").addEventListener("click", () => { page--; render(); });
$("historyNextPage").addEventListener("click", () => { page++; render(); });
$("historyResetFilters").addEventListener("click", () => {
  Object.assign(filters, { q: "", member: "", category: "", month: "" });
  $("historySearch").value = "";
  page = 1;
  render();
});

initPage({ onRender: render });
