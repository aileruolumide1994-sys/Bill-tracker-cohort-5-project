const CATEGORIES = [
  "Stationery",
  "Internet",
  "Cleaning",
  "Software Subscription",
  "Travel",
  "Food & Refreshments",
  "Equipment",
  "Miscellenous",
  "Other",
];
const CURRENCIES = ["NGN", "USD", "EUR", "GBP", "CAD", "GHS", "ZAR", "KES"];
const CHART_COLORS = [
  "#172554",
  "#047857",
  "#60D5A5",
  "#818CF8",
  "#059669",
  "#CBD5E1",
  "#93C5FD",
  "#64748B",
];
const RATES_KEY = "officeflow_rates";
const RATES_URL = "https://open.er-api.com/v6/latest/NGN";

const pagesPath = location.pathname.includes("/pages/") ? "" : "pages/";

function getEl(id) {
  return document.getElementById(id);
}

function setText(id, text) {
  getEl(id).textContent = text;
}

function formatMoney(kobo, currency = "NGN") {
  const formatter = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currency,
  });
  return formatter.format((kobo || 0) / 100);
}

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 10);
}

function escapeHtml(text) {
  let result = String(text === null || text === undefined ? "" : text);
  result = result.replaceAll("&", "&amp;");
  result = result.replaceAll("<", "&lt;");
  result = result.replaceAll(">", "&gt;");
  result = result.replaceAll('"', "&quot;");
  result = result.replaceAll("'", "&#39;");
  return result;
}

function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return now.getFullYear() + "-" + month + "-" + day;
}

function monthOf(date) {
  return date.slice(0, 7);
}

