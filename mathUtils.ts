
/**
 * mathUtils.ts
 * Shared mathematical helper functions for the application.
 */

/**
 * Excel-like CEILING function.
 * Rounds a number up to the nearest multiple of significance.
 * 
 * @param num The number to round.
 * @param significance The multiple to which you want to round.
 * @returns The rounded number.
 */
export const excelCeiling = (num: number, significance: number): number => {
    if (significance === 0) return num;

    // Handle floating point precision issues (e.g. 0.1 + 0.2 !== 0.3)
    // We use a small epsilon for robustness, but usually just Math.ceil(num / sig) * sig works.
    // Ideally, we might want to round inputs to a certain precision before operation, 
    // but for pricing, this standard implementation usually suffices.

    // Use a precision fix for the division step to avoid 3.00000000004 cases being ceiled up 
    const precision = 1000000;
    const quotient = Math.round((num / significance) * precision) / precision;

    return Math.ceil(quotient) * significance;
};
