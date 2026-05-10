# SwiftBQ Project Architecture & Features

## 📝 Overview
SwiftBQ is a professional Bill of Quantities (BQ) and Quotation management system designed for the construction industry. It solves the critical challenge of maintaining a live "Master Price Book" while ensuring that historical quotations remain immutable through robust data independence.

## 🚀 Core Features

### Data Integrity & Reliability
- **Immutable Quotes (Snapshots):** Guarantees that historical quotations are completely insulated from future price adjustments. Creating a project version captures a static snapshot of the Master List, preserving 100% accuracy for auditing and client trust.
- **Transactional Save System:** Eliminates the risk of fragmented or corrupted records. Edits are batch-committed to cloud storage in a single transaction, ensuring comprehensive data consistency.
- **Cascading Precision:** Maintains a clean and performant database over time. Deleting a project automatically triggers a synchronized cleanup of all its associated versions and sub-items.

### User Experience & Performance
- **Optimistic UI:** Provides a zero-latency experience for users. The BQ Builder saves data locally first, providing instantaneous feedback without waiting for network responses.
- **High-Fidelity Quotation Preview:** Empowers teams to review exactly what clients will see. Replaced artificial DOM layouts with an embedded, real-time jsPDF engine preview that guarantees a pixel-perfect, 1:1 visual match with the exported document.
- **Smart UI Infrastructure:** Prevents interface friction and data loss. Intelligent dropdowns adjust to viewport boundaries, and strict state management ensures inputs are reliably captured during complex strategy adjustments.

### Financial Control & Security
- **Dynamic Pricing Engine:** Accelerates the quoting process and margin analysis. Calculates prices on the fly using customizable formulas, allowing rapid toggling between distinct pricing strategies to assess margin impacts immediately.
- **Advanced Taxation & Discounts:** Seamlessly apply Sales and Service Tax (SST) and Special Discounts directly from the Quotation View. Values are persisted to the database and cleanly formatted into the exported PDF.
- **Enterprise-Grade Security:** Enforces strict data privacy. Supabase Row Level Security (RLS) ensures that user records and client datasets are aggressively isolated by account.

## 🏗 Architecture & Tech Stack

### Frontend Ecosystem
- **React 19:** Component-driven user interface.
- **TypeScript:** End-to-end type safety and enhanced developer experience.
- **Vite:** Lightning-fast module bundling and local dev server.
- **Tailwind CSS:** Utility-first framework for responsive and consistent styling.
- **jsPDF:** Robust client-side PDF document generation.

### Backend & Infrastructure
- **Supabase (PostgreSQL):** Powerful relational database management.
- **Real-time Sync:** Continuous synchronization of profiles, catalogs, and project states across sessions.
- **Row Level Security (RLS):** Database-level access policies governing strictly partitioned datasets.

## 📁 Directory Structure
- `/components/`: The UI view layer (e.g., `BQBuilderView`, `QuotationView`, `SettingsView`).
- `/utils/`: Pure helper functions and data sanitizers.
- `/store.tsx`: The heart of the application. Contains the React `AppContext`, Supabase client initialization, all data mappers between DB and UI, and the global optimistic state buffers.
- `/types.ts`: TypeScript interfaces defining the database schema and application entities (`MasterItem`, `Project`, `BQItem`).
- `/pricingStrategies.ts` & `/mathUtils.ts`: The dynamic pricing engine containing formulas for DDP, SP, and RSP strategies.
- `/App.tsx`: The main entry point handling high-level layout and rendering.

## 🧠 State Management & Data Flow
SwiftBQ employs a highly **Optimistic UI** driven by a centralized React Context (`AppContext`) inside `store.tsx`. 

- **Independent Edit Buffers:** Instead of binding inputs directly to the main state, user edits are captured in isolated state dictionaries (e.g., `masterListEdits`, `versionEdits`, `bqStagedEdits`, `pendingProjectEdits`).
- **Conflict Resolution:** By buffering edits based on context, the system allows users to freely navigate between tabs without triggering race conditions or premature database writes.
- **Transactional Commits:** Changes only hit the Supabase database when explicitly saved via `saveAllChanges()` or specific `commit` functions, allowing users to safely discard complex UI experiments without data corruption.

## 🗄️ Database Integration (Supabase)
SwiftBQ leverages **Supabase** (PostgreSQL) for robust cloud persistence and authentication.

- **Real-time Sync**: User profiles, company details, and project data are synchronized across devices.
- **Row Level Security (RLS)**: Ensures data privacy by strictly isolating records based on `user_id`.
- **Tables Structure**:
  - `master_list_items`: Global price book.
  - `projects` & `project_versions`: Project metadata and version snapshots.
  - `bq_items`: Individual bill of quantities items linked to versions.
  - `profiles`: User settings and signatures.
