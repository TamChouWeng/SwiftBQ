# Changelog

All notable changes to SwiftBQ will be documented in this file.

## [Beta 3.9.2]

### Critical Fix: Quantity Loss From a Client-Side Duplicate-Row Race
- **Root cause found**: `syncMasterToBQ` (BQ Builder Catalog tab quantity entry) decided insert-vs-update for a row from a stale render closure. Typing a quantity fast enough into a not-yet-added item could fire two calls that both saw "not found" and both inserted a row for the same item — a client-side race entirely independent of Download, Review-tab layout, or multiple devices, matching what customers were experiencing at scale when quantifying many items in one session.
- **Made the decision race-proof**: the insert/update/delete decision now runs inside a `setBqItems` functional updater, so it always reads the freshest state no matter how fast input arrives — no more duplicate rows, no more quantities reverting after a refresh.
- **Snapshot sync no longer touches quantity**: `updateProjectSnapshot`'s per-item catalog sync write is now serialized per-row (`runExclusive`) and excludes `qty` from its payload, closing a second, independent path where a catalog/price update could silently revert an item's saved quantity.

### Save-Gated Quantity, Pricing & Optional Toggle
- Quantity, SC DDP/SP/RSP pricing, and the "isOptional" toggle no longer write to the database on every keystroke — they're staged locally (the same buffered pattern description edits already used) and flushed together when Save is clicked, replacing a large burst of per-keystroke network writes with one commit.
- Reducing an item's quantity to zero no longer deletes it instantly — it's marked for removal and only actually deleted on Save, consistent with everything else now being Save-gated.
- "Discard Changes" now re-pulls the last-saved state from the server, since quantity/pricing edits are applied optimistically to local state ahead of Save.
- Added a browser "unsaved changes" warning on tab close/refresh, since quantity edits no longer autosave instantly.

### BQ Builder Toolbar
- **Manual Refresh**: new button between Save and Columns that pulls just the currently open project version's latest data from the server on demand, disabled while there are unsaved changes so it can't silently discard them.
- **Review/Catalog Parity**: Search and Category filter now also work in the Review tab, and Save is available from both tabs (previously Catalog-only).

## [Beta 3.9.1]

### Critical Fix: Save Clobbered by Cross-Device Refetch & Race Hardening
- **Closed the Idle-Refetch Race**: The focus-triggered resync added in 3.9.0 only checked for unsaved edits, but every Save clears its edit buffer optimistically *before* the network write resolves — so a focus/visibility event during that window (e.g. switching back from a second logged-in device) could refetch stale data from the database and stomp an in-flight save. The refetch now also waits for any active save to finish (`isSaving`) as well as in-flight row writes (`writeQueueRef.current.size > 0`), ensuring background cell updates (quantity, price, optional toggles) are never clobbered.
- **Unified the Catalog Save Path**: The BQ Builder's catalog "Save" button wrote directly to the database without awaiting the result, bypassing the app's save-tracking entirely. It now routes through the same `saveAllChanges` path used everywhere else, so it's covered by the fix above.
- **Atomic Snapshot Read-Modify-Write**: Consolidated snapshot read and merge-write cycles into a single atomic `runExclusive` block per version ID in `updateProjectSnapshot` and `addCustomBQItem`, preventing concurrent snapshot writes from interleaving and overwriting each other.
- **Queue Fault-Tolerance & Network Error Handling**: Refactored the `runExclusive` serialization queue to recover cleanly from rejections (`prev.catch(() => {}).then(fn)`) and attached `.catch()` handlers across single-row DB mutation calls to eliminate unhandled promise rejections on network dropouts.
- **Functional State Updates**: Swapped `removeBQItem` to functional state updates (`prev => prev.filter(...)`) to eliminate stale React closures.

## [Beta 3.9.0]

### Critical Fix: BQ Builder Data Loss
- **Eliminated Snapshot Overwrite Race**: `project_versions.master_list_snapshot` writes (catalog Save, custom item add) now merge onto the current database state instead of the client's in-memory copy, so a tab left open for a while — or a second device — can no longer silently erase items another session had already saved.
- **Eliminated Temp-ID Insert Race**: New BQ item rows now use their final ID from the moment of creation instead of a temporary ID swapped in after the insert completes, closing the window where a fast follow-up quantity edit could be silently written to a row the database never matched.
- **Serialized Row Writes**: Writes to the same BQ item are now queued and executed strictly in the order they were made, preventing network latency from delivering them out of order.
- **Focus-Triggered Resync**: Projects and BQ items now automatically refresh when a tab regains focus (skipped while there are unsaved local edits), reducing drift between long-open sessions and other devices.
- **Visible Save Failures**: A failed save now shows an on-screen alert instead of failing silently, so issues surface immediately instead of appearing as unexplained missing data later.

## [Beta 3.8.5]

### Parallel Multi-Column Sorting
- **Hierarchical Sorting**: Implemented multi-column sorting that evaluates sorting criteria sequentially (Category, Item name, and REX SC (FOB) price).
- **Sort Levels Configurator**: Redesigned the Sort Dropdown into a "Sort Levels" panel allowing addition of up to 3 hierarchical sorting criteria with independent direction controls.
- **Smart Select Validation**: Automatically restricts selection options in sort level dropdowns to columns not already configured, preventing duplicate sort criteria.

## [Beta 3.8.4]

### Default Terms & Conditions Feature
- Added `default_tnc` column to `profiles` table with standardized T&C text.
- Integrated default T&C into new project creation flow.
- Updated UI to allow editing default T&C in Settings.
- Ensured synchronization between DB and local state.

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