function monthLabel(month) {
  return new Date(month + "-01T00:00").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatDate(date) {
  return new Date(date + "T00:00").toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initials(name) {
  const words = name.split(/\s+/);
  let letters = "";
  for (const word of words) {
    letters = letters + word[0];
  }
  return letters.slice(0, 2).toUpperCase();
}

function sumAmounts(list) {
  let total = 0;
  for (const item of list) {
    total = total + item.amount;
  }
  return total;
}

function makeNameLookup(members) {
  const names = {};
  for (const member of members) {
    names[member.id] = member.name;
  }
  return names;
}

function safeLoad() {
  try {
    return loadData();
  } catch (error) {
    localStorage.setItem(
      "officeflow_data_backup",
      localStorage.getItem("officeflow_data") || "",
    );
    return createInitialData();
  }
}

const state = { data: safeLoad() };

function commit() {
  try {
    saveData(state.data);
  } catch (error) {
    showNotification(error.message, "danger");
  }
}

function getTeam() {
  let team = state.data.teams.find(
    (t) => t.id === state.data.settings.activeTeamId,
  );
  if (!team) team = state.data.teams[0] || null;
  state.data.settings.activeTeamId = team ? team.id : null;
  return team;
}

function setTeam(id) {
  state.data.settings.activeTeamId = id;
  commit();
}

function membersOf(team, includeArchived = false) {
  return state.data.members.filter(
    (m) => m.teamId === team.id && (includeArchived || m.active !== false),
  );
}

function expensesOf(team) {
  return state.data.expenses.filter((e) => e.teamId === team.id);
}

function paymentsOf(team) {
  return state.data.payments.filter((p) => p.teamId === team.id);
}

function logActivity(team, text) {
  state.data.activities.unshift({
    id: createId(),
    teamId: team.id,
    text: text,
    at: new Date().toISOString(),
  });
  if (state.data.activities.length > 200) state.data.activities.length = 200;
}

function allocate(total, weights) {
  let weightSum = 0;
  for (const weight of weights) {
    weightSum = weightSum + weight;
  }
  if (weightSum === 0) return weights.map(() => 0);

  const parts = [];
  let given = 0;
  for (let i = 0; i < weights.length; i++) {
    const exact = (total * weights[i]) / weightSum;
    const rounded = Math.floor(exact);
    parts.push({ amount: rounded, remainder: exact - rounded });
    given = given + rounded;
  }


  let leftover = total - given;
  const sorted = parts.slice().sort((a, b) => {
    if (b.remainder === a.remainder) {
      return Math.random() - 0.5;
    }
    return b.remainder - a.remainder;
  });

  for (const part of sorted) {
    if (leftover > 0) {
      part.amount = part.amount + 1;
      leftover = leftover - 1;
    }
  }
  return parts.map((part) => part.amount);
}

function splitExpense(split, totalKobo, original, currency, ids, raw) {
  if (ids.length === 0)
    return { error: "Select at least one member to share this." };

  let weights = ids.map(() => 1); 
  if (split !== "equal") {
    weights = ids.map((id) => parseFloat(raw[id]) || 0);
    let sum = 0;
    for (const weight of weights) {
      if (weight < 0) return { error: "Values cannot be negative." };
      sum = sum + weight;
    }
    if (
      split === "exact" &&
      Math.round(sum * 100) !== Math.round(original * 100)
    ) {
      return {
        error:
          "Exact amounts total " +
          formatMoney(sum * 100, currency) +
          " but must equal " +
          formatMoney(original * 100, currency) +
          ".",
      };
    }
    if (split === "percent" && Math.abs(sum - 100) > 0.000001) {
      return {
        error: "Percentages total " + sum.toFixed(2) + "% but must equal 100%.",
      };
    }
  }

  const amounts = allocate(totalKobo, weights);
  const shares = {};
  for (let i = 0; i < ids.length; i++) {
    shares[ids[i]] = amounts[i];
  }
  return { shares: shares };
}

function calculateBalances(members, expenses, payments) {
  const balances = {};
  function getRow(id) {
    if (!balances[id]) balances[id] = { paid: 0, share: 0, settled: 0, net: 0 };
    return balances[id];
  }

  for (const member of members) {
    getRow(member.id);
  }
  for (const expense of expenses) {
    if (expense.status !== "approved") continue;
    getRow(expense.payerId).paid += expense.amount;
    for (const id in expense.shares) {
      getRow(id).share += expense.shares[id];
    }
  }
  for (const payment of payments) {
    getRow(payment.from).settled += payment.amount;
    getRow(payment.to).settled -= payment.amount;
  }
  for (const id in balances) {
    const row = balances[id];
    row.net = row.paid - row.share + row.settled;
  }
  return balances;
}

function teamBalances(team) {
  return calculateBalances(
    membersOf(team, true),
    expensesOf(team),
    paymentsOf(team),
  );
}

function createSettlementPlan(balances) {
  const creditors = []; 
  const debtors = []; 
  const plan = [];

  for (const id in balances) {
    const net = balances[id].net;
    if (net > 0) creditors.push({ id: id, amount: net });
    if (net < 0) debtors.push({ id: id, amount: -net });
  }

  while (creditors.length > 0 && debtors.length > 0) {
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);
    const creditor = creditors[0];
    const debtor = debtors[0];
    const amount = Math.min(creditor.amount, debtor.amount);

    plan.push({ from: debtor.id, to: creditor.id, amount: amount });
    creditor.amount -= amount;
    debtor.amount -= amount;

    if (creditor.amount === 0) creditors.shift(); 
    if (debtor.amount === 0) debtors.shift();
  }
  return plan;
}


let ratesCache = { ts: 0, rates: null };

try {
  const saved = JSON.parse(localStorage.getItem(RATES_KEY));
  if (saved) ratesCache = saved;
} catch (error) {
  console.error("Error loading exchange rate:", error);
}


function getRate(currency) {
  if (currency === "NGN") return 1;
  if (!ratesCache.rates) return undefined;
  return ratesCache.rates[currency];
}

async function loadRates() {
  const twelveHours = 12 * 60 * 60 * 1000;
  if (ratesCache.rates && Date.now() - ratesCache.ts < twelveHours) return;
  try {
    const response = await fetch(RATES_URL);
    const json = await response.json();
    if (json.result !== "success") throw new Error("bad response");
    ratesCache = { ts: Date.now(), rates: json.rates };
    localStorage.setItem(RATES_KEY, JSON.stringify(ratesCache));
  } catch (error) {
    console.error("Error loading exchange rate:", error);
  }
}

function showNotification(message, type = "success") {
  let area = getEl("notificationArea");
  if (!area) {
    area = document.createElement("div");
    area.id = "notificationArea";
    document.body.append(area);
  }

  const box = document.createElement("div");
  box.className =
    "alert alert-" + type + " alert-dismissible shadow-sm py-2 mb-2";
  box.setAttribute("role", "alert");
  box.textContent = message;

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "btn-close";
  closeButton.setAttribute("aria-label", "Close");
  closeButton.onclick = () => box.remove();

  box.append(closeButton);
  area.append(box);
  setTimeout(() => box.remove(), 4500); 
}

let modal = null;
let submitHandler = null; 

function buildModal() {
  if (modal) return;
  document.body.insertAdjacentHTML(
    "beforeend",
    `
  <div class="modal fade" id="appModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-scrollable" id="appModalDialog">
      <form class="modal-content" id="appModalForm" novalidate>
        <div class="modal-header"><h5 class="modal-title" id="appModalTitle"></h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
        <div class="modal-body"><div id="appModalBody"></div><div id="appModalError" class="text-danger small mt-2" role="alert"></div></div>
        <div class="modal-footer"><button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
          <button type="submit" class="btn btn-navy" id="appModalOk"></button></div>
      </form>
    </div>
  </div>`,
  );

  modal = bootstrap.Modal.getOrCreateInstance(getEl("appModal"));
  getEl("appModalForm").addEventListener("submit", function (event) {
    event.preventDefault();
    let result = null;
    if (submitHandler) result = submitHandler();
    if (typeof result === "string") {
      setText("appModalError", result);
    } else {
      modal.hide();
    }
  });
}

function openModal(options) {
  buildModal();
  submitHandler = options.onSubmit || null;

  setText("appModalTitle", options.title);
  getEl("appModalBody").innerHTML = options.body;
  getEl("appModalBody").oninput = null;
  setText("appModalError", "");
  setText("appModalOk", options.okText || "Save");
  getEl("appModalOk").hidden = !options.onSubmit;
  getEl("appModalDialog").className =
    "modal-dialog modal-dialog-scrollable " + (options.size || "");

  getEl("appModal").addEventListener(
    "shown.bs.modal",
    function () {
      const firstInput = getEl("appModalBody").querySelector(
        "input:not([type=radio]), select",
      );
      if (firstInput) firstInput.focus();
    },
    { once: true },
  );

  modal.show();
  return getEl("appModalBody");
}

function confirmDialog(message, onConfirm, okText = "Delete") {
  openModal({
    title: "Please confirm",
    body: `<p class="mb-0">${message}</p>`,
    okText: okText,
    onSubmit: function () {
      onConfirm();
    },
  });
}

let renderPage = function () {};

function heading(title, buttons = "") {
  return `<div class="page-heading">
  <h2 class="h4 fw-bold mb-0">${title}</h2>
  <div class="d-flex gap-2 flex-wrap">${buttons}</div>
  </div>`;
}

function balanceBadge(net) {
  if (net > 0)
    return `<span class="badge badge-pos">Owed ${formatMoney(net)}</span>`;
  if (net < 0)
    return `<span class="badge badge-neg">Owes ${formatMoney(-net)}</span>`;
  return `<span class="badge badge-zero">Settled</span>`;
}

function onAction(root, handlers) {
  root.addEventListener("click", function (event) {
    const element = event.target.closest("[data-action]");
    if (!element) return;
    const handler = handlers[element.dataset.action];
    if (handler) handler(element.dataset);
  });
}


function renderNoTeam(element) {
  element.innerHTML = `<div class="panel empty-state">
  <i class="bi bi-people"></i>
  <p>Create your first team to start tracking petty cash.</p>
  <button class="btn btn-navy">Create team</button>
  </div>`;
  element.querySelector("button").onclick = () => openTeamForm();
}

function openTeamForm(team) {
  const isRename = Boolean(team);
  openModal({
    title: isRename ? "Rename team" : "Create a team",
    okText: isRename ? "Save" : "Create team",
    body: `<label class="form-label" for="teamName">Team name</label>
           <input class="form-control" id="teamName" maxlength="60" placeholder="e.g. Marketing Team" value="${escapeHtml(isRename ? team.name : "")}">`,
    onSubmit: function () {
      const name = getEl("teamName").value.trim();
      if (!name) return "Please enter a team name.";

      if (isRename) {
        team.name = name;
      } else {
        const newTeam = {
          id: createId(),
          name: name,
          pettyCash: 0,
          custodianId: null,
        };
        state.data.teams.push(newTeam);
        state.data.settings.activeTeamId = newTeam.id;
      }
      commit();
      refresh();
      showNotification(isRename ? "Team renamed." : "Team created.");
    },
  });
}

function refresh() {
  renderHeader();
  renderPage();
}

function renderHeader() {
  const team = getTeam();
  setText("teamSelector", team ? team.name : "No teams yet");

  let items = "";
  for (const t of state.data.teams) {
    const active = team && t.id === team.id ? "active" : "";
    items += `<li>
    <button type="button" class="dropdown-item ${active}" data-team="${t.id}">${escapeHtml(t.name)}</button>
    </li>`;
  }
  if (state.data.teams.length > 0)
    items += `<li><hr class="dropdown-divider"></li>`;
  items += `<li>
  <button type="button" class="dropdown-item" data-team="__new"><i class="bi bi-plus-lg"></i> New team</button>
  </li>`;
  getEl("teamList").innerHTML = items;

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
    imbalance === 0 ? "" : "Imbalance " + formatMoney(imbalance);

  const userName = state.data.settings.userName || "?";
  document.querySelector(".profile-avatar").textContent =
    userName[0].toUpperCase();
}

function initPage(onRender, onSearch) {
  renderPage = onRender;

  getEl("teamList").addEventListener("click", function (event) {
    const button = event.target.closest("[data-team]");
    if (!button) return;
    if (button.dataset.team === "__new") {
      openTeamForm();
    } else {
      setTeam(button.dataset.team);
      refresh();
    }
  });

  const form = document.querySelector(".search-form");
  const input = form.querySelector("input");
  input.value = new URLSearchParams(location.search).get("q") || "";

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!onSearch)
      location.href =
        pagesPath + "expenses.html?q=" + encodeURIComponent(input.value);
  });

  if (onSearch) {
    input.addEventListener("input", () => onSearch(input.value));
  }
  refresh();
}

