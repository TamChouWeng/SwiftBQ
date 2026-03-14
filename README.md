# SwiftBQ
**Version**: Beta 3.6
SwiftBQ is a professional Bill of Quantities (BQ) and Quotation management system engineered for the construction industry. It resolves the critical challenge of maintaining a live, centralized Master Price Book while ensuring historical quotations remain completely immutable and strictly isolated.

<!-- Badges -->
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-Latest-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)

> **� Visuals Placeholder:**  
> *[Author: Please insert a high-quality product screenshot or demo GIF here showcasing the BQ Builder or the seamless Quotation Preview]*

## 🚀 Core Features

### Data Integrity & Reliability
- **Immutable Quotes (Snapshots):** Guarantees that historical quotations are completely insulated from future price adjustments. Creating a project version captures a static snapshot of the Master List, preserving 100% accuracy for auditing and client trust.
- **Transactional Save System:** Eliminates the risk of fragmented or corrupted records. Edits are batch-committed to cloud storage in a single transaction, ensuring comprehensive data consistency.
- **Cascading Precision:** Maintains a clean and performant database over time. Deleting a project automatically triggers a synchronized cleanup of all its associated versions and sub-items.

### User Experience & Performance
- **Optimistic UI:** Provides a zero-latency experience for users. The BQ Builder saves data locally first, providing instantaneous feedback without waiting for network responses.
- **High-Fidelity Quotation Preview:** Empowers teams to review exactly what clients will see. Delivers a seamless, single-scroll WYSIWYG preview that flawlessly mirrors the final PDF export without artificial page breaks.
- **Smart UI Infrastructure:** Prevents interface friction and data loss. Intelligent dropdowns adjust to viewport boundaries, and strict state management ensures inputs are reliably captured during complex strategy adjustments.

### Financial Control & Security
- **Dynamic Pricing Engine:** Accelerates the quoting process and margin analysis. Calculates prices on the fly using customizable formulas, allowing rapid toggling between distinct pricing strategies to assess margin impacts immediately.
- **Enterprise-Grade Security:** Enforces strict data privacy. Supabase Row Level Security (RLS) ensures that user records and client datasets are aggressively isolated by account.

## 🏗 Architecture & Tech Stack

**Frontend Ecosystem**
- **React 19:** Component-driven user interface.
- **TypeScript:** End-to-end type safety and enhanced developer experience.
- **Vite:** Lightning-fast module bundling and local dev server.
- **Tailwind CSS:** Utility-first framework for responsive and consistent styling.
- **jsPDF:** Robust client-side PDF document generation.

**Backend & Infrastructure**
- **Supabase (PostgreSQL):** Powerful relational database management.
- **Real-time Sync:** Continuous synchronization of profiles, catalogs, and project states across sessions.
- **Row Level Security (RLS):** Database-level access policies governing strictly partitioned datasets.

## 🚦 Getting Started / Local Setup

Follow these steps to initialize the development environment locally:

```bash
# 1. Clone the repository
git clone https://github.com/your-username/swiftbq.git
cd swiftbq

# 2. Install dependencies
npm install

# 3. Configure environment variables
# Duplicate the example env file or create a .env file at the project root
echo "VITE_SUPABASE_URL=your_project_url" >> .env
echo "VITE_SUPABASE_ANON_KEY=your_anon_key" >> .env

# 4. Start the development server
npm run dev
```

## 📞 Contact / License

For product inquiries, technical support, or partnership opportunities, please reach out to the development team at `[Insert Contact Email]`.

Distributed under the `[Insert License Type, e.g., MIT]` License. See `LICENSE` for more information.
