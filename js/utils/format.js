// Small helper functions used all over the app.
// NOTE: Money is stored as whole kobo (1 naira = 100 kobo).
// Storing whole numbers avoids rounding bugs like 0.1 + 0.2 = 0.30000000000000004.

// Make a unique id for a team, member, expense, etc.
export function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for very old browsers: a random string
  return Math.random().toString(36).slice(2, 10);
}

// Stop user-typed text from being treated as HTML (protects against bad input).
export function escapeHtml(text) {
  const replacements = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  // If text is missing (null/undefined), use an empty string
  let result = String(text === null || text === undefined ? "" : text);

  for (const character in replacements) {
    result = result.split(character).join(replacements[character]);
  }
  return result;
}

// Turn kobo into a nice string, e.g. 150000 -> "₦1,500.00"
export function formatMoney(kobo, currency = "NGN") {
  const amount = (kobo || 0) / 100;
  const formatter = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currency,
  });
  return formatter.format(amount);
}

// Today's date as "YYYY-MM-DD" (in the user's own time zone)
export function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0"); // months start at 0
  const day = String(now.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

// "2026-10-20" -> "2026-10"
export function monthOf(date) {
  return date.slice(0, 7);
}

// "2026-10" -> "October 2026"
export function monthLabel(month) {
  const date = new Date(month + "-01T00:00");
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// "2026-10-20" -> "20 Oct 2026"
export function formatDate(dateString) {
  const date = new Date(dateString + "T00:00");
  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// "Ada Lovelace" -> "AL"
export function initials(name) {
  const words = name.split(/\s+/);
  let letters = "";
  for (const word of words) {
    letters = letters + word[0];
  }
  return letters.slice(0, 2).toUpperCase();
}
