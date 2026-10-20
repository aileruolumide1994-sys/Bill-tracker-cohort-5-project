// Exchange rates (base currency: NGN).
// We save them in localStorage for 12 hours so the app still works offline.
const STORAGE_KEY = "officeflow_rates";
const API_URL = "https://open.er-api.com/v6/latest/NGN";
const TWELVE_HOURS = 12 * 60 * 60 * 1000; // in milliseconds

let cache = { ts: 0, rates: null };

// Try to load rates saved from last time
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (saved) cache = saved;
} catch (error) {
  // Nothing saved or it was broken - just use the empty cache
}

// How many units of `currency` equal 1 NGN? (undefined if unknown)
export function getRate(currency) {
  if (currency === "NGN") return 1;
  if (!cache.rates) return undefined;
  return cache.rates[currency];
}

// Download fresh rates (skipped if we already have recent ones)
export async function loadRates() {
  const isFresh = cache.rates && Date.now() - cache.ts < TWELVE_HOURS;
  if (isFresh) return;

  try {
    const response = await fetch(API_URL);
    const json = await response.json();
    if (json.result !== "success") {
      throw new Error("bad response");
    }
    cache = { ts: Date.now(), rates: json.rates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    // Offline? Keep using whatever we already have.
  }
}
