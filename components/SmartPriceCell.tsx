
import React, { useState, useRef, useEffect } from 'react';
import { Calculator, Edit3, ChevronDown, Check } from 'lucide-react';
import { PriceField } from '../types';
import { PricingStrategy } from '../pricingStrategies';

interface SmartPriceCellProps {
    field: PriceField;
    strategies: PricingStrategy<any>[];
    onChange: (updates: Partial<PriceField>) => void;
    className?: string;
    disabled?: boolean;
}

const SmartPriceCell: React.FC<SmartPriceCellProps> = ({ field, strategies, onChange, className, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isManual = field.strategy === 'MANUAL';

    // Find current strategy label
    const currentStrategy = strategies.find(s => s.id === field.strategy);
    const strategyLabel = currentStrategy ? currentStrategy.label : 'Manual';

    const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        // If we are in manual mode, update the manualOverride and the value
        if (isManual) {
            onChange({
                value: isNaN(val) ? 0 : val,
                manualOverride: isNaN(val) ? 0 : val
            });
        }
    };

    const handleStrategySelect = (strategyId: string) => {
        // When switching strategies, we just update the strategy ID. 
        // The value recalculation is handled by the store.
        // Exception: If switching TO manual, populate override with current value?
        // Store logic: "if (ddpField.strategy === 'MANUAL') ddpValue = ddpField.manualOverride ?? 0;"
        // So if we switch to manual, we should probably ensure manualOverride is synced if we want to "freeze" current value.
        // For now, let's assume manualOverride holds the last manual entry.

        onChange({ strategy: strategyId });
        setIsOpen(false);
    };

    return (
        <div className={`relative flex items-center group ${className}`} ref={popoverRef}>

            {/* Input / Display */}
            <div className="relative flex-1">
                <input
                    type="number"
                    value={field.value}
                    onChange={handleValueChange}
                    readOnly={!isManual || disabled}
                    className={`w-full bg-transparent p-2 pr-2 rounded border 
            ${!isManual ? 'text-slate-600 dark:text-slate-400 bg-gray-50/50 dark:bg-slate-800/50 cursor-not-allowed' : 'text-slate-800 dark:text-slate-200'}
            border-transparent hover:border-gray-200 dark:hover:border-slate-600 
            focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-right text-sm`}
                />
            </div>

            {/* Strategy Toggler (Visible on Hover or if Open) */}
            <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`ml-1 p-1 rounded-md text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all opacity-0 group-hover:opacity-100 ${isOpen ? 'opacity-100 bg-gray-100 dark:bg-slate-700' : ''}`}
                title={`Current Strategy: ${strategyLabel}`}
                disabled={disabled}
            >
                <ChevronDown size={14} />
            </button>

            {/* Strategy Popover */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-600 z-50 overflow-hidden flex flex-col animate-fade-in">
                    <div className="p-2 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Select Pricing Strategy
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1 space-y-0.5">
                        {strategies.map((strategy) => (
                            <button
                                key={strategy.id}
                                onClick={() => handleStrategySelect(strategy.id)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between group transition-colors
                  ${field.strategy === strategy.id
                                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400 font-medium'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                            >
                                <span>{strategy.label}</span>
                                {field.strategy === strategy.id && <Check size={14} />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartPriceCell;
