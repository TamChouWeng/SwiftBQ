# SwitftBQ
> **Status**: Beta 3.3
> **Version**: 3.3.0

SwitftBQ is a modern web application designed to streamline the process of creating Bills of Quantities (BQ) and managing quotations. Built with React, Vite, and Tailwind CSS, it offers a responsive and intuitive interface for construction and project management professionals.

## 🚀 What's New in Beta 3.3
- **📄 Enhanced Quotation Preview**:
    - **True-to-Life Rendering**: The preview now uses a continuous scroll layout that matches the final PDF export 1:1.
    - **Seamless Experience**: Removed clunky on-screen pagination in favor of a natural document flow.
    - **Visual Consistency**: Fixed issues where headers or footers would misalign between preview and export.

## 🚀 What's New in Beta 3.2
- **💾 Transactional Save Architecture**:
    - **No More Auto-Save Lag**: Changes in the BQ Builder and Quotation View are now instant. Database writes are deferred until you explicitly click **Save**.
    - **Unified Commit**: One "Save" button to rule them all. Persists BQ quantities, descriptions, and master list edits in a single transaction.
    - **Smart De-Duplication**: Fixed issues where description edits could create duplicate rows.
- **📝 Enhanced Quotation Editing**:
    - **Consolidated Description**: The separate "Quotation Description" field is gone. Edits now update the main Description directly.
    - **Dynamic Terms & Conditions**: T&C are now version-specific and editable directly in the Quotation View.

## 🚀 What's New in Beta 3.1
- **🔒 Data Isolation & Security**:
    - **User-Specific Data**: Projects and BQ Items are now strictly isolated per user account. Using custom UUID logic, we ensure zero data leakage between users.
    - **Robust Auth**: App settings and profile data are now consistently hydrated from the database on login.
- **🗑️ Cascading Delete**:
    - **Clean Database**: Deleting a project now permanently removes all associated BQ Items and Project Versions, preventing orphaned data and saving space.
- **⚡ Optimistic UI Updates**:
    - **Instant Feedback**: Creating projects now instantly updates the UI without requiring a page refresh.
    - **Version Handling**: Initial Empty Versions are properly attached on creation for immediate access.
- **🐛 Critical Bug Fixes**:
    - **UUID Compatibility**: Fixed "invalid input syntax for type uuid" by implementing standard UUID generation across the app.
    - **Empty Catalog Fix**: Resolved an issue where new projects started with an empty master list; they now correctly snapshot the current master data.
    - **Settings UI**: Fixed visual bugs where empty profile fields showed default text instead of blanks.

## 🚀 What's New in Beta 3.0
- **Cloud Synchronization**:
    - **User Profile Sync**: Name, Contact, and Role changes in Settings are now seamlessly synced to the cloud database.
    - **Company Info Sync**: Company Name, Address, and Bank details are now persisted across sessions via the database.
- **Robust Data Handling**: Fixed database column mappings (e.g., `phone`) to ensure reliable data storage.
- **Input Validation**: Added strict input validation for Contact Numbers (digits, +, -, spaces only) to maintain data quality.
- **Enhanced Add Item UI**: New modal with "Save & Add Another" workflow and smart price inputs directly in the creation flow.
- **Formulas Live Update**: Catalog changes now immediately trigger price recalculations (DDP, SP, RSP) without refresh.
- **Smart BQ Linkage**: Saving changes in the Catalog now instantly updates all linked items in the BQ Review list.
- **Reliable Calculations**:
    - Fixed "Grand Total NaN" issues by adding robust safety checks.
    - Updated Grand Total logic to strictly sum the item TRSP column for accuracy.
- **PDF Export Polish**: Fixed vertical alignment issues in generated PDF tables to ensure professional centering.

## Features

### 📋 Master List Management
- Maintain a comprehensive database of materials, labor, and equipment.
- Easily search, filter, and update your master list items.
- **Smart Pricing**: Define complex pricing strategies (Recipes A-K) for automated calculations.

### 🏗️ BQ Builder
- Construct detailed Bills of Quantities by selecting items from your Master List.
- Organize items into sections and categories.
- **Duplicate Projects**: Quickly clone existing projects including all items and versions.
- **Catalog View**: spreadsheet-like editor for rapid pricing updates.
- **Review View**: Finalize quantities and options before export.

### 📄 Quotation Generation
- Generate professional quotations based on your built BQs.
- Customize quotation details and formatting.
- **Sorting**: Sort projects by date or validity period.
- **PDF Export**: High-quality A4 PDF generation with pagination.

### ⚙️ Settings & Customization
- **Theme**: Toggle between Dark and Light modes for comfortable viewing in any environment.
- **Language**: Support for multiple languages (English default).
- **Data Persistence**: Your preferences and data are saved locally.

## Getting Started

### Prerequisites
- Node.js (v20 or higher recommended)
- npm

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/SwitftBQ.git
   ```
2. Navigate to the project directory:
   ```bash
   cd SwiftBQ
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally
To start the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

### Building for Production
To build the application for deployment:
```bash
npm run build
```

## Deployment
This project is configured for automated deployment to GitHub Pages via GitHub Actions.
1. Push changes to the `main` branch.
2. The `Deploy to GitHub Pages` action will automatically build and deploy the site.

## Technologies
- **Frontend**: React 19, TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS, Lucide React (Icons)
- **PDF Generation**: html2canvas, jspdf

## License
[MIT](LICENSE)
