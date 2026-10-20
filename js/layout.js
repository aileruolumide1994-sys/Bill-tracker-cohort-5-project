async function loadPage(pagePath) {
  const pageContent = document.getElementById("page-content");

  if (!pageContent) {
    console.error("The page-content container was not found.");
    return;
  }
  try {
    const response = await fetch(pagePath);
    if (!response.ok) {
      throw new Error(`Page could not be loaded: ${pagePath}`);
    }
    const html = await response.text();
    pageContent.innerHTML = html;

    // Run dashboard JavaScript after loading the Overview page
    if (pagePath === "./pages/overview.html") {
      await import("./app.js");
    }
  } catch (error) {
    console.error(error);
    pageContent.textContent = "Unable to load this page.";
  }
}

// Once the page loads this oad the over view page which is the defualt page
loadPage("./pages/overview.html");

// Handle clicks on sidebar links
document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-page]");
  if (!link) return;
  event.preventDefault();
  document.querySelectorAll(".sidebar .nav-link").forEach((navLink) => {
    navLink.classList.remove("active");
  });
  link.classList.add("active");
  loadPage(link.dataset.page);
});
