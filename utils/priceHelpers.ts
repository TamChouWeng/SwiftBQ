
/**
 * priceHelpers.ts
 * Shared helpers for resolving PriceField values.
 * PriceField is a JSONB object { value, strategy, manualOverride? } stored in Supabase.
 * Legacy rows may store a plain number — these helpers handle both shapes safely.
 */

import { PriceField } from '../types';

/**
 * Extracts the numeric value from a PriceField object or a plain number.
 * Returns 0 if the input is null / undefined / unrecognised shape.
 */
export const getPriceValue = (val: any): number => {
    if (typeof val === 'number') return val;
    if (val && typeof val === 'object' && 'value' in val) return val.value;
    return 0;
};

/**
 * Normalises any value into a well-formed PriceField.
 * Handles legacy rows that stored a plain number instead of an object.
 */
export const getPriceField = (val: any): PriceField => {
    if (val && typeof val === 'object' && 'strategy' in val) return val;
    return { value: Number(val) || 0, strategy: 'MANUAL', manualOverride: Number(val) || 0 };
};
