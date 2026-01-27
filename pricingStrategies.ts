
/**
 * pricingStrategies.ts
 * Defines the calculation strategies for dynamic pricing columns.
 */

import { excelCeiling } from './mathUtils';

// --- Context Interfaces ---
// These define what data is available to a strategy calculation

export interface DDPContext {
    fob: number;
    forex: number;
    sst: number;
    opta: number;
}

export interface SPContext {
    ddp: number;
}

export interface RSPContext {
    sp: number;
}

// --- Strategy Strategy Interface ---

export interface PricingStrategy<T> {
    id: string;
    label: string;
    calculate: (context: T) => number;
}

// --- 1. REX SC (DDP) Strategies ---

export const DDP_STRATEGIES: PricingStrategy<DDPContext>[] = [
    {
        id: 'DDP_FORMULA_A',
        label: 'Round off 0.01',
        calculate: ({ fob, forex, sst, opta }) => {
            if (opta === 0) return 0;
            return excelCeiling((fob * forex * sst) / opta, 0.01);
        }
    },
    {
        id: 'DDP_FORMULA_B',
        label: 'Round off 0.01 + 30',
        calculate: ({ fob, forex, sst, opta }) => {
            if (opta === 0) return 0;
            const base = excelCeiling((fob * forex * sst) / opta, 0.01);
            return base + 30;
        }
    },
    {
        id: 'DDP_FORMULA_C',
        label: 'Round off 1',
        calculate: ({ fob, forex, sst, opta }) => {
            if (opta === 0) return 0;
            return excelCeiling((fob * forex * sst) / opta, 1);
        }
    },
    {
        id: 'DDP_FORMULA_D',
        label: 'Round off 1 + 4000',
        calculate: ({ fob, forex, sst, opta }) => {
            if (opta === 0) return 0;
            const base = excelCeiling((fob * forex * sst) / opta, 1);
            return base + 4000;
        }
    },
    {
        id: 'MANUAL',
        label: 'Manual Input',
        calculate: () => 0, // Manual strategies don't use the calculate function usually, or return 0
    }
];

// --- 2. REX SP Strategies ---

export const SP_STRATEGIES: PricingStrategy<SPContext>[] = [
    {
        id: 'SP_FORMULA_A',
        label: 'Factro 0.5, round off 0.1',
        calculate: ({ ddp }) => excelCeiling(ddp / 0.5, 0.1)
    },
    {
        id: 'SP_FORMULA_B',
        label: 'Factro 0.7, round off 0.1',
        calculate: ({ ddp }) => excelCeiling(ddp / 0.7, 0.1)
    },
    {
        id: 'SP_FORMULA_C',
        label: 'Factro 0.7, round off 1',
        calculate: ({ ddp }) => excelCeiling(ddp / 0.7, 1)
    },
    {
        id: 'SP_FORMULA_D',
        label: 'Factro 0.75, round off 1',
        calculate: ({ ddp }) => excelCeiling(ddp / 0.75, 1)
    },
    {
        id: 'SP_FORMULA_E',
        label: 'Factro 0.8, round off 0.1',
        calculate: ({ ddp }) => excelCeiling(ddp / 0.8, 0.1)
    },
    {
        id: 'SP_FORMULA_F',
        label: 'Factro 0.8, round off 1',
        calculate: ({ ddp }) => excelCeiling(ddp / 0.8, 1)
    },
    {
        id: 'SP_FORMULA_G',
        label: 'Factro 0.85, round off 0.1',
        calculate: ({ ddp }) => excelCeiling(ddp / 0.85, 0.1)
    },
    {
        id: 'SP_FORMULA_H',
        label: 'Factro 0.85, round off 1',
        calculate: ({ ddp }) => excelCeiling(ddp / 0.85, 1)
    },
    {
        id: 'SP_FORMULA_I',
        label: 'Factro 0.9, round off 0.1',
        calculate: ({ ddp }) => excelCeiling(ddp / 0.9, 0.1)
    },
    {
        id: 'SP_FORMULA_J',
        label: 'Factro 0.95, round off 0.1',
        calculate: ({ ddp }) => excelCeiling(ddp / 0.95, 0.1)
    },
    {
        id: 'SP_FORMULA_K',
        label: 'Factro 1, round off 0.1',
        calculate: ({ ddp }) => excelCeiling(ddp / 1, 0.1)
    },
    {
        id: 'MANUAL',
        label: 'Manual Input',
        calculate: () => 0,
    }
];

// --- 3. REX RSP Strategies ---

export const RSP_STRATEGIES: PricingStrategy<RSPContext>[] = [
    {
        id: 'RSP_FORMULA_A',
        label: 'Same as SP',
        calculate: ({ sp }) => sp
    },
    {
        id: 'MANUAL',
        label: 'Manual Input',
        calculate: () => 0,
    }
];
