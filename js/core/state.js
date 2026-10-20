// "state" holds all of the app's data in one place.
// Whenever you change state.data, call commit() to save it.
import { loadData, saveData, createInitialData } from "./storage.js";
import { showNotification } from "../utils/notification.js";
import { createId } from "../utils/format.js";

// Load saved data. If it's broken, keep a backup copy and start fresh.
function safeLoad() {
  try {
    return loadData();
  } catch (error) {
    const brokenData = localStorage.getItem("officeflow_data");
    localStorage.setItem("officeflow_data_backup", brokenData || "");
    return createInitialData();
  }
}

export const state = { data: safeLoad() };

// Save the current data. Returns true if it worked.
export function commit() {
  try {
    saveData(state.data);
    return true;
  } catch (error) {
    showNotification(error.message, "danger");
    return false;
  }
}

// Get the team the user is currently looking at (or null if none exist)
export function getTeam() {
  const data = state.data;

  let team = data.teams.find(function (t) {
    return t.id === data.settings.activeTeamId;
  });
  if (!team) {
    team = data.teams[0] || null; // fall back to the first team
  }

  data.settings.activeTeamId = team ? team.id : null;
  return team;
}

// Switch to a different team
export function setTeam(id) {
  state.data.settings.activeTeamId = id;
  commit();
}

// All members of a team. Archived members are hidden unless includeArchived is true.
export function membersOf(team, includeArchived = false) {
  return state.data.members.filter(function (member) {
    const inThisTeam = member.teamId === team.id;
    const isActive = member.active !== false;
    return inThisTeam && (includeArchived || isActive);
  });
}

export function expensesOf(team) {
  return state.data.expenses.filter(function (expense) {
    return expense.teamId === team.id;
  });
}

export function paymentsOf(team) {
  return state.data.payments.filter(function (payment) {
    return payment.teamId === team.id;
  });
}

// Add a line to the "recent activity" list (newest first, keep only 200)
export function logActivity(team, text) {
  state.data.activities.unshift({
    id: createId(),
    teamId: team.id,
    text: text,
    at: new Date().toISOString(),
  });

  if (state.data.activities.length > 200) {
    state.data.activities.length = 200;
  }
}
