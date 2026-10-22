const DATA_KEY = "officeflow_data";

function createInitialData() {
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

function loadData() {
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

    data.recurringBills ??= [];
    data.activities ??= [];
    data.settings ??= createInitialData().settings;

    return data;
  } catch (error) {
    console.error("Error loading data:", error);
    throw error;
  }
}

function saveData(data) {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  } catch {
    throw new Error(
      "We couldn't save your changes. Check your browser storage and try again.",
    );
  }
}
