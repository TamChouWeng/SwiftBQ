# SwitftBQ
> **Status**: Beta 2.0  
> **Version**: 2.0.0

SwitftBQ is a modern web application designed to streamline the process of creating Bills of Quantities (BQ) and managing quotations. Built with React, Vite, and Tailwind CSS, it offers a responsive and intuitive interface for construction and project management professionals.

## Features

### 📋 Master List Management
- Maintain a comprehensive database of materials, labor, and equipment.
- Easily search, filter, and update your master list items.

### 🏗️ BQ Builder
- Construct detailed Bills of Quantities by selecting items from your Master List.
- Organize items into sections and categories.
- **Duplicate Projects**: Quickly clone existing projects including all items and versions.
- Real-time calculation of totals and subtotals.

### 📄 Quotation Generation
- Generate professional quotations based on your built BQs.
- Customize quotation details and formatting.
- **Sorting**: Sort projects by date or validity period.
- Export quotations to PDF.

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