function needTeam() {
  const team = getTeam();
  if (!team) showNotification("Create a team first.", "warning");
  return team;
}

function optionsHtml(items, selectedValue) {
  let html = "";
  for (const item of items) {
    const selected = item[0] === selectedValue ? "selected" : "";
    html += `<option value="${escapeHtml(item[0])}" ${selected}>${escapeHtml(item[1])}</option>`;
  }
  return html;
}

function pairs(values) {
  return values.map((v) => [v, v]);
}

function radioHtml(name, value, label, checked) {
  return `<input type="radio" class="btn-check" name="${name}" id="${name}-${value}" value="${value}" ${checked ? "checked" : ""}>
          <label class="btn btn-outline-secondary btn-sm" for="${name}-${value}">${label}</label>`;
}

function getChecked(name) {
  return document.querySelector("[name=" + name + "]:checked").value;
}

function getCheckedIds() {
  const ids = [];
  for (const box of document.querySelectorAll(".who:checked")) {
    ids.push(box.value);
  }
  return ids;
}

function getRawValues() {
  const raw = {};
  for (const input of document.querySelectorAll(".who-raw")) {
    raw[input.dataset.id] = input.value;
  }
  return raw;
}

let editingExpense = null; 

function rateFor(currency) {
  if (currency === "NGN") return 1;
  if (editingExpense && editingExpense.currency === currency)
    return editingExpense.rate; 
  return getRate(currency);
}

function memberRowsHtml(memberList, expense) {
  let rows = "";
  for (const m of memberList) {
    const checked = expense.participants.includes(m.id) ? "checked" : "";
    const rawValue = expense.raw[m.id] !== undefined ? expense.raw[m.id] : "";
    rows += `<div class="d-flex align-items-center gap-2 py-1">
      <input type="checkbox" class="form-check-input who" value="${m.id}" id="who-${m.id}" ${checked}>
      <label class="flex-grow-1" for="who-${m.id}">${escapeHtml(m.name)}</label>
      <input type="number" step="0.01" class="form-control form-control-sm who-raw" data-id="${m.id}" style="width:90px" value="${rawValue}" aria-label="${escapeHtml(m.name)} value">
      <span class="who-share small fw-semibold text-end" data-id="${m.id}" style="min-width:90px"></span>
    </div>`;
  }
  return rows;
}

function expenseFormHtml(e, memberList) {
  const memberOptions = memberList.map((m) => [m.id, m.name]);
  return `
    <div class="btn-group w-100 mb-2">
    ${radioHtml("exKind", "expense", "Expense", e.kind === "expense")}
    ${radioHtml("exKind", "claim", "Reimbursement claim", e.kind === "claim")}
    </div>
    <label class="form-label small mb-1" for="exTitle">Title / purpose</label>
    <input class="form-control mb-2" id="exTitle" maxlength="80" value="${escapeHtml(e.title)}">
    <div class="row g-2">
      <div class="col-7"><label class="form-label small mb-1" for="exAmount">Amount</label>
        <input class="form-control" id="exAmount" type="number" step="0.01" min="0" inputmode="decimal" value="${e.originalAmount}"></div>
      <div class="col-5"><label class="form-label small mb-1" for="exCurrency">Currency</label>
        <select class="form-select" id="exCurrency">${optionsHtml(pairs(CURRENCIES), e.currency)}</select></div>
    </div>
    <div id="exRateInfo" class="small text-secondary my-1"></div>
    <div class="row g-2 mb-2">
      <div class="col-6"><label class="form-label small mb-1" for="exDate">Date</label>
        <input class="form-control" id="exDate" type="date" value="${e.date}"></div>
      <div class="col-6"><label class="form-label small mb-1" for="exCategory">Category</label>
        <select class="form-select" id="exCategory">${optionsHtml(pairs(CATEGORIES), e.category)}</select></div>
    </div>
    <label class="form-label small mb-1" for="exPayer">Paid by / claimed by</label>
    <select class="form-select mb-2" id="exPayer">${optionsHtml(memberOptions, e.payerId)}</select>
    <div class="btn-group w-100 mb-2">${radioHtml("exSplit", "equal", "Equal", e.split === "equal")}${radioHtml("exSplit", "exact", "Exact amounts", e.split === "exact")}${radioHtml("exSplit", "percent", "Percentage", e.split === "percent")}</div>
    ${memberRowsHtml(memberList, e)}
    <div id="exSumLine" class="small text-secondary mt-1"></div>`;
}

function openExpenseForm(id) {
  const team = needTeam();
  if (!team) return;

  const activeMembers = membersOf(team);
  if (activeMembers.length === 0) {
    showNotification("Add team members first (Team Members page).", "warning");
    return;
  }

  editingExpense = state.data.expenses.find((e) => e.id === id) || null;

  let expense = editingExpense;
  if (!expense) {
    expense = {
      kind: "expense",
      title: "",
      originalAmount: "",
      currency: "NGN",
      date: today(),
      category: CATEGORIES[0],
      payerId: activeMembers[0].id,
      split: "equal",
      participants: activeMembers.map((m) => m.id),
      raw: {},
    };
  }
  if (!expense.raw) expense.raw = {};

  const memberList = membersOf(team, true).filter(
    (m) =>
      m.active !== false ||
      expense.participants.includes(m.id) ||
      m.id === expense.payerId,
  );

  const body = openModal({
    title: editingExpense ? "Edit expense" : "Record expense or claim",
    size: "modal-lg",
    okText: "Save",
    body: expenseFormHtml(expense, memberList),
    onSubmit: saveExpense,
  });

  body.oninput = updateExpensePreview;
  updateExpensePreview();
  
  loadRates().then(function () {
    if (getEl("exAmount")) updateExpensePreview();
  });
}

function readExpenseForm() {
  const title = getEl("exTitle").value.trim();
  const original = parseFloat(getEl("exAmount").value);
  if (!title) return { error: "Title cannot be empty." };
  if (!(original > 0)) return { error: "Amount must be greater than 0." };
  if (!getEl("exDate").value) return { error: "Pick a date." };

  return {
    title: title,
    original: original,
    ids: getCheckedIds(),
    raw: getRawValues(),
    kind: getChecked("exKind"),
    currency: getEl("exCurrency").value,
    date: getEl("exDate").value,
    category: getEl("exCategory").value,
    payerId: getEl("exPayer").value,
    split: getChecked("exSplit"),
  };
}

function saveExpense() {
  const team = getTeam();
  const form = readExpenseForm();
  if (form.error) return form.error;

  const rate = rateFor(form.currency);
  if (!rate)
    return (
      "No exchange rate for " + form.currency + ". Go online once or use NGN."
    );

  const amount = Math.round((form.original * 100) / rate); // amount in kobo
  const result = splitExpense(
    form.split,
    amount,
    form.original,
    form.currency,
    form.ids,
    form.raw,
  );
  if (result.error) return result.error;

  let status = "pending";
  if (form.kind === "expense") status = "approved";
  else if (editingExpense && editingExpense.kind === "claim")
    status = editingExpense.status;

  const record = {
    id: editingExpense ? editingExpense.id : createId(),
    teamId: team.id,
    kind: form.kind,
    status: status,
    title: form.title,
    category: form.category,
    date: form.date,
    payerId: form.payerId,
    originalAmount: form.original,
    currency: form.currency,
    rate: rate,
    amount: amount,
    split: form.split,
    participants: form.ids,
    raw: form.raw,
    shares: result.shares,
  };

  if (editingExpense)
    Object.assign(editingExpense, record); // update in place
  else state.data.expenses.push(record);

  const verb = editingExpense ? "Updated" : "Added";
  logActivity(
    team,
    verb + " " + form.kind + " “" + form.title + "” · " + formatMoney(amount),
  );
  commit();
  refresh();

  if (form.kind === "claim" && status === "pending")
    showNotification("Claim submitted for approval.");
  else showNotification("Expense saved.");
}

