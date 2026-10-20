// Overview (dashboard) page
import { state, getTeam, membersOf, expensesOf } from "./core/state.js";
import { initPage, teamBalances, openTeamForm, pagesPath } from "./core/shell.js";
import { openExpenseForm, openPaymentForm } from "./features/forms.js";
import { openModal } from "./utils/modal.js";
import { formatMoney, escapeHtml, monthOf, monthLabel, today } from "./utils/format.js";

const $ = (id) => document.getElementById(id);
const COLORS = ["#172554", "#047857", "#60D5A5", "#818CF8", "#059669", "#CBD5E1", "#93C5FD", "#64748B"];
let viewMonth = monthOf(today()); // "YYYY-MM" or "all"
let spendingChart = null, memberChart = null;

function userGreeting(name) {
  const hour = new Date().getHours();
  return `Good ${hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"}, ${name}`;
}

function previousMonth(key) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function render() {
  const team = getTeam();
  $("greetingMessage").textContent = userGreeting(state.data.settings.userName || "there");
  $("teamIntro").textContent = team ? `Here's your team's financial overview for ${team.name}.` : "Create a team to get started.";
  $("currentMonth").textContent = viewMonth === "all" ? "All time" : monthLabel(viewMonth);
  $("dashboardNotice").innerHTML = team ? "" :
    `<div class="alert alert-info d-flex justify-content-between align-items-center mb-0">Create your first team to start tracking petty cash.<button class="btn btn-sm btn-navy" id="noticeBtn">Create team</button></div>`;
  if (!team) $("noticeBtn").onclick = () => openTeamForm();

  const members = team ? membersOf(team, true) : [];
  const all = team ? expensesOf(team) : [];
  const approved = all.filter((e) => e.status === "approved");
  const inView = viewMonth === "all" ? approved : approved.filter((e) => monthOf(e.date) === viewMonth);
  const sum = (list) => list.reduce((s, e) => s + e.amount, 0);
  const balances = team ? teamBalances(team) : {};
  const nets = Object.values(balances).map((b) => b.net);
  const pending = all.filter((e) => e.status === "pending");

  // Total spending + change vs previous month
  $("totalTeamSpending").textContent = formatMoney(sum(inView));
  $("spendingPeriod").textContent = viewMonth === "all" ? "All time" : monthLabel(viewMonth);
  const change = $("spendingChange");
  if (viewMonth === "all") { change.textContent = "All-time total"; change.className = "small-badge blue-badge"; }
  else {
    const prev = sum(approved.filter((e) => monthOf(e.date) === previousMonth(viewMonth)));
    const pct = prev ? Math.round(((sum(inView) - prev) / prev) * 100) : null;
    change.textContent = pct === null ? "No data last month" : `${pct > 0 ? "▲" : pct < 0 ? "▼" : ""} ${Math.abs(pct)}% vs last month`;
    change.className = `small-badge ${pct > 0 ? "orange-badge" : "green-badge"}`;
  }

  // Other cards
  $("pendingClaims").textContent = formatMoney(sum(pending));
  $("pendingClaimsCount").textContent = pending.length;
  $("availablePettyCash").textContent = formatMoney(team?.pettyCash ?? 0);
  $("pettyCashCustodian").textContent = members.find((m) => m.id === team?.custodianId)?.name ?? "Not assigned";
  $("membersToSettle").textContent = nets.filter((n) => n !== 0).length;
  $("settlementBalance").textContent = `${formatMoney(nets.filter((n) => n < 0).reduce((s, n) => s - n, 0))} to balance`;
  const imbalance = nets.reduce((a, b) => a + b, 0);
  $("auditBalance").textContent = formatMoney(imbalance);
  $("auditTitle").firstChild.textContent = imbalance === 0 ? "Ledger balanced " : "Ledger out of balance ";
  $("chartTotalSpending").textContent = formatMoney(sum(inView));
  $("chartExpenseCount").textContent = `${inView.length} expense${inView.length === 1 ? "" : "s"}`;

  drawCharts(inView, members);

  const acts = state.data.activities.filter((a) => a.teamId === team?.id).slice(0, 6);
  $("recentActivity").innerHTML = acts.length
    ? acts.map((a) => `<div class="row-item"><div class="row-main small">${escapeHtml(a.text)}</div><small class="text-secondary">${new Date(a.at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</small></div>`).join("")
    : `<div class="empty-state">No activity yet. Add the first expense or claim.</div>`;
}

