// Team Members page
import { state, commit, getTeam, membersOf } from "../core/state.js";
import { initPage, heading, onAction, renderNoTeam, openTeamForm, teamBalances, balanceBadge, refresh } from "../core/shell.js";
import { openMemberForm, removeMember, initials } from "../features/forms.js";
import { confirmDialog } from "../utils/modal.js";
import { escapeHtml } from "../utils/format.js";

const el = document.getElementById("pageContent");

function render() {
  const team = getTeam();
  if (!team) return renderNoTeam(el);
  const balances = teamBalances(team), members = membersOf(team);
  el.innerHTML = heading("Team members", `<button class="btn btn-navy" data-action="add"><i class="bi bi-person-plus"></i> Add member</button>`) +
    `<div class="panel">${members.length ? members.map((m) => `<div class="row-item"><div class="row-icon">${escapeHtml(initials(m.name))}</div>
      <div class="row-main"><b>${escapeHtml(m.name)}</b><div class="small text-secondary">${escapeHtml(m.role || "Member")}</div></div>
      ${balanceBadge(balances[m.id]?.net ?? 0)}
      <button class="btn btn-sm btn-outline-secondary" data-action="edit" data-id="${m.id}">Edit</button>
      <button class="btn btn-sm btn-outline-danger" data-action="remove" data-id="${m.id}">Remove</button></div>`).join("")
      : `<div class="empty-state"><i class="bi bi-people"></i>No members yet. Add the first member of this team.</div>`}</div>
    <div class="panel d-flex gap-2 flex-wrap align-items-center"><b class="me-auto">${escapeHtml(team.name)}</b>
      <button class="btn btn-sm btn-outline-secondary" data-action="rename">Rename team</button>
      <button class="btn btn-sm btn-outline-danger" data-action="deleteTeam">Delete team</button></div>`;
}

onAction(el, {
  add: () => openMemberForm(),
  edit: ({ id }) => openMemberForm(state.data.members.find((m) => m.id === id)),
  remove: ({ id }) => removeMember(id),
  rename: () => openTeamForm(getTeam()),
  deleteTeam: () => confirmDialog("Delete this team and all its members, expenses and payments?", () => {
    const id = getTeam().id, d = state.data, keep = (x) => x.teamId !== id;
    d.teams = d.teams.filter((t) => t.id !== id);
    ["members", "expenses", "payments", "activities"].forEach((k) => (d[k] = d[k].filter(keep)));
    d.settings.activeTeamId = null;
    commit(); refresh();
  }),
});

initPage({ onRender: render });
