import React, { useRef, useEffect, useCallback, useState } from 'react';
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
    const mirrorRef = useRef<HTMLDivElement>(null);
    const [lineHeights, setLineHeights] = useState<number[]>([]);

    const lines = value.split('\n');

    // Measure line heights from the hidden mirror div
    const measureLines = useCallback(() => {
        const mirror = mirrorRef.current;
        if (!mirror) return;

        const textarea = containerRef.current?.querySelector('textarea');
        if (!textarea) return;

        // Copy textarea's computed styles to the mirror so wrapping matches exactly
        const computed = getComputedStyle(textarea);
        const stylesToCopy = [
            'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
            'letterSpacing', 'wordSpacing', 'lineHeight',
            'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom',
            'borderLeftWidth', 'borderRightWidth', 'borderTopWidth', 'borderBottomWidth',
            'boxSizing', 'textIndent', 'wordWrap', 'overflowWrap', 'whiteSpace',
        ] as const;

        for (const prop of stylesToCopy) {
            (mirror.style as any)[prop] = computed[prop];
        }
        mirror.style.width = `${textarea.clientWidth}px`;

        // Read each line div's height
        const children = mirror.children;
        const heights: number[] = [];
        for (let i = 0; i < children.length; i++) {
            heights.push((children[i] as HTMLElement).offsetHeight);
        }
        setLineHeights(heights);
    }, []);

    // Re-measure when value changes
    useEffect(() => {
        // Use requestAnimationFrame to ensure the mirror has rendered with new content
        const raf = requestAnimationFrame(measureLines);
        return () => cancelAnimationFrame(raf);
    }, [value, measureLines]);

    // Re-measure on window resize (textarea width changes affect wrapping)
    useEffect(() => {
        const onResize = () => measureLines();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [measureLines]);

    // Also observe the textarea's size via ResizeObserver
    useEffect(() => {
        const textarea = containerRef.current?.querySelector('textarea');
        if (!textarea) return;

        const ro = new ResizeObserver(() => measureLines());
        ro.observe(textarea);
        return () => ro.disconnect();
    }, [measureLines]);

    // Scroll sync
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
        <div ref={containerRef} className="flex flex-1 min-h-0 overflow-hidden relative">
            {/* Hidden mirror div — replicates textarea styling to measure wrapped line heights */}
            <div
                ref={mirrorRef}
                aria-hidden
                style={{
                    position: 'absolute',
                    top: -9999,
                    left: -9999,
                    visibility: 'hidden',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                }}
            >
                {lines.map((line, i) => (
                    <div key={i}>{line || '\u00a0'}</div>
                ))}
            </div>

            {/* Line number gutter */}
            <div
                ref={gutterRef}
                className="bg-slate-50 border-r border-slate-200 select-none overflow-hidden shrink-0"
                style={{ width: '3rem' }}
            >
                <div className="pt-6 pr-2 font-serif text-base leading-relaxed">
                    {lines.map((_, i) => (
                        <div
                            key={i}
                            className="text-right text-slate-400"
                            style={{
                                height: lineHeights[i] ?? undefined,
                                lineHeight: 'inherit',
                                fontSize: 'inherit',
                                boxSizing: 'border-box',
                            }}
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
