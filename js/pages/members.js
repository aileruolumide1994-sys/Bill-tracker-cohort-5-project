// Team Members page
import { state, commit, getTeam, membersOf } from "../core/state.js";
import { initPage, heading, onAction, renderNoTeam, openTeamForm, teamBalances, balanceBadge, refresh } from "../core/shell.js";
import { openMemberForm, removeMember, initials } from "../features/forms.js";
import { confirmDialog } from "../utils/modal.js";
import { escapeHtml } from "../utils/format.js";

const pageContent = document.getElementById("pageContent");

// HTML for one member in the list
function memberRowHtml(member, balances) {
  let net = 0;
  if (balances[member.id]) {
    net = balances[member.id].net;
  }

  return `
    <div class="row-item">
      <div class="row-icon">${escapeHtml(initials(member.name))}</div>
      <div class="row-main">
        <b>${escapeHtml(member.name)}</b>
        <div class="small text-secondary">${escapeHtml(member.role || "Member")}</div>
      </div>
      ${balanceBadge(net)}
      <button class="btn btn-sm btn-outline-secondary" data-action="edit" data-id="${member.id}">Edit</button>
      <button class="btn btn-sm btn-outline-danger" data-action="remove" data-id="${member.id}">Remove</button>
    </div>`;
}

function render() {
  const team = getTeam();
  if (!team) {
    renderNoTeam(pageContent);
    return;
  }

  const balances = teamBalances(team);
  const members = membersOf(team);

  let list = "";
  if (members.length === 0) {
    list = `<div class="empty-state"><i class="bi bi-people"></i>No members yet. Add the first member of this team.</div>`;
  } else {
    for (const member of members) {
      list += memberRowHtml(member, balances);
    }
  }

  pageContent.innerHTML =
    heading("Team members", `<button class="btn btn-navy" data-action="add"><i class="bi bi-person-plus"></i> Add member</button>`) +
    `<div class="panel">${list}</div>
     <div class="panel d-flex gap-2 flex-wrap align-items-center">
       <b class="me-auto">${escapeHtml(team.name)}</b>
       <button class="btn btn-sm btn-outline-secondary" data-action="rename">Rename team</button>
       <button class="btn btn-sm btn-outline-danger" data-action="deleteTeam">Delete team</button>
     </div>`;
}

// Delete the active team and everything that belongs to it
function deleteActiveTeam() {
  const teamId = getTeam().id;
  const data = state.data;

  function belongsToOtherTeams(item) {
    return item.teamId !== teamId;
  }

  data.teams = data.teams.filter(function (t) { return t.id !== teamId; });
  data.members = data.members.filter(belongsToOtherTeams);
  data.expenses = data.expenses.filter(belongsToOtherTeams);
  data.payments = data.payments.filter(belongsToOtherTeams);
  data.activities = data.activities.filter(belongsToOtherTeams);
  data.settings.activeTeamId = null;

  commit();
  refresh();
}

onAction(pageContent, {
  add: function () {
    openMemberForm();
  },
  edit: function (data) {
    const member = state.data.members.find(function (m) { return m.id === data.id; });
    openMemberForm(member);
  },
  remove: function (data) {
    removeMember(data.id);
  },
  rename: function () {
    openTeamForm(getTeam());
  },
  deleteTeam: function () {
    confirmDialog("Delete this team and all its members, expenses and payments?", deleteActiveTeam);
  },
});

initPage({ onRender: render });
