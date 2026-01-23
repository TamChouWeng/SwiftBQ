import { excelCeiling } from '../utils/mathUtils';

/**
 * Pricing context containing everything a strategy may need.
 */
export interface PricingContext {
  fob: number;
  forex: number;
  sst: number;
  opta: number;
  ddp?: number;
  sp?: number;
}

/**
 * DDP_STRATEGIES (keys prefixed with DDP_) — exact logic provided.
 */
export const DDP_STRATEGIES = {
  DDP_FORMULA_A: {
    key: 'DDP_FORMULA_A',
    label: 'DDP Formula A',
    calculate: (ctx: PricingContext) => excelCeiling((ctx.fob * ctx.forex * ctx.sst) / ctx.opta, 0.01)
  },
  DDP_FORMULA_B: {
    key: 'DDP_FORMULA_B',
    label: 'DDP Formula B (A + 30)',
    calculate: (ctx: PricingContext) => {
      const a = DDP_STRATEGIES.DDP_FORMULA_A.calculate(ctx);
      return a + 30;
    }
  },
  DDP_FORMULA_C: {
    key: 'DDP_FORMULA_C',
    label: 'DDP Formula C',
    calculate: (ctx: PricingContext) => excelCeiling((ctx.fob * ctx.forex * ctx.sst) / ctx.opta, 1)
  },
  DDP_FORMULA_D: {
    key: 'DDP_FORMULA_D',
    label: 'DDP Formula D (C + 4000)',
    calculate: (ctx: PricingContext) => {
      const c = DDP_STRATEGIES.DDP_FORMULA_C.calculate(ctx);
      return c + 4000;
    }
  },
  MANUAL: {
    key: 'MANUAL',
    label: 'Manual Override',
    calculate: (_ctx: PricingContext) => 0
  }
};

/**
 * SP_STRATEGIES (keys prefixed with SP_) — depends on DDP
 */
export const SP_STRATEGIES = {
  SP_FORMULA_A: { key: 'SP_FORMULA_A', label: 'SP Formula A', calculate: (ctx: PricingContext) => excelCeiling((ctx.ddp ?? 0) / 0.5, 0.1) },
  SP_FORMULA_B: { key: 'SP_FORMULA_B', label: 'SP Formula B', calculate: (ctx: PricingContext) => excelCeiling((ctx.ddp ?? 0) / 0.7, 0.1) },
  SP_FORMULA_C: { key: 'SP_FORMULA_C', label: 'SP Formula C', calculate: (ctx: PricingContext) => excelCeiling((ctx.ddp ?? 0) / 0.7, 1) },
  SP_FORMULA_D: { key: 'SP_FORMULA_D', label: 'SP Formula D', calculate: (ctx: PricingContext) => excelCeiling((ctx.ddp ?? 0) / 0.75, 1) },
  SP_FORMULA_E: { key: 'SP_FORMULA_E', label: 'SP Formula E', calculate: (ctx: PricingContext) => excelCeiling((ctx.ddp ?? 0) / 0.8, 0.1) },
  SP_FORMULA_F: { key: 'SP_FORMULA_F', label: 'SP Formula F', calculate: (ctx: PricingContext) => excelCeiling((ctx.ddp ?? 0) / 0.8, 1) },
  SP_FORMULA_G: { key: 'SP_FORMULA_G', label: 'SP Formula G', calculate: (ctx: PricingContext) => excelCeiling((ctx.ddp ?? 0) / 0.85, 0.1) },
  SP_FORMULA_H: { key: 'SP_FORMULA_H', label: 'SP Formula H', calculate: (ctx: PricingContext) => excelCeiling((ctx.ddp ?? 0) / 0.85, 1) },
  SP_FORMULA_I: { key: 'SP_FORMULA_I', label: 'SP Formula I', calculate: (ctx: PricingContext) => excelCeiling((ctx.ddp ?? 0) / 0.9, 0.1) },
  SP_FORMULA_J: { key: 'SP_FORMULA_J', label: 'SP Formula J', calculate: (ctx: PricingContext) => excelCeiling((ctx.ddp ?? 0) / 0.95, 0.1) },
  SP_FORMULA_K: { key: 'SP_FORMULA_K', label: 'SP Formula K', calculate: (ctx: PricingContext) => excelCeiling((ctx.ddp ?? 0) / 1, 0.1) },
  MANUAL: { key: 'MANUAL', label: 'Manual Override', calculate: (_ctx: PricingContext) => 0 }
};

/**
 * RSP_STRATEGIES (keys prefixed with RSP_)
 * RSP_FORMULA_A: Returns SP value (direct copy)
 */
export const RSP_STRATEGIES = {
  RSP_FORMULA_A: { key: 'RSP_FORMULA_A', label: 'RSP Formula A (copy SP)', calculate: (ctx: PricingContext) => (ctx.sp ?? 0) },
  MANUAL: { key: 'MANUAL', label: 'Manual Override', calculate: (_ctx: PricingContext) => 0 }
};