function updateExpensePreview() {
  const currency = getEl("exCurrency").value;
  const split = getChecked("exSplit");
  const amount = parseFloat(getEl("exAmount").value) || 0;
  const rate = rateFor(currency);
  const totalKobo = rate ? Math.round((amount * 100) / rate) : 0;

  for (const input of document.querySelectorAll(".who-raw")) {
    input.style.display = split === "equal" ? "none" : "";
  }

  let rateText = "";
  if (currency !== "NGN" && rate) {
    rateText =
      "≈ " +
      formatMoney(totalKobo) +
      " (1 " +
      currency +
      " = " +
      formatMoney(100 / rate) +
      "; rate is saved with the expense)";
  } else if (currency !== "NGN") {
    rateText =
      "No rate available for " + currency + " – check your connection.";
  }
  setText("exRateInfo", rateText);

  const result = splitExpense(
    split,
    totalKobo,
    amount,
    currency,
    getCheckedIds(),
    getRawValues(),
  );
  for (const span of document.querySelectorAll(".who-share")) {
    const share = result.shares ? result.shares[span.dataset.id] : undefined;
    span.textContent = share !== undefined ? formatMoney(share) : "";
  }

  let sumText = "Shares add up to the total ✔";
  if (result.error) sumText = amount ? result.error : "";
  setText("exSumLine", sumText);
}

function openPaymentForm(prefill = {}) {
  const team = needTeam();
  if (!team) return;

  const members = membersOf(team);
  if (members.length < 2) {
    showNotification(
      "You need at least two members to record a payment.",
      "warning",
    );
    return;
  }

  const names = makeNameLookup(members);
  const memberOptions = members.map((m) => [m.id, m.name]);
  const fromId = prefill.from || members[0].id;
  const toId = prefill.to || members[1].id;
  const amountText = prefill.amount ? prefill.amount / 100 : "";

  openModal({
    title: "Record a payment",
    okText: "Record payment",
    body: `
      <label class="form-label small mb-1" for="payFrom">Paid by</label>
      <select class="form-select mb-2" id="payFrom">${optionsHtml(memberOptions, fromId)}</select>
      <label class="form-label small mb-1" for="payTo">Paid to</label>
      <select class="form-select mb-2" id="payTo">${optionsHtml(memberOptions, toId)}</select>
      <label class="form-label small mb-1" for="payAmount">Amount (NGN)</label>
      <input class="form-control mb-2" id="payAmount" type="number" step="0.01" min="0" value="${amountText}">
      <label class="form-label small mb-1" for="payDate">Date</label>
      <input class="form-control mb-2" id="payDate" type="date" value="${today()}">
      <label class="form-label small mb-1" for="payNote">Note (optional)</label>
      <input class="form-control" id="payNote" maxlength="80">`,
    onSubmit: function () {
      const from = getEl("payFrom").value;
      const to = getEl("payTo").value;
      const amount = Math.round(parseFloat(getEl("payAmount").value) * 100);

      if (from === to) return "Payer and receiver must be different people.";
      if (!(amount > 0)) return "Amount must be greater than 0.";

      state.data.payments.push({
        id: createId(),
        teamId: team.id,
        from: from,
        to: to,
        amount: amount,
        date: getEl("payDate").value || today(),
        note: getEl("payNote").value.trim(),
      });
      logActivity(
        team,
        names[from] + " paid " + names[to] + " " + formatMoney(amount),
      );
      commit();
      refresh();
      showNotification("Payment recorded.");
    },
  });
}

function openMemberForm(member) {
  const team = needTeam();
  if (!team) return;

  openModal({
    title: member ? "Edit member" : "Add member",
    body: `
      <label class="form-label small mb-1" for="memName">Name</label>
      <input class="form-control mb-2" id="memName" maxlength="40" value="${escapeHtml(member ? member.name : "")}">
      <label class="form-label small mb-1" for="memRole">Role (optional)</label>
      <input class="form-control" id="memRole" maxlength="40" value="${escapeHtml(member && member.role ? member.role : "")}">`,
    onSubmit: function () {
      const name = getEl("memName").value.trim();
      const role = getEl("memRole").value.trim();
      if (!name) return "Name cannot be empty.";

      const nameTaken = membersOf(team).some(
        (m) => m !== member && m.name.toLowerCase() === name.toLowerCase(),
      );
      if (nameTaken) return "A member with this name already exists.";

      if (member) {
        member.name = name;
        member.role = role;
      } else {
        state.data.members.push({
          id: createId(),
          teamId: team.id,
          name: name,
          role: role,
          active: true,
        });
        logActivity(team, "Added member " + name);
      }
      commit();
      refresh();
    },
  });
}

function removeMember(id) {
  const team = getTeam();
  const member = state.data.members.find((m) => m.id === id);
  const balances = teamBalances(team);
  const net = balances[id] ? balances[id].net : 0;

  if (net !== 0) {
    const situation = net > 0 ? "is still owed" : "still owes";
    openModal({
      title: "Cannot remove member",
      body: `<p class="mb-0">
      <b>${escapeHtml(member.name)}</b> ${situation} <b>${formatMoney(Math.abs(net))}</b>.
       Record a payment first, then remove them.</p>`,
    });
    return;
  }

  confirmDialog(
    "Remove " +
      escapeHtml(member.name) +
      "? Their past expenses stay in the history.",
    function () {
      member.active = false;
      commit();
      refresh();
    },
    "Remove",
  );
}


let viewMonth = monthOf(today());
let spendingChart = null;
let memberChart = null;

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function previousMonth(monthKey) {
  const parts = monthKey.split("-");
  const date = new Date(Number(parts[0]), Number(parts[1]) - 2, 1);
  return (
    date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0")
  );
}

function showSpendingChange(approved, periodTotal) {
  const badge = getEl("spendingChange");

  if (viewMonth === "all") {
    badge.textContent = "All-time total";
    badge.className = "small-badge blue-badge";
    return;
  }

  const lastMonth = approved.filter(
    (e) => monthOf(e.date) === previousMonth(viewMonth),
  );
  const lastTotal = sumAmounts(lastMonth);
  if (lastTotal === 0) {
    badge.textContent = "No data last month";
    badge.className = "small-badge green-badge";
    return;
  }

  const percent = Math.round(((periodTotal - lastTotal) / lastTotal) * 100);
  let arrow = "";
  if (percent > 0) arrow = "▲ ";
  if (percent < 0) arrow = "▼ ";
  badge.textContent = arrow + Math.abs(percent) + "% vs last month";
  badge.className =
    "small-badge " + (percent > 0 ? "orange-badge" : "green-badge");
}

