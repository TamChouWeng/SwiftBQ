# SwitftBQ (Beta 1.0)

A sleek, responsive React application for managing Bills of Quantities (BQ) and generating professional Quotations. Built with TypeScript and Tailwind CSS.

## 🚀 Features

### 🛠️ Master List & Pricing Engine
- **Comprehensive Catalog**: Manage products with detailed attributes (Category, UOM, Description).
- **Smart Pricing Logic**: Automatically calculates pricing structures based on input costs:
  - **Inputs**: FOB (Free On Board), Forex, SST, OPTA.
  - **Outputs**: 
    - **REX SC (DDP)**: Calculated with ceiling logic for precision.
    - **REX SP**: Selling Price derived from DDP.
    - **REX RSP**: Recommended Selling Price.
- **Bulk Management**: Filter, search, and manage items efficiently.

### 🏗️ BQ Builder
- **Project Management**: Create and track multiple projects with client details, validity dates, and unique Quote IDs.
- **Catalog Integration**: Seamlessly add items from the Master List to specific projects.
- **Review Mode**: Adjust quantities, view calculated margins (GP, GP%), and toggle optional items.
- **Drag & Drop**: Reorder items in the BQ list for perfect presentation.

### 📄 Quotation View
- **Professional Layout**: Generates a clean, A4-formatted quotation with header, bill-to details, and terms.
- **PDF Export**: Instantly download quotations as PDF files (powered by `html2canvas` and `jspdf`).
- **Standard vs Optional**: Automatically separates standard items from optional add-ons in the final output.

### 🎨 UI/UX
- **Theme Support**: Toggle between Light and Dark modes.
- **Multi-language**: Built-in support for English, Bahasa Melayu, and Chinese (Simplified).
- **Responsive**: Fully functional on desktop and mobile devices with a collapsible sidebar.

---

## ⚠️ Important Note on Data Persistence

**Hosting on Netlify / Vercel / GitHub Pages:**

This application is currently a **Client-Side Only** application (Beta 1.0). It **does not** connect to a cloud database (like Firebase or SQL).

*   **Storage Method**: All data (Master List, Projects, Quotations) is saved in your browser's **Local Storage**.
*   **What this means for you**:
    *   ✅ **It Works Offline**: You can use it without internet once loaded.
    *   ✅ **Data Survives Refreshes**: You can close the tab or restart the browser, and data remains.
    *   ❌ **Device Specific**: Data entered on your **Laptop** will NOT appear on your **Phone**.
    *   ❌ **Browser Specific**: Data entered in **Chrome** will NOT appear in **Safari**.
    *   ⚠️ **Clearing Cache**: If you clear your browser's "Site Data" or "LocalStorage", your data will be erased.

---

## 🛠️ Tech Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **PDF Generation**: html2canvas, jsPDF
- **Build Tool**: Vite (implied structure)

## 📦 Getting Started

To run this project locally:

1.  **Install dependencies**
    ```bash
    npm install
    ```

2.  **Start the development server**
    ```bash
    npm run dev
    ```

3.  **Build for production**
    ```bash
    npm run build
    ```

## 📝 Version History

- **Beta 1.0**: Initial release with core BQ functionalities, local storage persistence, and PDF export.
