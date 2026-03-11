import { useEffect, useCallback } from 'react';

interface ShortcutHandlers {
    onNewChat?: () => void;
    onStopGeneration?: () => void;
    onFocusInput?: () => void;
    onToggleSidebar?: () => void;
    onToggleShortcutsHelp?: () => void;
    onSearchInChat?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const isCtrl = e.ctrlKey || e.metaKey;
        const isShift = e.shiftKey;
        const tag = (e.target as HTMLElement)?.tagName;
        const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;

        // Ctrl+Shift+N — New chat
        if (isCtrl && isShift && e.key === 'N') {
            e.preventDefault();
            handlers.onNewChat?.();
            return;
        }

        // Escape — Stop generation
        if (e.key === 'Escape') {
            e.preventDefault();
            handlers.onStopGeneration?.();
            return;
        }

        // Ctrl+/ — Focus input
        if (isCtrl && e.key === '/') {
            e.preventDefault();
            handlers.onFocusInput?.();
            return;
        }

        // Ctrl+Shift+S — Toggle sidebar
        if (isCtrl && isShift && e.key === 'S') {
            e.preventDefault();
            handlers.onToggleSidebar?.();
            return;
        }

        // Ctrl+F — Search in chat
        if (isCtrl && e.key === 'f') {
            e.preventDefault();
            handlers.onSearchInChat?.();
            return;
        }

        // ? — Show shortcuts help (only when not in input)
        if (e.key === '?' && !isInput && !isCtrl) {
            e.preventDefault();
            handlers.onToggleShortcutsHelp?.();
            return;
        }
    }, [handlers]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}

export const SHORTCUTS = [
    { keys: ['Ctrl', 'Shift', 'N'], description: 'New chat' },
    { keys: ['Esc'], description: 'Stop generation' },
    { keys: ['Ctrl', '/'], description: 'Focus input' },
    { keys: ['Ctrl', 'F'], description: 'Search in chat' },
    { keys: ['Ctrl', 'Shift', 'S'], description: 'Toggle sidebar' },
    { keys: ['?'], description: 'Show shortcuts' },
    { keys: ['Enter'], description: 'Send message' },
    { keys: ['Shift', 'Enter'], description: 'New line' },
];
