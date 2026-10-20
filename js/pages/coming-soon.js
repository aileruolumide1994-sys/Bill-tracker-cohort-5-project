// A placeholder for pages that are planned but not built yet (Recurring Bills, Settings).
import { initPage, heading } from "../core/shell.js";
import { escapeHtml } from "../utils/format.js";

const pageContent = document.getElementById("pageContent");

// The title and icon come from data-title / data-icon in the page's HTML
const title = pageContent.dataset.title;
const icon = pageContent.dataset.icon || "bi-hourglass-split";

function render() {
  pageContent.innerHTML =
    heading(escapeHtml(title)) +
    `<div class="panel empty-state">
       <i class="bi ${escapeHtml(icon)}"></i>
       <p>${escapeHtml(title)} is coming soon.</p>
     </div>`;
}

initPage({ onRender: render });
