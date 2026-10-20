// Small pop-up message in the top-right corner. type: success | danger | warning | info
export function showNotification(message, type = "success") {
  let area = document.getElementById("notificationArea");
  if (!area) {
    area = document.createElement("div");
    area.id = "notificationArea";
    document.body.append(area);
  }
  const box = document.createElement("div");
  box.className = `alert alert-${type} alert-dismissible shadow-sm py-2 mb-2`;
  box.setAttribute("role", "alert");
  box.textContent = message;
  const close = document.createElement("button");
  close.type = "button";
  close.className = "btn-close";
  close.setAttribute("aria-label", "Close");
  close.onclick = () => box.remove();
  box.append(close);
  area.append(box);
  setTimeout(() => box.remove(), 4500);
}
