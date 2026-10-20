// Placeholder for pages that are planned but not built yet (Recurring Bills, Settings).
import { initPage, heading } from "../core/shell.js";
import { escapeHtml } from "../utils/format.js";

const el = document.getElementById("pageContent");
const { title, icon = "bi-hourglass-split" } = el.dataset;

initPage({
  onRender() {
    el.innerHTML = heading(escapeHtml(title)) +
      `<div class="panel empty-state"><i class="bi ${escapeHtml(icon)}"></i><p>${escapeHtml(title)} is coming soon.</p></div>`;
  },
});
