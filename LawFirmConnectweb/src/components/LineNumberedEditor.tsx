import React, { useRef, useEffect, useCallback } from 'react';
import TransliterateInput from './TransliterateInput';

interface LineNumberedEditorProps {
    value: string;
    onChangeText: (text: string) => void;
    className?: string;
    placeholder?: string;
}

const LineNumberedEditor: React.FC<LineNumberedEditorProps> = ({
    value,
    onChangeText,
    className,
    placeholder,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const gutterRef = useRef<HTMLDivElement>(null);

    const lineCount = value.split('\n').length;

    const syncScroll = useCallback(() => {
        const textarea = containerRef.current?.querySelector('textarea');
        if (textarea && gutterRef.current) {
            gutterRef.current.scrollTop = textarea.scrollTop;
        }
    }, []);

    useEffect(() => {
        const textarea = containerRef.current?.querySelector('textarea');
        if (!textarea) return;

        textarea.addEventListener('scroll', syncScroll);
        return () => textarea.removeEventListener('scroll', syncScroll);
    }, [syncScroll]);

    return (
        <div ref={containerRef} className="flex flex-1 min-h-0 overflow-hidden">
            {/* Line number gutter */}
            <div
                ref={gutterRef}
                className="bg-slate-50 border-r border-slate-200 select-none overflow-hidden shrink-0"
                style={{ width: '3rem' }}
            >
                <div className="pt-6 pr-2 font-serif text-base leading-relaxed">
                    {Array.from({ length: lineCount }, (_, i) => (
                        <div
                            key={i}
                            className="text-right text-xs text-slate-400"
                            style={{ lineHeight: 'inherit' }}
                        >
                            {i + 1}
                        </div>
                    ))}
                </div>
            </div>

            {/* Textarea */}
            <TransliterateInput
                value={value}
                onChangeText={onChangeText}
                className={className}
                placeholder={placeholder}
                type="textarea"
            />
        </div>
    );
};

export default LineNumberedEditor;
