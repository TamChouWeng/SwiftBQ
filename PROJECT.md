# SwiftBQ Architecture Documentation
> **Version**: Beta 3.2
> **Last Updated**: 2026-01-27
> **Status**: Verified

## 1. Project Overview
SwiftBQ is a production-grade Bill of Quantities (BQ) and Quotation management system. It resolves the critical business need of maintaining a live "Master Price Book" while ensuring historical quotations remain immutable (Data Independence).

Key Business Logic:
- **Price Books**: Managed via a Master List with complex dynamic pricing strategies.
- **Data Independence**: Snapshotting mechanism ensures project versions are "frozen in time".
- **Transactional Integrity**: Batch commits prevent partial data states.

## 2. Technology Stack

### Frontend Core
- **Framework**: React 19 (Latest feature set, Strict Mode enabled)
- **Build System**: Vite 6.2 (Hot Module Replacement, fast builds)
- **Language**: TypeScript 5.8 (Strict typing enforced)

### State Management & Persistence
- **Global Store**: React Context API (`store.tsx`) w/ `useReducer`-like pattern.
- **Cloud Database**: Supabase (PostgreSQL)
    - **Tables**: `master_list_items`, `projects`, `project_versions`, `bq_items`, `profiles`
- **Local Cache**: `localStorage` (Session persistence for `currentProjectId`, `appSettings`).

### UI / UX
- **Styling**: Tailwind CSS (Utility-first architecture).
- **Icons**: Lucide React.
- **PDF Generation**: `html2canvas` + `jspdf` (Client-side rendering).

## 3. Core Architecture & Data Flow

### 3.1. Data Independence (The "Snapshot" Pattern)
This is the most critical architectural pattern in SwiftBQ.

1.  **Master Source**: `MasterItem`s exist in the global pool.
2.  **Versioning**: When a `ProjectVersion` is created, the system **deep-copies** the entire relevant state of the Master List into `project_versions.master_list_snapshot` (JSONB column in DB).
3.  **Isolation**:
    - `BQItem`s do NOT link back to the live Master List dynamic prices.
    - Instead, they derive their cost/price data from the **Version Snapshot**.
    - **Result**: You can double the price of Cement in the Master List today, and a Quote sent last year will *not* change by one cent.

### 3.2. Dynamic Pricing Engine (`pricingStrategies.ts`)
Prices are not static numbers; they are derived via "Strategies" (Recipes).

- **FOB** (Freight on Board) -> **DDP** (Delivered Duty Paid)
    - Formula: `DDP = Ceiling((FOB * Forex * SST) / OPTA, RoundingFactor)`
    - *Code Ref*: `calculateDerivedFields()` in `store.tsx` orchestrates this.
- **SP** (Selling Price) -> Derived from DDP.
- **RSP** (Retail Selling Price) -> Derived from SP.

**Strategy Pattern Implementation**:
Each price field (`rexScDdp`, `rexSp`, `rexRsp`) is an object:
```typescript
interface PriceField {
  value: number;       // The calculated result
  strategy: string;    // e.g., 'DDP_FORMULA_A'
  manualOverride?: number; // If strategy == 'MANUAL'
}
```
This allows users to switch formulas (e.g., "Recipe A" to "Recipe B") and instantly view the price impact.

### 3.3. Transactional Save Architecture (Beta 3.2)
To solve performance issues and data integrity:

1.  **Draft State**: Edits in the BQ Builder (Catalog View) update a local `bqItems` state array immediately (Optimistic UI).
2.  **No Auto-Save**: Database writes are NOT triggered per keystroke.
3.  **Commit**: When the user clicks "Save":
    - `store.saveAllChanges()` is called.
    - **Batch Operation**: The system bundles all modified BQ Items and Project Metadata.
    - **Upsert**: Sends a single payload (or efficient batch requests) to Supabase.
    - **Clear Dirty Flags**: Resets `hasUnsavedChanges`.

## 4. Security & Data Isolation (RLS)

- **Row Level Security**: Although managed by Supabase, the frontend enforces strict `user_id` filtering.
- **UUID Consistency**: All IDs are standardized to UUID v4 to prevent type mismatches in PostgreSQL (`invalid input syntax for type uuid`).
- **Cascading Deletes**:
    - Deleting a `Project` triggers a cascade delete of all `ProjectVersion`s and `BQItem`s associated with it. This prevents "orphaned rows" in the database.

## 5. Directory Structure Breakdown

```
/
├── components/          # Reusable UI View Controllers
│   ├── BQBuilderView.tsx    # [COMPLEX] The main spreadsheet editor. Handles grid navigation, drag-and-drop reordering, and modal interactions.
│   ├── MasterListView.tsx   # Management of the global price book.
│   ├── QuotationView.tsx    # Read-only specific view for generating output documents.
│   ├── SettingsView.tsx     # Profile and App configuration.
│   └── ...
├── initialDataStrategies.ts # [CONFIG] Startup/Seeding data for new accounts.
├── pricingStrategies.ts     # [LOGIC] Pure functions defining the math recipes (A-K).
├── store.tsx            # [KERNEL] The brain of the app. Handles:
                         # - Auth (Login/Logout)
                         # - Data Fetching
                         # - Complex Mappers (DB <-> Frontend)
                         # - Global Calculation Orchestration
├── types.ts             # [CONTRACT] TypeScript interfaces defining the Domain Model.
└── constants.ts         # [I18N] Translation strings for EN/MS/ZH.
```

## 6. Key Workflows / "How It Works"

### Creating a New Project
1.  User clicks "Add Project".
2.  System generates a new Project UUID.
3.  **Crucial Step**: System creates an "Empty Initial Version" matches the *current* Master List.
4.  User is redirected to BQ Builder.

### Adding Items to BQ
1.  User opens "Add Item" modal.
2.  Selects items from the *Version Snapshot*.
3.  Code copies the Item's costing (FOB, Forex, etc.) into a new `BQItem` record.
4.  User modifies Qty.
5.  System calculates `Total = Price * Qty`.

### Generating a Quote
1.  User switches to `QuotationView`.
2.  System renders the component.
3.  Client-side code (`html2canvas`) captures the DOM element.
4.  Generates a multi-page PDF with proper headers/footers.

## 7. Configuration & Environment

- **.env.local**: Contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- **vite.config.ts**: Configured for `@vitejs/plugin-react` and local proxying if needed (currently serving on 0.0.0.0).

---
*Generated by Antigravity Agent (Google DeepMind) - Beta 3.2 Documentation Update*
