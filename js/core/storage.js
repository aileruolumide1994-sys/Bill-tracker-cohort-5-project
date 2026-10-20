// Saving and loading data from the browser's localStorage.
const DATA_KEY = "officeflow_data";

// The shape of a brand-new, empty app
export function createInitialData() {
  return {
    teams: [],
    members: [],
    expenses: [],
    payments: [],
    recurringBills: [],
    activities: [],
    settings: {
      userName: " ",
      userRole: "Admin",
      activeTeamId: null,
    },
  };
}

// Read saved data. If nothing is saved yet, start fresh.
export function loadData() {
  const savedText = localStorage.getItem(DATA_KEY);
  if (savedText === null) {
    return createInitialData();
  }

  const data = JSON.parse(savedText);

  // Make sure the saved data looks right
  const looksValid =
    data &&
    Array.isArray(data.teams) &&
    Array.isArray(data.members) &&
    Array.isArray(data.expenses) &&
    Array.isArray(data.payments);
  if (!looksValid) {
    throw new Error("Invalid OfficeFlow data.");
  }

  // Older saved data may be missing newer fields, so add them
  if (!data.recurringBills) data.recurringBills = [];
  if (!data.activities) data.activities = [];
  if (!data.settings) data.settings = createInitialData().settings;

  return data;
}

// Save data. Throws a friendly error if the browser refuses.
export function saveData(data) {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  } catch (error) {
    throw new Error("We couldn't save your changes. Check your browser storage and try again.");
  }
}
