
/**
 * formatters.ts
 * Shared display-formatting helpers for the application.
 * These are pure presentation functions — no business logic.
 */

/**
 * Format a number as a localized currency string with 2 decimal places.
 * e.g. 1234.5 → "1,234.50"
 */
export const formatNumber = (n: number): string =>
    n?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00';

/**
 * Format a decimal fraction as a percentage string with 1 decimal place.
 * e.g. 0.125 → "12.5%"
 */
export const formatPercent = (n: number): string =>
    ((n ?? 0) * 100).toFixed(1) + '%';