function drawCharts(inView, members) {
  if (typeof Chart === "undefined") return; // Chart.js failed to load
  const totals = {};
  inView.forEach((e) => (totals[e.category] = (totals[e.category] ?? 0) + e.amount));
  const cats = Object.keys(totals);

  spendingChart?.destroy();
  spendingChart = new Chart($("spendingCategoryChart"), {
    type: "doughnut",
    data: { labels: cats, datasets: [{ data: cats.map((c) => totals[c] / 100), backgroundColor: cats.map((_, i) => COLORS[i % COLORS.length]), borderWidth: 0, hoverOffset: 5 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: "72%",
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.label}: ${formatMoney(c.raw * 100)}` } } } },
  });
  $("categoryLegend").innerHTML = cats.length
    ? cats.map((c, i) => `<div class="legend-item"><span class="legend-dot" style="background:${COLORS[i % COLORS.length]}"></span><span class="legend-name">${escapeHtml(c)}</span><span class="legend-value">${formatMoney(totals[c])}</span></div>`).join("")
    : `<div class="text-secondary small">No spending in this period.</div>`;

  const paid = {}, share = {};
  inView.forEach((e) => {
    paid[e.payerId] = (paid[e.payerId] ?? 0) + e.amount;
    for (const id in e.shares) share[id] = (share[id] ?? 0) + e.shares[id];
  });
  const shown = members.filter((m) => m.active !== false || paid[m.id] || share[m.id]);
  memberChart?.destroy();
  memberChart = new Chart($("memberContributionChart"), {
    type: "bar",
    data: { labels: shown.map((m) => m.name), datasets: [
      { label: "Paid / Claimed", data: shown.map((m) => (paid[m.id] ?? 0) / 100), backgroundColor: "#172554", borderRadius: 3 },
      { label: "Allocated Share", data: shown.map((m) => (share[m.id] ?? 0) / 100), backgroundColor: "#047857", borderRadius: 3 } ] },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "top", align: "end", labels: { boxWidth: 8, boxHeight: 8, font: { size: 9 } } }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formatMoney(c.raw * 100)}` } } },
      scales: { x: { grid: { display: false }, ticks: { font: { size: 9 } } }, y: { beginAtZero: true, grid: { color: "#F1F5F9" }, ticks: { font: { size: 9 }, callback: (v) => formatMoney(v * 100) } } } },
  });
}

// ----- buttons -----
$("addExpenseBtn").addEventListener("click", () => openExpenseForm());
$("recordPaymentBtn").addEventListener("click", () => openPaymentForm());
$("filtersBtn").addEventListener("click", () => (location.href = `${pagesPath}expenses.html`));
$("auditSheetBtn").addEventListener("click", () => (location.href = `${pagesPath}balances.html`));
$("adjustRulesBtn").addEventListener("click", () => (location.href = `${pagesPath}members.html`));
$("dateFilterBtn").addEventListener("click", () => {
  const team = getTeam();
  const months = new Set([monthOf(today())]);
  (team ? expensesOf(team) : []).forEach((e) => months.add(monthOf(e.date)));
  const keys = ["all", ...[...months].sort().reverse()];
  openModal({
    title: "Choose period", okText: "Apply",
    body: `<select class="form-select" id="monthPick" aria-label="Period">${keys.map((k) => `<option value="${k}" ${k === viewMonth ? "selected" : ""}>${k === "all" ? "All time" : monthLabel(k)}</option>`).join("")}</select>`,
    onSubmit() { viewMonth = $("monthPick").value; render(); },
  });
});

initPage({ onRender: render });
