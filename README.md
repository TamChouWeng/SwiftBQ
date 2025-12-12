
# SwitftBQ (Beta 1.0)

A sleek, responsive application for managing Bills of Quantities (BQ) and generating professional Quotations.

## Features
- **Master List Management**: Maintain a comprehensive product catalog with automatic calculation of pricing structures (FOB -> DDP -> RSP).
- **BQ Builder**: Create projects, add items from your master list, and manage quantities.
- **Quotation View**: Generate beautiful, printable PDF quotations instantly.
- **Dark Mode & Multi-language**: Supports Light/Dark themes and English/Malay/Chinese languages.

## Beta 1.0 Release Notes
This is the **Beta 1.0** release of SwitftBQ. 

### Data Persistence (Netlify / Web Version)
**Important Note for Users:**
This version is designed as a Proof of Concept (POC) and does not currently connect to a backend cloud database. Instead, it uses **Browser Local Storage**.

*   **Where is my data?** All projects, settings, and master list changes are saved directly in your web browser.
*   **Will I lose my data?** No. You can refresh the page or close the tab, and your data will remain saved when you return.
*   **Limitations:** Data is **not** synced between devices. If you open this app on a different computer or browser, you will not see your projects from this device. Clearing your browser cache will delete your data.

## Tech Stack
- React 18
- TypeScript
- Tailwind CSS
- Lucide React Icons
- jsPDF & html2canvas
