// One reusable Bootstrap pop-up window (modal) used for every form and confirmation.
let modal = null;          // the Bootstrap modal object (created the first time)
let submitHandler = null;  // the function to run when the user clicks the OK button

function byId(id) {
  return document.getElementById(id);
}

// Create the modal HTML once and add it to the page
function buildModal() {
  if (modal) return;

  document.body.insertAdjacentHTML("beforeend", `
  <div class="modal fade" id="appModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-scrollable" id="appModalDialog">
      <form class="modal-content" id="appModalForm" novalidate>
        <div class="modal-header">
          <h5 class="modal-title" id="appModalTitle"></h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div id="appModalBody"></div>
          <div id="appModalError" class="text-danger small mt-2" role="alert"></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
          <button type="submit" class="btn btn-navy" id="appModalOk"></button>
        </div>
      </form>
    </div>
  </div>`);

  modal = bootstrap.Modal.getOrCreateInstance(byId("appModal"));

  // When the form is submitted, run the page's handler
  byId("appModalForm").addEventListener("submit", function (event) {
    event.preventDefault();

    let result = null;
    if (submitHandler) {
      result = submitHandler();
    }

    if (typeof result === "string") {
      byId("appModalError").textContent = result; // show the error, keep the modal open
    } else {
      modal.hide();
    }
  });
}

// Open the modal. onSubmit() may return a string (an error message to show).
// If it returns nothing, the modal closes.
export function openModal({ title, body, okText = "Save", onSubmit, size = "" }) {
  buildModal();
  submitHandler = onSubmit || null;

  byId("appModalTitle").textContent = title;
  byId("appModalBody").innerHTML = body;
  byId("appModalBody").oninput = null;
  byId("appModalError").textContent = "";
  byId("appModalOk").textContent = okText;
  byId("appModalOk").hidden = !onSubmit; // no OK button if there's nothing to submit
  byId("appModalDialog").className = "modal-dialog modal-dialog-scrollable " + size;

  // Put the cursor in the first input once the modal has opened
  byId("appModal").addEventListener("shown.bs.modal", function () {
    const firstInput = byId("appModalBody").querySelector("input:not([type=radio]), select");
    if (firstInput) firstInput.focus();
  }, { once: true });

  modal.show();
  return byId("appModalBody");
}

// A simple "Are you sure?" window
export function confirmDialog(message, onConfirm, okText = "Delete") {
  openModal({
    title: "Please confirm",
    body: `<p class="mb-0">${message}</p>`,
    okText: okText,
    onSubmit: function () {
      onConfirm();
    },
  });
}
