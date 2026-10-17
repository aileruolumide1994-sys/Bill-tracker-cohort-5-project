export function showNotification(message, type = "success") {
  const notificationArea = document.getElementById("notificationArea");

  if (!notificationArea) {
    return;
  }

  const alert = document.createElement("div");

  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.setAttribute("role", type === "danger" ? "alert" : "status");

  alert.textContent = message;

  const closeButton = document.createElement("button");

  closeButton.type = "button";
  closeButton.className = "btn-close";
  closeButton.setAttribute("data-bs-dismiss", "alert");
  closeButton.setAttribute("aria-label", "Close");

  alert.appendChild(closeButton);
  notificationArea.appendChild(alert);
}
