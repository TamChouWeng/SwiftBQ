# Changelog

All notable changes to SwiftBQ will be documented in this file.

## [Beta 3.8.3]

### PDF Export Layout Optimization
- **Address Wrapping**: Implemented automatic text wrapping for both Company and Client addresses in the exported PDF, preventing horizontal overflow and ensuring clean alignment.
- **Horizontal Reservation**: Ensured that wrapped address lines maintain consistent horizontal indentation (20mm), preserving a dedicated visual "reserved space" for labels like "Address:".
- **Dynamic Positioning**: Updated the PDF generation engine to dynamically calculate the vertical space occupied by addresses, preventing overlap with subsequent document sections regardless of content length.

## [Beta 3.8.2]

### Discount-Aware Quotation Margins
- **Dynamic Margins**: Updated row-level Gross Profit (`GP`) and `GP%` calculation logic in the BQ Builder to distribute project-level Special Discounts proportionally based on an item's slice of total revenue.
- **Accurate Project Summary**: The bottom bar internal metrics panel now calculates overall project `GP` and `GP%` against the discounted Net Revenue, ensuring true profitability tracking.
- **Visual Discount Indicator**: Added a dedicated **`Disc:`** indicator inside the bottom bar metrics ribbon when a special discount is active, providing clear visual feedback on revenue adjustments.
- **Centralized Reactivity**: Refactored `getProjectTotal` in `store.tsx` to read buffered `pendingProjectEdits` discount overrides instantly, guaranteeing seamless, zero-latency feedback across all panels as you type.

## [Beta 3.8.1]

### High-Fidelity PDF Preview
- **PDF-First Architecture**: Replaced manual DOM-based pagination and HTML table rendering with a centralized jsPDF generation approach.
- **1:1 WYSIWYG Accuracy**: The Web UI now seamlessly embeds the live-generated PDF via an iframe using an in-memory `bloburl`. This guarantees a flawless, pixel-perfect match between the responsive on-screen preview and the final exported document.
- **Real-Time Generation**: Modifying project settings (like discounts or SST) instantaneously triggers a background regeneration of the preview document.

## [Beta 3.8]

### Financial Control Enhancements
- **Advanced Taxation & Discounts**: Introduced dynamic Sales and Service Tax (SST) selection and Special Discount inputs directly within the Quotation View.
- **State Buffer Integration**: Custom financial modifiers are buffered into the global `pendingProjectEdits` state, allowing real-time preview updates without taxing the database until explicitly saved.

## [Beta 3.7]

### Authoritative Pricing Sync
- **Dynamic Price Resolution**: Fixed critical discrepancy where the Builder Catalog view calculated row totals based on dynamic Master List snapshots, but the bottom bar Grand Totals aggregated stale database cache. 
- **Consolidated Mathematics**: All project bottom bar and global Grand Total metrics now mathematically guarantee perfect parity with the on-screen generated item prices, resolving database sync ghosts entirely by enforcing the Snapshot as the absolute source of truth.

## [Beta 3.6]

### Robust State Management & Data Integrity
- **Granular Database Updates**: Eliminated dangerous "whole-object" database writes. Saves now only update specific modified columns, preventing cross-tab data overwrites.
- **Eliminated Save Race Conditions**: Fixed critical synchronization bugs where rapidly switching between the BQ Builder and Quotation View would cause description edits or quantity changes to mutually overwrite.
- **Independent Tab Buffers**: Quotation-specific edits (like descriptions and discounts) are now securely buffered in the global state independently from Catalog edits, guaranteeing that changes naturally merge without conflict.

### Intelligent Save Guard
- **Foolproof Tab Switching**: The "Unsaved Changes" guard dialog now correctly detects and protects all pending edits (including catalog changes and special discounts) before allowing tab navigation.
- **Predictable Discard Logic**: Removed premature background database writes. Clicking "Discard Changes" now flawlessly reverts all visual inputs and uncommitted states back to the last known database snapshot, ensuring complete user control.

## [Beta 3.5]
- **Add Custom Items to BQ**: Users can now add custom items directly to a specific quotation (project & version) without adding them to the global master list. Custom items persist in the project snapshot and automatically appear in both Catalog and Review views.

### UI Refinements & Bug Fixes
- **Smart Dropdowns**: Smart Price Strategy dropdowns now intelligently align themselves (upwards or to the right) to prevent clipping by screen or modal edges.
- **Reliable State Management**: Eliminated data loss bugs in the BQ Builder Catalog where newly typed quantities or prices would randomly disappear when choosing a pricing strategy because of stale React closures.
- **Header Cleanup**: Removed the redundant "Add Custom Item" Plus button from the main BQ Builder header to provide a cleaner layout.

## [Beta 3.3]

### High-Fidelity Quotation Preview
- **Continuous Layout**: Replaced paginated view with a seamless, single-scroll experience.
- **WYSIWYG Accuracy**: On-screen preview now exactly mirrors the PDF output, including headers, footers, and item flow.
- **Smart Layout**: Headers appear logically at the start, and totals/signatures naturally at the end, without artificial page breaks interrupting the view.

### Data Independence (Snapshots)
- **Immutable Quotes**: When a new project version is created, the system takes a "snapshot" of the Master List.
- **Safety**: Subsequent price increases in the Master List do **not** affect existing quotes. Your historical data remains 100% accurate to the time it was created.

### Transactional Save System
- **Optimistic UI**: Experience instant feedback in the BQ Builder. Data is saved locally first for zero latency.
- **Batch Commits**: Changes are synced to the cloud (Supabase) in a single transaction only when you click "Save", ensuring data integrity and preventing partial updates.

### Dynamic Pricing Engine
- **Smart Formulas**: Prices are calculated automatically using configurable "Recipes" (e.g., `(FOB * Forex * SST) / OPTA`).
- **Real-time Updates**: Toggle between pricing strategies to instantly see the impact on your margins.

### Enterprise-Grade Security
- **Data Isolation**: Strict Row Level Security ensures users can only access their own projects.
- **Cascading Precision**: Deleting a project automatically cleans up all related versions and items, keeping your database pristine.
