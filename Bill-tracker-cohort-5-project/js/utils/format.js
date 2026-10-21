// Money is stored as whole kobo (NGN x 100) so there are never rounding errors.
export const createId = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);

export const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const formatMoney = (kobo, currency = "NGN") =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency }).format((kobo || 0) / 100);

// Today's date in the user's own time zone, as YYYY-MM-DD
export const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
export const monthOf = (date) => date.slice(0, 7);
export const monthLabel = (m) => new Date(m + "-01T00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });
export const formatDate = (d) => new Date(d + "T00:00").toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
export const initials = (name) => name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
