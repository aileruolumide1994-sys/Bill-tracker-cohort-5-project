# OfficeFlow — Team Finance Manager

A responsive office expense, petty cash, and reimbursement tracking application built with **HTML, CSS, and Vanilla JavaScript**. OfficeFlow helps small teams manage shared expenses, track member balances, record reimbursements, and settle outstanding debts efficiently.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Objectives](#objectives)
- [Technology Stack](#technology-stack)
- [Color Palette](#color-palette)
- [Folder Structure](#folder-structure)
- [Application Architecture](#application-architecture)
- [Data Flow](#data-flow)
- [Data Storage](#data-storage)
- [Core Features](#core-features)
- [Currency Conversion](#currency-conversion)
- [Financial Calculation Rules](#financial-calculation-rules)
- [Responsive Design](#responsive-design)
- [Getting Started](#getting-started)
- [Development Guidelines](#development-guidelines)
- [Limitations](#limitations)
- [Future Improvements](#future-improvements)

---

## Project Overview

OfficeFlow is a team finance management application designed for small businesses, departments, and offices that need a simple way to manage shared expenses and petty cash.

The application allows users to organize teams, record expenses, allocate costs among members, monitor outstanding balances, record reimbursements, and generate settlement suggestions.

The application uses browser localStorage for data persistence, allowing saved information to remain available after a page reload in the same browser and origin.

**Project type:** Frontend web application

**Project name:** OfficeFlow — Team Finance Manager

**Base currency:** Nigerian Naira (NGN)

**Architecture:** Modular, multi-page application

## Objectives

The primary objectives of OfficeFlow are to:

- Manage multiple teams and departments.
- Add, edit, and manage team members.
- Record office expenses and reimbursement claims.
- Split expenses equally, by exact amounts, or by percentage.
- Calculate how much each member owes or is owed.
- Generate settlement suggestions using as few transactions as practical.
- Record payments and reimbursements.
- Manage recurring monthly bills.
- Track financial activity and spending history.
- Convert foreign currencies to Nigerian Naira.
- Display spending reports and financial charts.
- Preserve data across page reloads using localStorage.

---

## Technology Stack

| Technology            | Purpose                                                     |
| --------------------- | ----------------------------------------------------------- |
| HTML5                 | Page structure and semantic markup                          |
| CSS3                  | Custom styling, layout, and responsive design               |
| Vanilla JavaScript    | Application logic, calculations, and interactions           |
| JavaScript ES Modules | Separation of functionality into reusable files             |
| Bootstrap             | Responsive grid, common UI components, and layout utilities |
| Chart.js              | Spending and contribution charts                            |
| localStorage          | Persistent browser-side data storage                        |
| ExchangeRate API      | Foreign exchange rates and currency conversion              |
| Intl.NumberFormat     | Currency formatting and number display                      |

No React, Vue, Angular, or frontend routing framework is required.

Navigation between application pages uses regular HTML links.

---

## Color Palette

OfficeFlow uses a professional finance-dashboard color system built around deep navy, emerald green, white, and subtle neutral tones.

### Brand Colors

| Color         | Hex Code  | Usage                                              |
| ------------- | --------- | -------------------------------------------------- |
| Primary Navy  | `#172554` | Main brand color, sidebar accents, primary buttons |
| Primary Hover | `#1E3A8A` | Hover states for primary actions                   |
| Primary Light | `#EFF6FF` | Subtle blue backgrounds and selected states        |
| Emerald Green | `#059669` | Positive balances and successful actions           |
| Emerald Hover | `#047857` | Hover states for green actions                     |

### Background Colors

| Color              | Hex Code  | Usage                                       |
| ------------------ | --------- | ------------------------------------------- |
| Main Background    | `#F8FAFC` | Main page background                        |
| Surface White      | `#FFFFFF` | Cards, forms, tables, and modals            |
| Sidebar Background | `#FFFFFF` | Sidebar and navigation                      |
| Border Gray        | `#E2E8F0` | Card borders, separators, and input borders |

### Text Colors

| Color           | Hex Code  | Usage                                      |
| --------------- | --------- | ------------------------------------------ |
| Primary Text    | `#0F172A` | Headings and important content             |
| Secondary Text  | `#64748B` | Descriptions and supporting text           |
| Muted Text      | `#94A3B8` | Secondary metadata and placeholders        |
| Text on Primary | `#FFFFFF` | Text displayed on dark primary backgrounds |

### Status Colors

| Status               | Foreground | Background |
| -------------------- | ---------- | ---------- |
| Success / Money Owed | `#059669`  | `#D1FAE5`  |
| Danger / Debt        | `#DC2626`  | `#FEE2E2`  |
| Warning / Pending    | `#D97706`  | `#FEF3C7`  |
| Information          | `#2563EB`  | `#DBEAFE`  |

Color must not be the only way to communicate financial status. Use descriptive labels and positive or negative indicators as well.

### CSS Root Variables

Define the application's design tokens in `css/main.css`.

```css
:root {
  /* Brand */
  --primary-color: #172554;
  --primary-hover: #1e3a8a;
  --primary-light: #eff6ff;

  --accent-color: #059669;
  --accent-hover: #047857;
  --accent-light: #d1fae5;

  /* Backgrounds */
  --bg-color: #f8fafc;
  --surface-color: #ffffff;
  --sidebar-color: #ffffff;

  /* Text */
  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --text-on-primary: #ffffff;

  /* Borders */
  --border-color: #e2e8f0;
  --border-focus: #2563eb;

  /* Financial Status */
  --success-color: #059669;
  --success-bg: #d1fae5;

  --danger-color: #dc2626;
  --danger-bg: #fee2e2;

  --warning-color: #d97706;
  --warning-bg: #fef3c7;

  --info-color: #2563eb;
  --info-bg: #dbeafe;

  /* Buttons */
  --btn-primary-bg: #172554;
  --btn-primary-hover: #1e3a8a;
  --btn-success-bg: #059669;
  --btn-danger-bg: #dc2626;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.05);
  --shadow-md: 0 4px 12px rgba(15, 23, 42, 0.08);

  /* Border Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* Typography */
  --font-family: "Inter", sans-serif;

  /* Layout */
  --sidebar-width: 250px;
  --header-height: 64px;
}
```

Use these variables throughout the project instead of repeatedly hardcoding colors and layout values.

---

## Folder Structure

The proposed project structure is organized into pages, stylesheets, application modules, utilities, and static assets.

```text
officeflow/
│
├── index.html
├── README.md
│
├── pages/
│   ├── expenses.html
│   ├── balances.html
│   ├── settle-up.html
│   ├── payments.html
│   ├── recurring-bills.html
│   ├── history.html
│   ├── members.html
│   ├── reports.html
│   └── settings.html
│
├── css/
│   ├── main.css
│   ├── components.css
│   └── responsive.css
│
├── js/
│   ├── app.js
│   │
│   ├── core/
│   │   ├── storage.js
│   │   ├── data-model.js
│   │   └── calculations.js
│   │
│   ├── modules/
│   │   ├── teams.js
│   │   ├── members.js
│   │   ├── expenses.js
│   │   ├── payments.js
│   │   ├── settlements.js
│   │   └── recurring-bills.js
│   │
│   ├── services/
│   │   └── currency-api.js
│   │
│   └── utils/
│       ├── formatters.js
│       └── validators.js
│
└── assets/
    ├── images/
    └── icons/
```

This is the target structure. Files can be introduced as their corresponding features are implemented.

### Folder Responsibilities

**`pages/`**

Contains the individual HTML pages for each major section of the application.

**`css/`**

Contains global styles, reusable component styles, and responsive rules.

- `main.css`: Root variables, global styles, typography, and layout.
- `components.css`: Buttons, cards, forms, tables, modals, and badges.
- `responsive.css`: Tablet and mobile layouts.

**`js/core/`**

Contains foundational logic used across the application.

- `storage.js`: Loads and saves application data.
- `data-model.js`: Defines the structure of teams, members, expenses, and payments.
- `calculations.js`: Calculates allocations, balances, and settlement amounts.

**`js/modules/`**

Contains the business logic for individual features.

- `teams.js`: Team creation, editing, and switching.
- `members.js`: Member management.
- `expenses.js`: Expense and claim management.
- `payments.js`: Payment and reimbursement records.
- `settlements.js`: Recommended settlement transfers.
- `recurring-bills.js`: Recurring expense management.

**`js/services/`**

Contains integrations with external services, including currency exchange rates.

**`js/utils/`**

Contains reusable helper functions for validation and formatting.

**`assets/`**

Stores static images and icon assets.

---

## Application Architecture

OfficeFlow follows a modular, multi-page frontend architecture.

The application is separated into four main layers.

### 1. Presentation Layer

**Technologies:** HTML, CSS, Bootstrap

Responsible for displaying the interface and collecting user input.

Examples include:

- Dashboard cards.
- Navigation sidebar.
- Expense forms.
- Transaction tables.
- Settlement recommendations.
- Charts and reports.

### 2. Application Logic Layer

**Technology:** Vanilla JavaScript ES Modules

Responsible for handling user interactions and coordinating application operations.

Examples include:

- Creating a team.
- Validating an expense form.
- Editing a reimbursement claim.
- Recording a payment.
- Refreshing dashboard data.

### 3. Business Logic Layer

**Technology:** JavaScript modules

Responsible for enforcing financial rules and performing calculations.

Examples include:

- Equal expense splitting.
- Exact amount validation.
- Percentage allocation validation.
- Member balance calculations.
- Settlement optimization.
- Recurring bill duplicate prevention.

Financial calculations should be centralized so that all pages use the same rules.

### 4. Data and Integration Layer

**Technologies:** localStorage and ExchangeRate API

Responsible for data persistence and external currency conversion.

- `storage.js` manages browser storage.
- `currency-api.js` retrieves and caches exchange rates.
- Saved financial records retain the exchange rate used when they were created.

### Architecture Diagram

```text
                 OFFICEFLOW
                     |
          +----------+----------+
          |                     |
     HTML Pages              CSS Files
          |                     |
          +----------+----------+
                     |
              app.js / Modules
                     |
          +----------+----------+
          |          |          |
       Teams      Expenses   Payments
          |          |          |
          +----------+----------+
                     |
              Business Logic
                     |
          +----------+----------+
          |                     |
       localStorage        ExchangeRate API
          |
     Saved Application Data
```

---

## Data Flow

When a user records an expense, the application follows this process:

1. The user opens the expense form.
2. JavaScript collects the form values.
3. Validation checks the title, amount, payer, participants, and split configuration.
4. The business logic calculates each member's allocation.
5. The application saves the transaction through the storage module.
6. The affected dashboard, balances, and history views refresh.
7. The application displays a success message only after saving succeeds.

If validation fails, the expense is not saved. If storage fails, the application must report the error rather than falsely confirming success.

### Application Startup

When a page loads:

1. Load the required CSS and JavaScript modules.
2. Initialize the application.
3. Read saved data from localStorage.
4. Validate the stored data structure.
5. Determine the active page and selected team.
6. Render the appropriate content.
7. Attach event listeners.
8. Respond to user actions and persist valid changes.

---

## Data Storage

OfficeFlow uses browser localStorage to persist application data across page reloads.

### Storage Keys

| Key                         | Contents                                        |
| --------------------------- | ----------------------------------------------- |
| `officeflow_data`           | Teams, members, expenses, and payments          |
| `officeflow_exchange_rates` | Cached exchange rates and their fetch timestamp |

### Main Data Structure

The main application record contains four collections:

```javascript
{
  teams: [],
  members: [],
  expenses: [],
  payments: []
}
```

Each record should have a unique ID. Team-specific records should reference their owning team through `teamId`.

Expenses should store their split configuration and calculated member allocations. Payments should remain separate records rather than modifying the original expenses.

### Storage Requirements

- Serialize data using `JSON.stringify()`.
- Deserialize data using `JSON.parse()`.
- Handle unavailable or full browser storage with `try...catch`.
- Validate loaded data before using it.
- Avoid silently overwriting corrupted data.
- Report failed writes to the user.
- Preserve historical financial records.
- Use integer kobo for monetary calculations wherever practical.

### Important Limitation

localStorage is browser-specific and is not a shared database. Data does not automatically synchronize between users, browsers, or devices.

For this project, localStorage provides a practical frontend-only persistence solution. A production application used by an entire office would need a backend database, authentication, authorization, and server-side financial validation.

---

## Core Features

### Team and Member Management

- Create and manage multiple teams.
- Add, edit, and remove team members.
- Switch between teams.
- Prevent removal of members with unsettled balances unless the balances are settled or explicitly reassigned.
- Preserve historical financial records.

### Expense and Claim Management

- Record expenses and reimbursement claims.
- Select a category, payer, date, and participants.
- Split costs equally, by exact amounts, or by percentage.
- Edit existing records.
- Confirm before deleting transactions.
- Validate all amounts and allocations.

### Balances and Settlements

- Calculate each member's net balance.
- Display amounts owed and amounts receivable.
- Generate recommended settlement transfers.
- Record reimbursements and payments.
- Ensure that each team's net balances sum to zero.

### Recurring Bills

- Mark expenses as recurring.
- Track upcoming monthly bills.
- Remind users when recurring expenses are due.
- Prevent duplicate bill creation for the same period.

### Activity History

- Maintain a chronological record of financial activities.
- Search by transaction title.
- Filter by member, category, and month.
- Display the newest activities first.

### Dashboard and Reports

- Display monthly spending.
- Visualize category spending using Chart.js.
- Compare member contributions with allocated shares.
- Highlight the largest expense of the month.
- Show outstanding reimbursements and team balances.

---

## Currency Conversion

OfficeFlow uses the free ExchangeRate API endpoint:

`https://open.er-api.com/v6/latest/NGN`

The application supports entering expenses in a foreign currency and converting the amount to NGN when saving the transaction.

### Conversion Requirements

Each converted expense should preserve:

- Original amount.
- Original currency.
- Converted NGN amount.
- Exchange rate used.
- Transaction date.

### Exchange Rate Caching

Exchange rates should be cached in localStorage together with a timestamp.

- Reuse cached rates when they are less than 12 hours old.
- Attempt to fetch fresh rates when the cache is older than 12 hours.
- Use the last saved rates when the API fails, while notifying the user.
- Display loading, error, and offline states.
- If no usable rates are available, do not perform an unverified conversion.

Historical expenses must not be recalculated when newer exchange rates become available.

**API attribution:** [ExchangeRate API](https://www.exchangerate-api.com/)

---

## Financial Calculation Rules

Financial accuracy is a core requirement of OfficeFlow.

### Monetary Precision

Store amounts in integer kobo where practical.

For example:

- ₦10,000.00 = 1,000,000 kobo.
- ₦3,333.34 = 333,334 kobo.
- ₦3,333.33 = 333,333 kobo.

This avoids common floating-point rounding problems.

### Equal Splits

Distribute any remaining kobo across the selected participants so that the sum of all allocations equals the original expense total exactly.

### Exact Amounts

The sum of all member allocations must equal the expense total.

### Percentage Splits

The percentages must total exactly 100% under the application's validation rules. Monetary allocations must also reconcile to the expense total after rounding.

### Zero-Balance Invariant

For every team:

`Sum of all member net balances = 0`

If the sum is not zero, the application should identify the inconsistency rather than hiding it.

### Payments and Settlements

Payments must be recorded as separate transactions. Recording a payment changes outstanding balances but does not erase the original expense or reimbursement history.

Settlement suggestions should be generated from current outstanding balances and should not be treated as completed payments until the user records them.

---

## Responsive Design

OfficeFlow follows a mobile-friendly design approach.

### Desktop

- Persistent sidebar.
- Spacious dashboard cards.
- Readable transaction tables.
- Side-by-side charts and financial summaries.

### Tablet

- Flexible grid layouts.
- Reduced card columns.
- Adaptable navigation and filters.

### Mobile

- Compact navigation with a slide-out menu.
- Stacked summary cards.
- Responsive transaction cards instead of overly wide tables.
- Touch-friendly buttons and inputs.
- Forms and dialogs that fit the available screen.
- No unnecessary horizontal scrolling.

The layout should remain consistent across all pages.

---

## Getting Started

### Prerequisites

- A modern web browser.
- Visual Studio Code or another code editor.
- VS Code Live Server or an equivalent local development server.

### Installation

1. Create the `officeflow` project folder.
2. Create the HTML, CSS, JavaScript, and assets folders described above.
3. Add the application files as each feature is developed.
4. Open the project folder in Visual Studio Code.
5. Install the Live Server extension if needed.
6. Open `index.html` using Live Server.

Do not open the application directly through a `file://` URL when using JavaScript ES modules. Use a local development server so imports and browser requests work correctly.

### External Libraries

Bootstrap and Chart.js can be included through their official distribution files or CDNs. When using a CDN, follow the relevant library documentation and pin appropriate versions.

---

## Development Guidelines

To keep the code maintainable:

1. Use JavaScript ES modules with clear responsibilities.
2. Keep business logic separate from DOM manipulation where practical.
3. Use the shared storage module instead of writing directly to localStorage throughout the application.
4. Keep balance and settlement calculations in centralized modules.
5. Reuse CSS variables and shared component styles.
6. Use semantic HTML and accessible form labels.
7. Validate user input before saving financial records.
8. Confirm destructive actions before execution.
9. Test financial calculations with edge cases.
10. Do not display a success state before a write has succeeded.
11. Keep historical currency conversions unchanged.
12. Test persistence by reloading the page.

---

## Limitations

This version of OfficeFlow is designed as a frontend-only project.

- Data is stored locally in the current browser.
- There is no automatic synchronization between team members.
- localStorage does not provide secure authentication or access control.
- Clearing browser data can remove locally stored records.
- Client-side data can be modified through browser developer tools.
- A multi-user production deployment requires a backend and shared database.

These limitations should be considered before using the application for actual office accounting.

---

## Future Improvements

Potential future enhancements include:

- Backend database and user authentication.
- Multi-user access and team permissions.
- Cloud synchronization and secure backups.
- Exporting reports to CSV or PDF.
- Expense receipt attachments.
- Approval workflows for reimbursement claims.
- More advanced financial reports.
- Automated notifications and reminders.
- Automated tests for balance calculations and settlement optimization.

---

## Project Status

OfficeFlow is being developed incrementally. The architecture and requirements in this document describe the intended application structure; individual features should be marked as completed only after they have been implemented and tested.

**Built with HTML, CSS, Vanilla JavaScript, Bootstrap, Chart.js, and localStorage.**
