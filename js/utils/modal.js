// One reusable Bootstrap modal for every form and confirmation.
let modal;
let submitHandler = null;
const $ = (id) => document.getElementById(id);

function build() {
  if (modal) return;
  document.body.insertAdjacentHTML("beforeend", `
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
  </div>`);
  modal = bootstrap.Modal.getOrCreateInstance($("appModal"));
  $("appModalForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const result = submitHandler?.();
    if (typeof result === "string") $("appModalError").textContent = result; // validation message
    else modal.hide();
  });
}

// onSubmit() may return a string (an error to show) — otherwise the modal closes.
export function openModal({ title, body, okText = "Save", onSubmit, size = "" }) {
  build();
  submitHandler = onSubmit ?? null;
  $("appModalTitle").textContent = title;
  $("appModalBody").innerHTML = body;
  $("appModalBody").oninput = null;
  $("appModalError").textContent = "";
  $("appModalOk").textContent = okText;
  $("appModalOk").hidden = !onSubmit;
  $("appModalDialog").className = `modal-dialog modal-dialog-scrollable ${size}`;
  $("appModal").addEventListener("shown.bs.modal", () => $("appModalBody").querySelector("input:not([type=radio]),select")?.focus(), { once: true });
  modal.show();
  return $("appModalBody");
}

export const confirmDialog = (message, onConfirm, okText = "Delete") =>
  openModal({ title: "Please confirm", body: `<p class="mb-0">${message}</p>`, okText, onSubmit: () => { onConfirm(); } });
