import React, { useEffect, useMemo, useState } from 'react';
import { MasterItem, PriceField } from '../types';
import { DDP_STRATEGIES, SP_STRATEGIES, RSP_STRATEGIES, PricingContext } from '../pricing/pricingLogic';

type FieldKey = 'rexScDdp' | 'rexSp' | 'rexRsp';

interface Props {
  row: MasterItem;
  fieldKey: FieldKey;
  value: PriceField;
  onChange: (id: string, updates: Partial<MasterItem>) => void;
}

const STRATEGY_MAP: Record<FieldKey, any> = {
  rexScDdp: DDP_STRATEGIES,
  rexSp: SP_STRATEGIES,
  rexRsp: RSP_STRATEGIES
};

export const SmartPriceCell: React.FC<Props> = ({ row, fieldKey, value, onChange }) => {
  const [strategy, setStrategy] = useState<string>(value?.strategy ?? 'MANUAL');
  const [manualOverride, setManualOverride] = useState<number | undefined>(value?.manualOverride);
  const strategies = STRATEGY_MAP[fieldKey];

  const ctx: PricingContext = useMemo(() => {
    const fob = row.rexScFob ?? 0;
    const forex = row.forex ?? 1;
    const sst = row.sst ?? 1;
    const opta = row.opta ?? 1;
    const ddp = row.rexScDdp ? (row.rexScDdp.manualOverride ?? row.rexScDdp.value) : undefined;
    const sp = row.rexSp ? (row.rexSp.manualOverride ?? row.rexSp.value) : undefined;
    return { fob, forex, sst, opta, ddp, sp };
  }, [row]);

  const computedValue = useMemo(() => {
    if (!strategies || !strategies[strategy]) return 0;
    if (strategy === 'MANUAL') {
      return manualOverride ?? value?.manualOverride ?? value?.value ?? 0;
    }
    try {
      return strategies[strategy].calculate(ctx);
    } catch (e) {
      console.error('pricing calc error', e);
      return 0;
    }
  }, [strategies, strategy, ctx, manualOverride, value]);

  useEffect(() => {
    setManualOverride(value?.manualOverride);
    setStrategy(value?.strategy ?? 'MANUAL');
  }, [value]);

  const applyChange = (nextStrategy: string, nextManual?: number) => {
    const nextValue: PriceField = {
      strategy: nextStrategy,
      value: nextStrategy === 'MANUAL' ? (nextManual ?? (value?.manualOverride ?? value?.value ?? 0)) : computedValue,
      manualOverride: nextStrategy === 'MANUAL' ? nextManual : undefined
    };
    onChange(row.id, { [fieldKey]: nextValue } as Partial<MasterItem>);
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={strategy}
        onChange={(e) => {
          const next = e.target.value;
          setStrategy(next);
          applyChange(next, manualOverride);
        }}
        className="text-sm bg-transparent border border-transparent hover:border-gray-200 rounded px-2 py-1 dark:text-white"
      >
        {Object.keys(strategies).map((k) => (
          <option key={k} value={k}>
            {strategies[k].label || k}
          </option>
        ))}
      </select>

      {strategy === 'MANUAL' ? (
        <input
          type="number"
          value={manualOverride ?? value?.manualOverride ?? value?.value ?? 0}
          onChange={(e) => {
            const v = Number(e.target.value || 0);
            setManualOverride(v);
            applyChange('MANUAL', v);
          }}
          className="w-24 text-right px-2 py-1 rounded border border-gray-200 dark:bg-slate-900 dark:text-white"
        />
      ) : (
        <div className="w-24 text-right px-2 py-1 text-sm">{computedValue}</div>
      )}
    </div>
  );
};

export default SmartPriceCell;
