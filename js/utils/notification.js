// Shows a small pop-up message in the top-right corner.
// type can be: "success", "danger", "warning" or "info"
export function showNotification(message, type = "success") {
  // Find the box that holds notifications, or create it the first time
  let area = document.getElementById("notificationArea");
  if (!area) {
    area = document.createElement("div");
    area.id = "notificationArea";
    document.body.append(area);
  }

  // Build the message box
  const box = document.createElement("div");
  box.className = "alert alert-" + type + " alert-dismissible shadow-sm py-2 mb-2";
  box.setAttribute("role", "alert");
  box.textContent = message;

  // Add a close (X) button
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "btn-close";
  closeButton.setAttribute("aria-label", "Close");
  closeButton.onclick = function () {
    box.remove();
  };
  box.append(closeButton);
  area.append(box);

  // Remove it automatically after 4.5 seconds
  setTimeout(function () {
    box.remove();
  }, 4500);
}