function showRecentActivity(team) {
  const recent = state.data.activities
    .filter((a) => team && a.teamId === team.id)
    .slice(0, 6);
  let html = "";
  for (const activity of recent) {
    const when = new Date(activity.at).toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    html += `<div class="row-item">
    <div class="row-main small">${escapeHtml(activity.text)}</div>
    <small class="text-secondary">${when}</small>
    </div>`;
  }
  if (html === "")
    html = `<div class="empty-state">No activity yet. Add the first expense or claim.</div>`;
  getEl("recentActivity").innerHTML = html;
}

function drawCategoryChart(inView) {
  const totals = {};
  for (const expense of inView) {
    totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
  }
  const categories = Object.keys(totals);
  const colors = categories.map(
    (c, i) => CHART_COLORS[i % CHART_COLORS.length],
  );

  if (spendingChart) spendingChart.destroy();
  spendingChart = new Chart(getEl("spendingCategoryChart"), {
    type: "doughnut",
    data: {
      labels: categories,
      datasets: [
        {
          data: categories.map((c) => totals[c] / 100),
          backgroundColor: colors,
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
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => item.label + ": " + formatMoney(item.raw * 100),
          },
        },
      },
    },
  });

  let legend = "";
  for (let i = 0; i < categories.length; i++) {
    legend += `<div class="legend-item"><span class="legend-dot" style="background:${colors[i]}"></span><span class="legend-name">${escapeHtml(categories[i])}</span><span class="legend-value">${formatMoney(totals[categories[i]])}</span></div>`;
  }
  if (legend === "")
    legend = `<div class="text-secondary small">No spending in this period.</div>`;
  getEl("categoryLegend").innerHTML = legend;
}

function drawMemberChart(inView, members) {
  const paid = {};
  const share = {};
  for (const expense of inView) {
    paid[expense.payerId] = (paid[expense.payerId] || 0) + expense.amount;
    for (const id in expense.shares) {
      share[id] = (share[id] || 0) + expense.shares[id];
    }
  }

  const shown = members.filter(
    (m) => m.active !== false || paid[m.id] || share[m.id],
  );

  if (memberChart) memberChart.destroy();
  memberChart = new Chart(getEl("memberContributionChart"), {
    type: "bar",
    data: {
      labels: shown.map((m) => m.name),
      datasets: [
        {
          label: "Paid / Claimed",
          data: shown.map((m) => (paid[m.id] || 0) / 100),
          backgroundColor: "#172554",
          borderRadius: 3,
        },
        {
          label: "Allocated Share",
          data: shown.map((m) => (share[m.id] || 0) / 100),
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
          labels: { boxWidth: 8, boxHeight: 8, font: { size: 9 } },
        },
        tooltip: {
          callbacks: {
            label: (item) =>
              item.dataset.label + ": " + formatMoney(item.raw * 100),
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 9 } } },
        y: {
          beginAtZero: true,
          grid: { color: "#F1F5F9" },
          ticks: {
            font: { size: 9 },
            callback: (value) => formatMoney(value * 100),
          },
        },
      },
    },
  });
}

function renderDashboard() {
  const team = getTeam();
  const members = team ? membersOf(team, true) : [];
  const allExpenses = team ? expensesOf(team) : [];
  const approved = allExpenses.filter((e) => e.status === "approved");

  let inView = approved;
  if (viewMonth !== "all")
    inView = approved.filter((e) => monthOf(e.date) === viewMonth);

  const balances = team ? teamBalances(team) : {};
  const netValues = Object.values(balances).map((b) => b.net);
  const periodText = viewMonth === "all" ? "All time" : monthLabel(viewMonth);
  const periodTotal = sumAmounts(inView);

  setText("greetingMessage", greeting());
  setText(
    "teamIntro",
    team
      ? "Here's your team's financial overview for " + team.name + "."
      : "Create a team to get started.",
  );
  setText("currentMonth", periodText);

  if (team) {
    getEl("dashboardNotice").innerHTML = "";
  } else {
    getEl("dashboardNotice").innerHTML =
      `<div class="alert alert-info d-flex justify-content-between align-items-center mb-0">Create your first team to start tracking petty cash.<button class="btn btn-sm btn-navy" id="noticeBtn" type="button">Create team</button></div>`;
    getEl("noticeBtn").onclick = () => openTeamForm();
  }

  setText("totalTeamSpending", formatMoney(periodTotal));
  setText("spendingPeriod", periodText);
  showSpendingChange(approved, periodTotal);

  let membersToSettle = 0;
  let totalDebt = 0;
  let imbalance = 0;
  for (const net of netValues) {
    if (net !== 0) membersToSettle++;
    if (net < 0) totalDebt = totalDebt - net;
    imbalance = imbalance + net;
  }
  setText("membersToSettle", membersToSettle);
  setText("settlementBalance", formatMoney(totalDebt) + " to balance");

  getEl("auditTitle").firstChild.textContent =
    imbalance === 0 ? "Ledger balanced " : "Ledger out of balance ";

  setText("chartTotalSpending", formatMoney(periodTotal));
  setText(
    "chartExpenseCount",
    inView.length + (inView.length === 1 ? " expense" : " expenses"),
  );
  if (typeof Chart !== "undefined") {
    drawCategoryChart(inView);
    drawMemberChart(inView, members);
  }
  showRecentActivity(team);
}

function openPeriodPicker() {
  const team = getTeam();
  const months = [monthOf(today())];
  if (team) {
    for (const expense of expensesOf(team)) {
      const month = monthOf(expense.date);
      if (!months.includes(month)) months.push(month);
    }
  }
  months.sort().reverse();

  let optionTags = `<option value="all" ${viewMonth === "all" ? "selected" : ""}>All time</option>`;
  for (const month of months) {
    optionTags += `<option value="${month}" ${month === viewMonth ? "selected" : ""}>${monthLabel(month)}</option>`;
  }

  openModal({
    title: "Choose period",
    okText: "Apply",
    body: `<select class="form-select" id="monthPick" aria-label="Period">${optionTags}</select>`,
    onSubmit: function () {
      viewMonth = getEl("monthPick").value;
      renderDashboard();
    },
  });
}

function startDashboard() {
  getEl("addExpenseBtn").addEventListener("click", () => openExpenseForm());
  getEl("recordPaymentBtn").addEventListener("click", () => openPaymentForm());
  getEl("filtersBtn").addEventListener(
    "click",
    () => (location.href = pagesPath + "expenses.html"),
  );
  getEl("auditSheetBtn").addEventListener(
    "click",
    () => (location.href = pagesPath + "balances.html"),
  );
  getEl("adjustRulesBtn").addEventListener(
    "click",
    () => (location.href = pagesPath + "members.html"),
  );
  getEl("dateFilterBtn").addEventListener("click", openPeriodPicker);
  initPage(renderDashboard);
}

const expenseFilters = {
  q: new URLSearchParams(location.search).get("q") || "",
  member: "",
  category: "",
  month: "",
  status: "",
};

function claimBadge(expense) {
  if (expense.kind !== "claim") return "";
  let color = "text-bg-warning";
  if (expense.status === "approved") color = "badge-pos";
  if (expense.status === "rejected") color = "badge-neg";
  return `<span class="badge ${color}">Claim · ${expense.status}</span>`;
}

