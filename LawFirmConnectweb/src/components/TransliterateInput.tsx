import React from 'react';
import { IndicTransliterate } from '@ai4bharat/indic-transliterate';
import { useTranslation } from 'react-i18next';

interface TransliterateInputProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    type?: 'input' | 'textarea';
    rows?: number;
    containerClassName?: string;
}

const TransliterateInput: React.FC<TransliterateInputProps> = ({
    value,
    onChangeText,
    placeholder,
    className,
    disabled,
    onKeyDown,
    type = 'input',
    rows,
    containerClassName,
}) => {
    const { i18n } = useTranslation();
    const lang = i18n.language;
    const isIndic = lang === 'hi' || lang === 'mr';

    if (!isIndic) {
        if (type === 'textarea') {
            return (
                <textarea
                    value={value}
                    onChange={(e) => onChangeText(e.target.value)}
                    placeholder={placeholder}
                    className={className}
                    disabled={disabled}
                    onKeyDown={onKeyDown}
                    rows={rows}
                />
            );
        }
        return (
            <input
                type="text"
                value={value}
                onChange={(e) => onChangeText(e.target.value)}
                placeholder={placeholder}
                className={className}
                disabled={disabled}
                onKeyDown={onKeyDown}
            />
        );
    }

    return (
        <IndicTransliterate
            value={value}
            onChangeText={onChangeText}
            lang={lang}
            placeholder={placeholder}
            className={className}
            disabled={disabled}
            onKeyDown={onKeyDown}
            containerClassName={containerClassName}
            renderComponent={(props: any) =>
                type === 'textarea' ? (
                    <textarea {...props} rows={rows} />
                ) : (
                    <input type="text" {...props} />
                )
            }
        />
    );
};

export default TransliterateInput;
