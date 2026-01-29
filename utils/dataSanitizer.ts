import { z } from 'zod';
import { MasterItem, PriceField } from '../types';

// Zod Schema for PriceField JSONB column
const PriceFieldSchema = z.object({
    value: z.number().default(0),
    strategy: z.string().default('MANUAL'),
    manualOverride: z.number().nullable().optional().default(0)
});

// Full Master Item Schema
const MasterItemSchema = z.object({
    id: z.string(),
    brand: z.string().default(''),
    axsku: z.string().default(''),
    mpn: z.string().default(''),
    group: z.string().default(''),
    category: z.string(),
    description: z.string().default(''),
    itemName: z.string(),
    price: z.number().default(0),
    uom: z.string().default('Unit'),
    rexScFob: z.number().default(0),
    forex: z.number().default(1),
    sst: z.number().default(1),
    opta: z.number().default(0.97),
    rexScDdp: PriceFieldSchema,
    rexSp: PriceFieldSchema,
    rexRsp: PriceFieldSchema,
});

/**
 * Sanitize a raw database Master Item
 * Returns safe defaults for any invalid/missing fields
 */
export function sanitizeMasterItem(raw: any): MasterItem {
    const result = MasterItemSchema.safeParse(raw);

    if (!result.success) {
        console.warn('Data validation failed for item:', raw.id, result.error);

        // Return safe fallback with partial data
        return {
            id: raw.id || 'unknown',
            brand: raw.brand || '',
            axsku: raw.axsku || '',
            mpn: raw.mpn || '',
            group: raw.group || '',
            category: raw.category || 'Uncategorized',
            description: raw.description || '',
            itemName: raw.itemName || 'Unknown Item',
            price: 0,
            uom: raw.uom || 'Unit',
            rexScFob: 0,
            forex: 1,
            sst: 1,
            opta: 0.97,
            rexScDdp: { value: 0, strategy: 'MANUAL', manualOverride: 0 },
            rexSp: { value: 0, strategy: 'MANUAL', manualOverride: 0 },
            rexRsp: { value: 0, strategy: 'MANUAL', manualOverride: 0 },
        };
    }

    return result.data;
}