function reviewButtons(expense) {
  const approve = `<button class="btn btn-sm btn-link p-0" data-action="approve" data-id="${expense.id}">Approve</button> `;
  const reject = `<button class="btn btn-sm btn-link text-danger p-0" data-action="reject" data-id="${expense.id}">Reject</button> `;
  if (expense.status === "pending") return approve + reject;
  if (expense.status === "rejected") return approve;
  return "";
}

function expenseRowHtml(expense, names) {
  const payerName = names[expense.payerId] || "Unknown";
  const paidWord = expense.kind === "claim" ? "Claimed" : "Paid";
  let foreign = "";
  if (expense.currency !== "NGN")
    foreign =
      " · " + formatMoney(expense.originalAmount * 100, expense.currency);

  return `<div class="row-item"><div class="row-icon"><i class="bi bi-receipt"></i></div>
    <div class="row-main">
      <div class="fw-semibold text-truncate">${escapeHtml(expense.title)} ${claimBadge(expense)}</div>
      <div class="small text-secondary">${escapeHtml(expense.category)} · ${paidWord} by ${escapeHtml(payerName)} · ${formatDate(expense.date)} · ${expense.split} split${foreign}</div>
    </div>
    <div class="text-end"><b>${formatMoney(expense.amount)}</b>
      <div>${reviewButtons(expense)}<button class="btn btn-sm btn-link p-0" data-action="edit" data-id="${expense.id}"></button>
        <span class="badge rounded-pill balance-badge p-2" data-action="delete" data-id="${expense.id}">Settled</span></div>
    </div></div>`;
}

function expenseMatches(expense) {
  const search = expenseFilters.q.toLowerCase();
  if (expenseFilters.member) {
    const isPayer = expense.payerId === expenseFilters.member;
    const hasShare = expense.shares[expenseFilters.member] !== undefined;
    if (!isPayer && !hasShare) return false;
  }
  if (expenseFilters.category && expense.category !== expenseFilters.category)
    return false;
  if (expenseFilters.month && monthOf(expense.date) !== expenseFilters.month)
    return false;
  if (expenseFilters.status && expense.status !== expenseFilters.status)
    return false;
  if (search && !expense.title.toLowerCase().includes(search)) return false;
  return true;
}

function filterSelect(key, allLabel, options) {
  const selectedOptions = options.map(
    (o) =>
      `<option value="${escapeHtml(o[0])}" ${expenseFilters[key] === o[0] ? "selected" : ""}>${escapeHtml(o[1])}</option>`,
  );
  return `<div><select class="form-select form-select-sm" data-filter="${key}" aria-label="${allLabel}">
    <option value="">${allLabel}</option>${selectedOptions.join("")}</select></div>`;
}

function renderExpensesPage() {
  const el = getEl("pageContent");
  const team = getTeam();
  if (!team) return renderNoTeam(el);

  const members = membersOf(team, true);
  const names = makeNameLookup(members);
  const allExpenses = expensesOf(team);
  const shown = allExpenses
    .filter(expenseMatches)
    .sort((a, b) => b.date.localeCompare(a.date));

  const months = [...new Set(allExpenses.map((e) => monthOf(e.date)))]
    .sort()
    .reverse();

  const memberOptions = members.map((m) => [m.id, m.name]);
  const monthOptions = months.map((m) => [m, monthLabel(m)]);
  const statusOptions = [
    ["approved", "Approved"],
    ["pending", "Pending"],
    ["rejected", "Rejected"],
  ];

  let list = "";
  for (const expense of shown) {
    list += expenseRowHtml(expense, names);
  }
  if (shown.length === 0) {
    const message =
      allExpenses.length > 0
        ? "No expenses match these filters."
        : "No expenses yet. Add the first claim or bill for this team.";
    list = `<div class="empty-state"><i class="bi bi-receipt"></i>${message}</div>`;
  }

  el.innerHTML =
    heading(
      "Expenses & claims",
      `<button class="btn btn-navy" data-action="add"><i class="bi bi-plus-lg"></i> Add expense or claim</button>`,
    ) +
    `<div class="panel">
    <div class="expensesFilter">
       ${filterSelect("category", "All categories", pairs(CATEGORIES))}
       ${filterSelect("month", "All months", monthOptions)}
       ${filterSelect("status", "Any status", statusOptions)}
     </div>
     </div>
     <div class="panel">${list}</div>`;
}

function setExpenseStatus(id, status) {
  const expense = state.data.expenses.find((e) => e.id === id);
  expense.status = status;
  logActivity(getTeam(), "Claim “" + expense.title + "” " + status);
  commit();
  refresh();
}

function startExpensesPage() {
  const el = getEl("pageContent");
  onAction(el, {
    add: () => openExpenseForm(),
    edit: (data) => openExpenseForm(data.id),
    approve: (data) => setExpenseStatus(data.id, "approved"),
    reject: (data) => setExpenseStatus(data.id, "rejected"),
    delete: function (data) {
      confirmDialog("Delete this expense? Balances will update.", function () {
        state.data.expenses = state.data.expenses.filter(
          (e) => e.id !== data.id,
        );
        commit();
        refresh();
      });
    },
  });

  el.addEventListener("change", function (event) {
    const key = event.target.dataset.filter;
    if (key) {
      expenseFilters[key] = event.target.value;
      renderExpensesPage();
    }
  });

  initPage(renderExpensesPage, function (text) {
    expenseFilters.q = text;
    renderExpensesPage();
  });
}

function signedMoney(amount) {
  return (amount > 0 ? "+" : "") + formatMoney(amount);
}

function balanceSummaryCard(label, value, cssClass = "") {
  return `<div class="col-12 col-md-4"><div class="panel mb-0">
    <small class="text-secondary">${label}</small>
    <div class="fs-5 fw-bold ${cssClass}">${formatMoney(value)}</div></div></div>`;
}

function balanceRowHtml(member, row) {
  let netClass = "";
  if (row.net > 0) netClass = "pos";
  if (row.net < 0) netClass = "neg";
  return `<tr>
    <td><b>${escapeHtml(member.name)}</b><div class="small text-secondary">${escapeHtml(member.role || "")}</div></td>
    <td class="text-end">${formatMoney(row.paid)}</td>
    <td class="text-end">${formatMoney(row.share)}</td>
    <td class="text-end">${formatMoney(row.settled)}</td>
    <td class="text-end ${netClass}">${signedMoney(row.net)}</td>
    <td>${balanceBadge(row.net)}</td>
  </tr>`;
}

