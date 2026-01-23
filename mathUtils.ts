
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

    const result = Math.ceil(quotient) * significance;

    // Fix final floating point precision (e.g. 850.800...004 -> 850.8)
    // We determine decimals from significance (e.g. 0.1 has 1 decimal)
    if (significance < 1 && significance > 0) {
        const decimals = Math.ceil(-Math.log10(significance));
        // Use a slight buffer in rounding to handle typical float errors
        return Number(result.toFixed(Math.max(decimals, 0)));
    }

    return Number(result.toFixed(2)); // Default to 2 decimals for pricing context if sig >= 1 or weird
};
