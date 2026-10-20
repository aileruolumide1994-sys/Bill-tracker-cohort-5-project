// Exchange rates (NGN base), cached for 12 hours so the app still works offline.
const KEY = "officeflow_rates";
const API = "https://open.er-api.com/v6/latest/NGN";
let cache = { ts: 0, rates: null };
try { cache = JSON.parse(localStorage.getItem(KEY)) ?? cache; } catch { /* ignore */ }

export const getRate = (currency) => (currency === "NGN" ? 1 : cache.rates?.[currency]);

export async function loadRates() {
  if (cache.rates && Date.now() - cache.ts < 12 * 3600e3) return;
  try {
    const json = await (await fetch(API)).json();
    if (json.result !== "success") throw new Error("bad response");
    cache = { ts: Date.now(), rates: json.rates };
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch { /* offline: keep whatever is cached */ }
}
