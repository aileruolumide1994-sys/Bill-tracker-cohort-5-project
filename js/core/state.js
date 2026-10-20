// The single source of truth: state.data is the object saved in localStorage.
import { loadData, saveData, createInitialData } from "./storage.js";
import { showNotification } from "../utils/notification.js";
import { createId } from "../utils/format.js";

function safeLoad() {
  try {
    return loadData();
  } catch {
    try { localStorage.setItem("officeflow_data_backup", localStorage.getItem("officeflow_data") ?? ""); } catch { /* ignore */ }
    return createInitialData();
  }
}

export const state = { data: safeLoad() };

export function commit() {
  try { saveData(state.data); return true; }
  catch (error) { showNotification(error.message, "danger"); return false; }
}

export function getTeam() {
  const d = state.data;
  const team = d.teams.find((t) => t.id === d.settings.activeTeamId) ?? d.teams[0] ?? null;
  d.settings.activeTeamId = team?.id ?? null;
  return team;
}
export function setTeam(id) { state.data.settings.activeTeamId = id; commit(); }

export const membersOf = (team, includeArchived = false) =>
  state.data.members.filter((m) => m.teamId === team.id && (includeArchived || m.active !== false));
export const expensesOf = (team) => state.data.expenses.filter((e) => e.teamId === team.id);
export const paymentsOf = (team) => state.data.payments.filter((p) => p.teamId === team.id);

export function logActivity(team, text) {
  state.data.activities.unshift({ id: createId(), teamId: team.id, text, at: new Date().toISOString() });
  state.data.activities.length = Math.min(state.data.activities.length, 200);
}
