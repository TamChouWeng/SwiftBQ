# SwiftBQ
**Version**: Beta 3.3

## 📝 Overview
SwiftBQ is a professional Bill of Quantities (BQ) and Quotation management system designed for the construction industry. It solves the critical challenge of maintaining a live "Master Price Book" while ensuring that historical quotations remain immutable through robust data independence.

## 🚀 Key Features (Beta 3.3)

### 1. High-Fidelity Quotation Preview
- **Continuous Layout**: Replaced paginated view with a seamless, single-scroll experience.
- **WYSIWYG Accuracy**: On-screen preview now exactly mirrors the PDF output, including headers, footers, and item flow.
- **Smart Layout**: Headers appear logically at the start, and totals/signatures naturally at the end, without artificial page breaks interrupting the view.

### 2. Data Independence (Snapshots)
- **Immutable Quotes**: When a new project version is created, the system takes a "snapshot" of the Master List.
- **Safety**: Subsequent price increases in the Master List do **not** affect existing quotes. Your historical data remains 100% accurate to the time it was created.

### 3. Transactional Save System
- **Optimistic UI**: Experience instant feedback in the BQ Builder. Data is saved locally first for zero latency.
- **Batch Commits**: Changes are synced to the cloud (Supabase) in a single transaction only when you click "Save", ensuring data integrity and preventing partial updates.

### 4. Dynamic Pricing Engine
- **Smart Formulas**: Prices are calculated automatically using configurable "Recipes" (e.g., `(FOB * Forex * SST) / OPTA`).
- **Real-time Updates**: Toggle between pricing strategies to instantly see the impact on your margins.

### 5. Enterprise-Grade Security
- **Data Isolation**: Strict Row Level Security ensures users can only access their own projects.
- **Cascading Precision**: Deleting a project automatically cleans up all related versions and items, keeping your database pristine.

## �️ Database Integration (Supabase)
SwiftBQ leverages **Supabase** (PostgreSQL) for robust cloud persistence and authentication.

- **Real-time Sync**: User profiles, company details, and project data are synchronized across devices.
- **Row Level Security (RLS)**: ensures data privacy by strictly isolating records based on `user_id`.
- **Tables Structure**:
  - `master_list_items`: Global price book.
  - `projects` & `project_versions`: Project metadata and version snapshots.
  - `bq_items`: Individual bill of quantities items linked to versions.
  - `profiles`: User settings and signatures.

## �💻 Tech Stack
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **PDF Engine**: Client-side generation with `jspdf`
