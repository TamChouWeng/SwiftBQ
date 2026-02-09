
import React, { useState, useEffect, useRef } from 'react';

interface Props {
    value: number | undefined | null;
    onChange: (value: number) => void;
    className?: string;
    placeholder?: string;
    disabled?: boolean;
    min?: number;
    max?: number;
    tabIndex?: number;
    autoFocus?: boolean;
    readOnly?: boolean; // Add readOnly support
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
}

const FormattedNumberInput: React.FC<Props> = ({
    value,
    onChange,
    className = '',
    placeholder = '',
    disabled = false,
    min,
    max,
    tabIndex,
    autoFocus,
    readOnly = false,
    minimumFractionDigits = 0,
    maximumFractionDigits = 2
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Format value for display (with commas)
    const formatValue = (val: number | undefined | null) => {
        if (val === undefined || val === null || isNaN(val)) return '';
        return val.toLocaleString('en-US', {
            minimumFractionDigits: minimumFractionDigits,
            maximumFractionDigits: maximumFractionDigits
        });
    };

    // Synchronize internal state with prop value when not focused
    useEffect(() => {
        if (!isFocused) {
            setInputValue(formatValue(value));
        }
    }, [value, isFocused, minimumFractionDigits, maximumFractionDigits]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        // On focus, show raw number for editing
        // If value is 0, we might want to show empty string or "0" depending on preference.
        // Usually showing "0" is better, or empty if it's strictly placeholder.
        // Let's show raw string.
        setInputValue(value !== undefined && value !== null ? value.toString() : '');
        e.target.select();
    };

    const handleBlur = () => {
        setIsFocused(false);
        // Re-format handled by useEffect

        // Ensure final consistency if value didn't change but input did (e.g. user typed "1000" and blurred)
        // The onChange would have fired, updating `value` prop, so useEffect will handle re-formatting.
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Allow typing only valid characters for number
        // Allow digits, one dot, maybe minus sign
        const raw = e.target.value;
        setInputValue(raw); // Update UI immediately so user can type "1." without it vanishing

        // Parse and Bubble up
        // Handle empty string as 0 or null? Usually 0 for numeric fields in this app.
        if (raw === '') {
            onChange(0);
            return;
        }

        const parsed = parseFloat(raw);
        if (!isNaN(parsed)) {
            // Simple boundary check if needed, though usually better on blur or just clamped by logic elsewhere
            onChange(parsed);
        }
    };

    return (
        <input
            ref={inputRef}
            type={isFocused ? "number" : "text"} // Switch type to prevent mobile keyboard weirdness with commas
            value={inputValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            readOnly={readOnly}
            className={className}
            placeholder={placeholder}
            tabIndex={tabIndex}
            autoFocus={autoFocus}
            step="any"
        />
    );
};

export default FormattedNumberInput;
