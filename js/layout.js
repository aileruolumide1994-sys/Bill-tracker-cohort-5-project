async function loadDashboard() {
  const pageContent = document.getElementById("page-content");

  try {
    const response = await fetch("./pages/overview.html");

    if (!response.ok) {
      throw new Error("Dashboard page could not be loaded.");
    }

    const html = await response.text();

    pageContent.innerHTML = html;
    await import("./app.js");
  } catch (error) {
    console.error(error);
    pageContent.textContent = "Unable to load the dashboard.";
  }
}

loadDashboard();
