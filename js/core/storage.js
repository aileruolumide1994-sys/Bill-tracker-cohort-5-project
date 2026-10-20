const DATA_KEY = "officeflow_data";

export function createInitialData() {
  return {
    teams: [],
    members: [],
    expenses: [],
    payments: [],
    recurringBills: [],
    activities: [],
    settings: {
      userName: "Marvellous",
      userRole: "Admin",
      activeTeamId: null,
    },
  };
}

export function loadData() {
  try {
    const savedData = localStorage.getItem(DATA_KEY);

    if (savedData === null) {
      return createInitialData();
    }

    const data = JSON.parse(savedData);

    if (
      !data ||
      !Array.isArray(data.teams) ||
      !Array.isArray(data.members) ||
      !Array.isArray(data.expenses) ||
      !Array.isArray(data.payments)
    ) {
      throw new Error("Invalid OfficeFlow data.");
    }

    // Support data created before we added these properties.
    data.recurringBills ??= [];
    data.activities ??= [];
    data.settings ??= createInitialData().settings;

    return data;
  } catch (error) {
    console.error("Error loading data:", error);
    throw error;
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  } catch {
    throw new Error(
      "We couldn't save your changes. Check your browser storage and try again.",
    );
  }
}