function renderBalancesPage() {
  const el = getEl("pageContent");
  const team = getTeam();
  if (!team) return renderNoTeam(el);

  const balances = teamBalances(team);

  const members = membersOf(team, true).filter(
    (m) => m.active !== false || balances[m.id].net !== 0,
  );

  let totalOwed = 0;
  let totalOwes = 0;
  for (const member of members) {
    const net = balances[member.id].net;
    if (net > 0) totalOwed = totalOwed + net;
    if (net < 0) totalOwes = totalOwes - net;
  }

  let table = `<div class="empty-state"><i class="bi bi-people"></i>No members yet. Add your team first.</div>`;
  if (members.length > 0) {
    let rows = "";
    for (const member of members) {
      rows += balanceRowHtml(member, balances[member.id]);
    }
    table = `<table class="table align-middle mb-0"><thead><tr>
      <th>Member</th><th class="text-end">Paid / claimed</th><th class="text-end">Share</th>
      <th class="text-end">Settled</th><th class="text-end">Net</th><th>Status</th>
      </tr></thead><tbody>${rows}</tbody></table>`;
  }

  el.innerHTML =
    heading(
      "Team balances",
      `<button class="btn btn-navy" data-action="settle">Settle up</button>`,
    ) +
    `<div class="row g-3 mb-3">
       ${balanceSummaryCard("Owed to members", totalOwed, "pos")}
       ${balanceSummaryCard("Outstanding debts", totalOwes, "neg")}
       ${balanceSummaryCard("Net total", totalOwed - totalOwes)}
     </div>
     <div class="panel table-responsive">${table}</div>`;
}

function startBalancesPage() {
  onAction(getEl("pageContent"), {
    settle: () => (location.href = pagesPath + "settle-up.html"),
  });
  initPage(renderBalancesPage);
}

let settlePlan = []; 

function settleRowHtml(payment, index, names) {
  return `<div class="row-item">
    <div class="row-icon">${index + 1}</div>
    <div class="row-main"><b>${escapeHtml(names[payment.from])}</b> pays <b>${escapeHtml(names[payment.to])}</b></div>
    <b>${formatMoney(payment.amount)}</b>
    <button class="btn btn-sm btn-navy" data-action="record" data-i="${index}">Record</button>
  </div>`;
}

function renderSettleUpPage() {
  const el = getEl("pageContent");
  const team = getTeam();
  if (!team) return renderNoTeam(el);

  const names = makeNameLookup(membersOf(team, true));
  settlePlan = createSettlementPlan(teamBalances(team));

  let body = `<div class="empty-state"><i class="bi bi-check-circle"></i>All settled. Nobody owes anything.</div>`;
  if (settlePlan.length > 0) {
    const plural = settlePlan.length > 1 ? "s" : "";
    body = `<p class="text-secondary small">${settlePlan.length} payment${plural} clear every debt.</p>`;
    for (let i = 0; i < settlePlan.length; i++) {
      body += settleRowHtml(settlePlan[i], i, names);
    }
  }
  el.innerHTML = heading("Settle up") + `<div class="panel">${body}</div>`;
}

function startSettleUpPage() {

  onAction(getEl("pageContent"), {
    record: (data) => openPaymentForm(settlePlan[Number(data.i)]),
  });
  initPage(renderSettleUpPage);
}


function paymentRowHtml(payment, names) {
  const note = payment.note ? " · " + escapeHtml(payment.note) : "";
  return `<div class="row-item"><div class="row-icon"><i class="bi bi-cash-stack"></i></div>
    <div class="row-main">
      <div class="fw-semibold">${escapeHtml(names[payment.from])} paid ${escapeHtml(names[payment.to])}</div>
      <div class="small text-secondary">${formatDate(payment.date)}${note}</div>
    </div>
    <div class="text-end"><b class="pos">${formatMoney(payment.amount)}</b>
      <div><button class="btn btn-sm btn-link text-danger p-0" data-action="delete" data-id="${payment.id}">Delete</button></div>
    </div></div>`;
}

function renderPaymentsPage() {
  const el = getEl("pageContent");
  const team = getTeam();
  if (!team) return renderNoTeam(el);

  const names = makeNameLookup(membersOf(team, true));
  const payments = paymentsOf(team)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date)); // newest first

  let body = `<div class="empty-state"><i class="bi bi-cash-stack"></i>No payments yet. Record one when someone pays a teammate.</div>`;
  if (payments.length > 0) {
    body = "";
    for (const payment of payments) {
      body += paymentRowHtml(payment, names);
    }
  }

  el.innerHTML =
    heading(
      "Payments",
      `<button class="btn btn-navy" data-action="add"><i class="bi bi-plus-lg"></i> Record payment</button>`,
    ) + `<div class="panel">${body}</div>`;
}

function startPaymentsPage() {
  onAction(getEl("pageContent"), {
    add: () => openPaymentForm(),
    delete: function (data) {
      confirmDialog(
        "Delete this payment record? Balances will update.",
        function () {
          state.data.payments = state.data.payments.filter(
            (p) => p.id !== data.id,
          );
          commit();
          refresh();
        },
      );
    },
  });
  initPage(renderPaymentsPage);
}

function memberRowHtml(member, balances) {
  const net = balances[member.id] ? balances[member.id].net : 0;
  return `<div class="row-item">
    <div class="row-icon">${escapeHtml(initials(member.name))}</div>
    <div class="row-main"><b>${escapeHtml(member.name)}</b><div class="small text-secondary">${escapeHtml(member.role || "Member")}</div></div>
    ${balanceBadge(net)}
    <button class="btn btn-sm btn-outline-secondary" data-action="edit" data-id="${member.id}">Edit</button>
    <button class="btn btn-sm btn-outline-danger" data-action="remove" data-id="${member.id}">Remove</button>
  </div>`;
}

function renderMembersPage() {
  const el = getEl("pageContent");
  const team = getTeam();
  if (!team) return renderNoTeam(el);

  const balances = teamBalances(team);
  const members = membersOf(team);

  let list = `<div class="empty-state"><i class="bi bi-people"></i>No members yet. Add the first member of this team.</div>`;
  if (members.length > 0) {
    list = "";
    for (const member of members) {
      list += memberRowHtml(member, balances);
    }
  }

  el.innerHTML =
    heading(
      "Team members",
      `<button class="btn btn-navy" data-action="add"><i class="bi bi-person-plus"></i> Add member</button>`,
    ) +
    `<div class="panel">${list}</div>
     <div class="panel d-flex gap-2 flex-wrap align-items-center">
       <b class="me-auto">${escapeHtml(team.name)}</b>
       <button class="btn btn-sm btn-outline-secondary" data-action="rename">Rename team</button>
       <button class="btn btn-sm btn-outline-danger" data-action="deleteTeam">Delete team</button>
     </div>`;
}

function deleteActiveTeam() {
  const teamId = getTeam().id;
  const data = state.data;

  data.teams = data.teams.filter((t) => t.id !== teamId);
  data.members = data.members.filter((m) => m.teamId !== teamId);
  data.expenses = data.expenses.filter((e) => e.teamId !== teamId);
  data.payments = data.payments.filter((p) => p.teamId !== teamId);
  data.activities = data.activities.filter((a) => a.teamId !== teamId);
  data.settings.activeTeamId = null;

  commit();
  refresh();
}

function startMembersPage() {
  onAction(getEl("pageContent"), {
    add: () => openMemberForm(),
    edit: (data) =>
      openMemberForm(state.data.members.find((m) => m.id === data.id)),
    remove: (data) => removeMember(data.id),
    rename: () => openTeamForm(getTeam()),
    deleteTeam: () =>
      confirmDialog(
        "Delete this team and all its members, expenses and payments?",
        deleteActiveTeam,
      ),
  });
  initPage(renderMembersPage);
}

const HISTORY_PAGE_SIZE = 10; 
const historyFilters = { q: "", member: "", category: "", month: "" };
let historyPage = 1;

