import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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

// Google Input Tools transliteration codes
const ITC_CODES: Record<string, string> = {
    hi: 'hi-t-i0-und',
    mr: 'mr-t-i0-und',
};

// Simple in-memory cache to avoid redundant API calls
const suggestionCache: Record<string, string[]> = {};

async function fetchSuggestions(
    word: string,
    lang: string,
    signal?: AbortSignal,
): Promise<string[]> {
    const itc = ITC_CODES[lang];
    if (!itc || !word.trim()) return [];

    const cacheKey = `${lang}:${word.toLowerCase()}`;
    if (suggestionCache[cacheKey]) return suggestionCache[cacheKey];

    try {
        const url = `https://inputtools.google.com/request?text=${encodeURIComponent(word)}&itc=${itc}&num=5&cp=0&cs=0&ie=utf-8&oe=utf-8&app=demopage`;
        const res = await fetch(url, { signal });
        const data = await res.json();

        // Response: ["SUCCESS",[["word",["सुझाव1","सुझाव2",...], ...]]]
        if (data[0] === 'SUCCESS' && data[1]?.[0]?.[1]) {
            const results: string[] = data[1][0][1];
            suggestionCache[cacheKey] = results;
            return results;
        }
    } catch (err: any) {
        if (err?.name !== 'AbortError') {
            console.error('Transliteration fetch failed:', err);
        }
    }
    return [];
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
}) => {
    const { i18n } = useTranslation();
    const lang = i18n.language;
    const isIndic = lang === 'hi' || lang === 'mr';

    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [matchStart, setMatchStart] = useState(-1);
    const [matchEnd, setMatchEnd] = useState(-1);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

    const abortRef = useRef<AbortController | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    // Refs for values needed inside event handlers (avoids stale closures)
    const suggestionsRef = useRef(suggestions);
    const selectedIdxRef = useRef(selectedIdx);
    const matchStartRef = useRef(matchStart);
    const matchEndRef = useRef(matchEnd);
    const valueRef = useRef(value);
    suggestionsRef.current = suggestions;
    selectedIdxRef.current = selectedIdx;
    matchStartRef.current = matchStart;
    matchEndRef.current = matchEnd;
    valueRef.current = value;

    const closeSuggestions = useCallback(() => {
        setSuggestions([]);
        setSelectedIdx(0);
    }, []);

    const acceptSuggestion = useCallback(
        (index: number) => {
            const sug = suggestionsRef.current;
            if (sug.length === 0) return;

            const picked = sug[index] ?? sug[0];
            const before = valueRef.current.slice(0, matchStartRef.current);
            const after = valueRef.current.slice(matchEndRef.current);
            const newValue = before + picked + ' ' + after;

            onChangeText(newValue);
            closeSuggestions();

            // Restore cursor after the inserted word
            requestAnimationFrame(() => {
                const el = inputRef.current;
                if (el) {
                    const pos = matchStartRef.current + picked.length + 1;
                    el.setSelectionRange(pos, pos);
                    el.focus();
                }
            });
        },
        [onChangeText, closeSuggestions],
    );

    // Fetch suggestions when the user types
    const requestSuggestions = useCallback(
        (word: string) => {
            clearTimeout(debounceRef.current);
            abortRef.current?.abort();

            if (!word) {
                closeSuggestions();
                return;
            }

            debounceRef.current = setTimeout(async () => {
                const controller = new AbortController();
                abortRef.current = controller;

                const results = await fetchSuggestions(word, lang, controller.signal);
                if (controller.signal.aborted) return;

                if (results.length > 0) {
                    // Append the original romanized word as the last option
                    const withOriginal = results.includes(word)
                        ? results
                        : [...results, word];
                    setSuggestions(withOriginal);
                    setSelectedIdx(0);
                } else {
                    closeSuggestions();
                }
            }, 80);
        },
        [lang, closeSuggestions],
    );

    // Clean up on unmount
    useEffect(() => {
        return () => {
            clearTimeout(debounceRef.current);
            abortRef.current?.abort();
        };
    }, []);

    // Close suggestions on outside click
    useEffect(() => {
        if (suggestions.length === 0) return;

        const handleMouseDown = (e: MouseEvent) => {
            // Don't close if clicking on the suggestion list itself
            if ((e.target as HTMLElement)?.closest?.('[data-transliterate-suggestions]')) return;
            if (inputRef.current?.contains(e.target as Node)) return;
            // Accept current selection on blur
            if (suggestionsRef.current.length > 0) {
                acceptSuggestion(selectedIdxRef.current);
            }
        };
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [suggestions.length, acceptSuggestion]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        const newValue = e.target.value;
        onChangeText(newValue);

        if (!isIndic) return;

        // Find the word currently being typed (from cursor backwards to last space/newline)
        const caret = e.target.selectionEnd ?? newValue.length;
        const beforeCaret = newValue.slice(0, caret);
        const lastBreak = Math.max(
            beforeCaret.lastIndexOf(' '),
            beforeCaret.lastIndexOf('\n'),
        );
        const currentWord = beforeCaret.slice(lastBreak + 1);

        setMatchStart(lastBreak + 1);
        setMatchEnd(caret);

        // Position the dropdown below the input
        if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + 2,
                left: rect.left,
                width: rect.width,
            });
        }

        requestSuggestions(currentWord);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (isIndic && suggestions.length > 0) {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIdx((i) => (i + 1) % suggestions.length);
                    return;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIdx(
                        (i) => (i - 1 + suggestions.length) % suggestions.length,
                    );
                    return;
                case 'ArrowRight':
                    e.preventDefault();
                    setSelectedIdx((i) => (i + 1) % suggestions.length);
                    return;
                case 'ArrowLeft':
                    e.preventDefault();
                    setSelectedIdx(
                        (i) => (i - 1 + suggestions.length) % suggestions.length,
                    );
                    return;
                case ' ':
                case 'Enter':
                case 'Tab':
                    e.preventDefault();
                    acceptSuggestion(selectedIdx);
                    return;
                case 'Escape':
                    e.preventDefault();
                    closeSuggestions();
                    return;
            }
        }

        // Pass through to parent handler
        onKeyDown?.(e);
    };

    // ---- Render plain input for English ----
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

    // ---- Render transliteration-enabled input for Hindi / Marathi ----
    const inputProps = {
        ref: inputRef as any,
        value,
        onChange: handleChange,
        onKeyDown: handleKeyDown,
        placeholder,
        className,
        disabled,
    };

    return (
        <>
            {type === 'textarea' ? (
                <textarea {...inputProps} rows={rows} />
            ) : (
                <input {...inputProps} type="text" />
            )}

            {suggestions.length > 0 &&
                createPortal(
                    <ul
                        data-transliterate-suggestions=""
                        style={{
                            position: 'fixed',
                            top: dropdownPos.top,
                            left: dropdownPos.left,
                            zIndex: 99999,
                            backgroundColor: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                            listStyle: 'none',
                            padding: '4px',
                            margin: 0,
                            fontSize: '15px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '2px',
                            maxWidth: Math.max(dropdownPos.width, 280),
                        }}
                    >
                        {suggestions.map((s, i) => (
                            <li
                                key={s + i}
                                onMouseDown={(e) => {
                                    e.preventDefault(); // keep input focused
                                    acceptSuggestion(i);
                                }}
                                onMouseEnter={() => setSelectedIdx(i)}
                                style={{
                                    cursor: 'pointer',
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    textAlign: 'center',
                                    backgroundColor:
                                        i === selectedIdx ? '#3b82f6' : '#f8fafc',
                                    color: i === selectedIdx ? '#fff' : '#1e293b',
                                    fontWeight: 500,
                                    transition: 'background-color 0.1s',
                                    userSelect: 'none',
                                }}
                            >
                                {s}
                            </li>
                        ))}
                    </ul>,
                    document.body,
                )}
        </>
    );
};

export default TransliterateInput;
