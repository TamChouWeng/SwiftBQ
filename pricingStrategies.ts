
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
        label: 'Formula A (Standard)',
        calculate: ({ fob, forex, sst, opta }) => {
            // Formula A = CEILING((REX SC (FOB)*Forex*SST )/OPTA, 0.01)
            if (opta === 0) return 0;
            return excelCeiling((fob * forex * sst) / opta, 0.01);
        }
    },
    {
        id: 'DDP_FORMULA_B',
        label: 'Formula B (+30)',
        calculate: ({ fob, forex, sst, opta }) => {
            // Formula B = Formula A + 30
            // Redefining inline for purity: CEILING((REX SC (FOB)*Forex*SST )/OPTA, 0.01) + 30
            if (opta === 0) return 0;
            const base = excelCeiling((fob * forex * sst) / opta, 0.01);
            return base + 30;
        }
    },
    {
        id: 'DDP_FORMULA_C',
        label: 'Formula C (Round 1)',
        calculate: ({ fob, forex, sst, opta }) => {
            // Formula C = CEILING((REX SC (FOB)*Forex*SST )/OPTA, 1)
            if (opta === 0) return 0;
            return excelCeiling((fob * forex * sst) / opta, 1);
        }
    },
    {
        id: 'DDP_FORMULA_D',
        label: 'Formula D (Round 1 + 4000)',
        calculate: ({ fob, forex, sst, opta }) => {
            // Formula D = Formula C + 4000
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
        label: 'Formula A (/0.5, 0.1)',
        calculate: ({ ddp }) => excelCeiling(ddp / 0.5, 0.1)
    },
    {
        id: 'SP_FORMULA_B',
        label: 'Formula B (/0.7, 0.1)',
        calculate: ({ ddp }) => excelCeiling(ddp / 0.7, 0.1)
    },
    {
        id: 'SP_FORMULA_C',
        label: 'Formula C (/0.7, 1)',
        calculate: ({ ddp }) => excelCeiling(ddp / 0.7, 1)
    },
    {
        id: 'SP_FORMULA_D',
        label: 'Formula D (/0.75, 1)',
        calculate: ({ ddp }) => excelCeiling(ddp / 0.75, 1)
    },
    {
        id: 'SP_FORMULA_E',
        label: 'Formula E (/0.8, 0.1)',
        calculate: ({ ddp }) => excelCeiling(ddp / 0.8, 0.1)
    },
    {
        id: 'SP_FORMULA_F',
        label: 'Formula F (/0.8, 1)',
        calculate: ({ ddp }) => excelCeiling(ddp / 0.8, 1)
    },
    {
        id: 'SP_FORMULA_G',
        label: 'Formula G (/0.85, 0.1)',
        calculate: ({ ddp }) => excelCeiling(ddp / 0.85, 0.1)
    },
    {
        id: 'SP_FORMULA_H',
        label: 'Formula H (/0.85, 1)',
        calculate: ({ ddp }) => excelCeiling(ddp / 0.85, 1)
    },
    {
        id: 'SP_FORMULA_I',
        label: 'Formula I (/0.9, 0.1)',
        calculate: ({ ddp }) => excelCeiling(ddp / 0.9, 0.1)
    },
    {
        id: 'SP_FORMULA_J',
        label: 'Formula J (/0.95, 0.1)',
        calculate: ({ ddp }) => excelCeiling(ddp / 0.95, 0.1)
    },
    {
        id: 'SP_FORMULA_K',
        label: 'Formula K (/1, 0.1)',
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
