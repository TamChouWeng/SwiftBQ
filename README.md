# SwitftBQ
> **Status**: Beta 2.2
> **Version**: 2.2.0

SwitftBQ is a modern web application designed to streamline the process of creating Bills of Quantities (BQ) and managing quotations. Built with React, Vite, and Tailwind CSS, it offers a responsive and intuitive interface for construction and project management professionals.

## 🚀 What's New in Beta 2.2
- **Enhanced Add Item UI**: New modal with "Save & Add Another" workflow and smart price inputs directly in the creation flow.
- **Formulas Live Update**: Catalog changes now immediately trigger price recalculations (DDP, SP, RSP) without refresh.
- **Smart BQ Linkage**: Saving changes in the Catalog now instantly updates all linked items in the BQ Review list.
- **Review View Enhancements**:
    - Synchronized UI styles (fonts, alignment) with Catalog view.
    - Disabled direct editing of formula-derived columns to prevent inconsistencies.
    - Fixed drag-and-drop reordering UI.
- **Reliable Calculations**:
    - Fixed "Grand Total NaN" issues by adding robust safety checks.
    - Updated Grand Total logic to strictly sum the item TRSP column for accuracy.
- **PDF Export Polish**: Fixed vertical alignment issues in generated PDF tables to ensure professional centering.
- **UX Improvements**: Added confirmation prompts when deleting Master items to prevent accidental data loss.

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