const STATUS_BADGE = {
  approved: "badge-pos",
  rejected: "badge-neg",
  pending: "text-bg-warning",
  completed: "badge-pos",
};

function capitalise(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function buildHistoryRows(team) {
  const names = makeNameLookup(membersOf(team, true));
  const rows = [];

  for (const e of expensesOf(team)) {
    rows.push({
      date: e.date,
      type: e.kind === "claim" ? "Claim" : "Expense",
      title: e.title,
      memberIds: [e.payerId],
      member: names[e.payerId] || "Unknown",
      category: e.category,
      amount: e.amount,
      status: e.status,
    });
  }
  for (const p of paymentsOf(team)) {
    rows.push({
      date: p.date,
      type: "Payment",
      title: p.note || "Payment",
      memberIds: [p.from, p.to],
      member: (names[p.from] || "Unknown") + " → " + (names[p.to] || "Unknown"),
      category: "Settlement",
      amount: p.amount,
      status: "completed",
    });
  }

  rows.sort((a, b) => b.date.localeCompare(a.date)); 
  return rows;
}

function fillSelect(id, firstLabel, options, currentValue) {
  let html = `<option value="">${firstLabel}</option>`;
  let stillExists = false;
  for (const option of options) {
    html += `<option value="${escapeHtml(option[0])}">${escapeHtml(option[1])}</option>`;
    if (option[0] === currentValue) stillExists = true;
  }
  getEl(id).innerHTML = html;
  getEl(id).value = stillExists ? currentValue : "";
}

function historyRowMatches(row) {
  const search = historyFilters.q.trim().toLowerCase();
  if (search && !row.title.toLowerCase().includes(search)) return false;
  if (historyFilters.member && !row.memberIds.includes(historyFilters.member))
    return false;
  if (historyFilters.category && row.category !== historyFilters.category)
    return false;
  if (historyFilters.month && monthOf(row.date) !== historyFilters.month)
    return false;
  return true;
}

function countType(rows, type) {
  return rows.filter((row) => row.type === type).length;
}

function historyRowHtml(row) {
  const badge = STATUS_BADGE[row.status] || "text-bg-secondary";
  return `<tr>
    <td>${formatDate(row.date)}</td><td>${row.type}</td><td>${escapeHtml(row.title)}</td>
    <td>${escapeHtml(row.member)}</td><td>${escapeHtml(row.category)}</td>
    <td class="fw-semibold">${formatMoney(row.amount)}</td>
    <td><span class="badge ${badge}">${capitalise(row.status)}</span></td>
  </tr>`;
}

function renderHistoryPage() {
  const team = getTeam();
  const members = team ? membersOf(team, true) : [];
  const rows = team ? buildHistoryRows(team) : [];

  setText("historyCurrentMonth", monthLabel(monthOf(today())));

  const months = [...new Set(rows.map((r) => monthOf(r.date)))]
    .sort()
    .reverse();
  fillSelect(
    "historyMemberFilter",
    "All members",
    members.map((m) => [m.id, m.name]),
    historyFilters.member,
  );
  fillSelect(
    "historyCategoryFilter",
    "All categories",
    pairs(CATEGORIES.concat(["Settlement"])),
    historyFilters.category,
  );
  fillSelect(
    "historyMonthFilter",
    "All months",
    months.map((m) => [m, monthLabel(m)]),
    historyFilters.month,
  );

  historyFilters.member = getEl("historyMemberFilter").value;
  historyFilters.category = getEl("historyCategoryFilter").value;
  historyFilters.month = getEl("historyMonthFilter").value;

  const shown = rows.filter(historyRowMatches);

  const uniqueMembers = new Set();
  for (const row of shown) {
    for (const id of row.memberIds) {
      uniqueMembers.add(id);
    }
  }
  setText("historyTotalActivities", shown.length);
  setText("historyTotalExpenses", countType(shown, "Expense"));
  setText("historyTotalPayments", countType(shown, "Payment"));
  setText("historyTotalClaims", countType(shown, "Claim"));
  setText("historyTotalMembers", uniqueMembers.size);

  const totalPages = Math.max(1, Math.ceil(shown.length / HISTORY_PAGE_SIZE));
  if (historyPage > totalPages) historyPage = totalPages;
  const start = (historyPage - 1) * HISTORY_PAGE_SIZE;
  const visible = shown.slice(start, start + HISTORY_PAGE_SIZE);

  let tableRows = "";
  for (const row of visible) {
    tableRows += historyRowHtml(row);
  }
  getEl("historyTableBody").innerHTML = tableRows;
  getEl("historyEmptyState").hidden = visible.length > 0;

  if (shown.length > 0) {
    setText(
      "historyResultsCount",
      "Showing " +
        (start + 1) +
        "–" +
        (start + visible.length) +
        " of " +
        shown.length +
        " activities",
    );
    setText("historyPageNumber", "Page " + historyPage + " of " + totalPages);
  } else {
    setText("historyResultsCount", "No activities to display");
    setText("historyPageNumber", "—");
  }
  getEl("historyPrevPage").disabled = historyPage <= 1;
  getEl("historyNextPage").disabled = historyPage >= totalPages;
}

function historyFilterChanged(key) {
  return function (event) {
    historyFilters[key] = event.target.value;
    historyPage = 1;
    renderHistoryPage();
  };
}

function startHistoryPage() {
  getEl("historySearch").addEventListener("input", historyFilterChanged("q"));
  getEl("historyMemberFilter").addEventListener(
    "change",
    historyFilterChanged("member"),
  );
  getEl("historyCategoryFilter").addEventListener(
    "change",
    historyFilterChanged("category"),
  );
  getEl("historyMonthFilter").addEventListener(
    "change",
    historyFilterChanged("month"),
  );

  getEl("historyPrevPage").addEventListener("click", function () {
    historyPage--;
    renderHistoryPage();
  });
  getEl("historyNextPage").addEventListener("click", function () {
    historyPage++;
    renderHistoryPage();
  });
  getEl("historyResetFilters").addEventListener("click", function () {
    historyFilters.q = "";
    historyFilters.member = "";
    historyFilters.category = "";
    historyFilters.month = "";
    getEl("historySearch").value = "";
    historyPage = 1;
    renderHistoryPage();
  });

  initPage(renderHistoryPage, function (text) {
    historyFilters.q = text;
    getEl("historySearch").value = text;
    historyPage = 1;
    renderHistoryPage();
  });
}

function startComingSoonPage() {
  const el = getEl("pageContent");
  const title = el.dataset.title; 
  const icon = el.dataset.icon || "bi-hourglass-split";

  initPage(function () {
    el.innerHTML =
      heading(escapeHtml(title)) +
      `<div class="panel empty-state"><i class="bi ${escapeHtml(icon)}"></i><p>${escapeHtml(title)} is coming soon.</p></div>`;
  });
}

const pageName = location.pathname.split("/").pop(); 

if (pageName === "" || pageName === "index.html") startDashboard();
else if (pageName === "expenses.html") startExpensesPage();
else if (pageName === "balances.html") startBalancesPage();
else if (pageName === "settle-up.html") startSettleUpPage();
else if (pageName === "payments.html") startPaymentsPage();
else if (pageName === "members.html") startMembersPage();
else if (pageName === "history.html") startHistoryPage();
else startComingSoonPage(); 
