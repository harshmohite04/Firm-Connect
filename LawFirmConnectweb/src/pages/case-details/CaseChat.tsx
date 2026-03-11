import React, { useEffect, useRef, useState, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router-dom';
import ragService from '../../services/ragService';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';

import TransliterateInput from '../../components/TransliterateInput';
import MessageActions from '../../components/chat/MessageActions';
import { useKeyboardShortcuts, SHORTCUTS } from '../../hooks/useKeyboardShortcuts';
import { useTheme } from '../../contexts/ThemeContext';
import { exportAsMarkdown, exportAsPdf } from '../../utils/chatExport';
import CustomInstructionsModal from '../../components/chat/CustomInstructionsModal';

const MermaidBlock = lazy(() => import('../../components/chat/MermaidBlock'));

// Icons
const LockIcon = () => (
    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);
const PaperClipIcon = () => (
    <svg className="w-5 h-5 text-slate-400 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
);

interface CaseData {
    _id: string;
    title: string;
    status: string;
    createdAt: string;
    description: string;
}

interface ContextItem {
    content: string;
    source?: string;
    metadata?: any;
    score?: number;
}

interface TokenUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

interface Message {
    id: number;
    sender: string;
    avatar?: string;
    content: string;
    time: string;
    isUser: boolean;
    contexts?: ContextItem[];
    error?: boolean;
    isPartial?: boolean;
    feedback?: 'up' | 'down' | null;
    usage?: TokenUsage | null;
}

interface Session {
    session_id: string;
    title: string;
    created_at: string;
    pinned?: boolean;
}

interface AvailableModel {
    id: string;
    name: string;
    provider: string;
}

interface DocPage {
    text: string;
    page_number?: number;
    file_type?: string;
}

const CaseChat: React.FC = () => {
    // @ts-ignore
    // @ts-ignore
    const { caseData } = useOutletContext<{ caseData: CaseData }>();
    const { t } = useTranslation();
    const { isDark } = useTheme();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    // Edit message state
    const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
    const [editingContent, setEditingContent] = useState('');

    // Shortcuts overlay
    const [showShortcuts, setShowShortcuts] = useState(false);

    // Drag-drop state
    const [isDragOver, setIsDragOver] = useState(false);

    // Chat input ref for focus shortcut
    const chatInputRef = useRef<HTMLTextAreaElement | null>(null);

    // Session State
    const [sessions, setSessions] = useState<Session[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    // Search state (#10)
    const [sidebarSearch, setSidebarSearch] = useState('');
    const [chatSearchOpen, setChatSearchOpen] = useState(false);
    const [chatSearchQuery, setChatSearchQuery] = useState('');
    const [chatSearchMatches, setChatSearchMatches] = useState<number[]>([]);
    const [activeMatchIdx, setActiveMatchIdx] = useState(0);
    const chatSearchInputRef = useRef<HTMLInputElement>(null);

    // Voice input state (#19)
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    // Model picker (#22)
    const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>('');
    const [showModelPicker, setShowModelPicker] = useState(false);

    // Custom instructions (#26)
    const [showCustomInstructions, setShowCustomInstructions] = useState(false);

    // Export dropdown
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Mobile drawer state (#21)
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const creatingSessionRef = useRef(false); // Guard against double session creation

    // Streaming abort controller
    const streamControllerRef = useRef<AbortController | null>(null);

    // File upload state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingFiles, setUploadingFiles] = useState<{name: string, status: 'uploading' | 'processing' | 'ready' | 'failed'}[]>([]);

    // Inline rename state
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');

    // Selection & Sources State
    const [selectionCoords, setSelectionCoords] = useState<{ x: number; y: number } | null>(null);
    const [selectedContexts, setSelectedContexts] = useState<ContextItem[] | null>(null);
    const [selectedText, setSelectedText] = useState<string>('');

    // Right sidebar document viewer
    const [sourcesPanelOpen, setSourcesPanelOpen] = useState(false);
    const [activeSourceTab, setActiveSourceTab] = useState<string>('');
    const [documentText, setDocumentText] = useState<DocPage[]>([]);
    const [docLoading, setDocLoading] = useState(false);
    const [highlightChunks, setHighlightChunks] = useState<string[]>([]);
    const [selectionHighlight, setSelectionHighlight] = useState<string>(''); // user's mouse selection
    const [activeHighlightIdx, setActiveHighlightIdx] = useState(0);
    const [sourceViewMode, setSourceViewMode] = useState<'text' | 'original'>('text');
    const highlightRefs = useRef<(HTMLElement | null)[]>([]);
    const selectionRef = useRef<HTMLElement | null>(null); // ref for blue selection highlight
    const docViewerRef = useRef<HTMLDivElement>(null);



    // Jaccard similarity
    const computeJaccard = (textA: string, textB: string): number => {
        const tokenize = (t: string) => new Set(t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(Boolean));
        const setA = tokenize(textA);
        const setB = tokenize(textB);
        if (setA.size === 0 || setB.size === 0) return 0;
        let intersection = 0;
        setA.forEach(w => { if (setB.has(w)) intersection++; });
        return intersection / (setA.size + setB.size - intersection);
    };

    // Helper: find the next "Chat N" number from a list of sessions
    const getNextChatNumber = (existingSessions: Session[]): number => {
        let maxNum = 0;
        existingSessions.forEach(s => {
            const match = s.title.match(/^Chat\s+(\d+)$/i);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
            }
        });
        return maxNum + 1;
    };

    // Load available models on mount
    useEffect(() => {
        ragService.getModels().then(models => {
            if (models && models.length > 0) setAvailableModels(models);
        });
    }, []);

    // In-chat search effect (#10)
    useEffect(() => {
        if (!chatSearchQuery.trim()) {
            setChatSearchMatches([]);
            setActiveMatchIdx(0);
            return;
        }
        const query = chatSearchQuery.toLowerCase();
        const matches: number[] = [];
        messages.forEach((m, idx) => {
            if (m.content.toLowerCase().includes(query)) {
                matches.push(idx);
            }
        });
        setChatSearchMatches(matches);
        setActiveMatchIdx(0);
        // Scroll to first match
        if (matches.length > 0) {
            document.getElementById(`msg-${messages[matches[0]]?.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [chatSearchQuery, messages]);

    // Navigate search matches
    const navigateSearchMatch = (direction: 'next' | 'prev') => {
        if (chatSearchMatches.length === 0) return;
        let newIdx = direction === 'next'
            ? (activeMatchIdx + 1) % chatSearchMatches.length
            : (activeMatchIdx - 1 + chatSearchMatches.length) % chatSearchMatches.length;
        setActiveMatchIdx(newIdx);
        const msgIdx = chatSearchMatches[newIdx];
        document.getElementById(`msg-${messages[msgIdx]?.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // Voice input (#19)
    const SpeechRecognition = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

    const toggleVoiceInput = () => {
        if (!SpeechRecognition) return;

        if (isListening && recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        // Set language based on i18n locale
        const lang = (window as any).__i18n_lang || navigator.language || 'en-US';
        const langMap: Record<string, string> = { en: 'en-US', hi: 'hi-IN', mr: 'mr-IN' };
        recognition.lang = langMap[lang] || lang;

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInputValue(prev => prev + (prev ? ' ' : '') + transcript);
            setIsListening(false);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
    };

    // Session pinning (#20)
    const handlePinSession = async (sessionId: string) => {
        const session = sessions.find(s => s.session_id === sessionId);
        if (!session) return;
        const newPinned = !session.pinned;
        try {
            await ragService.pinSession(sessionId, newPinned);
            setSessions(prev => prev.map(s =>
                s.session_id === sessionId ? { ...s, pinned: newPinned } : s
            ));
        } catch (error) {
            console.error('Failed to pin session', error);
        }
    };

    // Sort sessions: pinned first, then by date
    const sortedSessions = [...sessions].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return 0;
    });

    // Filter sessions by sidebar search
    const filteredSessions = sidebarSearch.trim()
        ? sortedSessions.filter(s => s.title.toLowerCase().includes(sidebarSearch.toLowerCase()))
        : sortedSessions;

    // Check if on mobile
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 1024);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const handleDeleteSession = async (sessionId: string) => {
        if (sessions.length <= 1) return; // Don't delete last session
        if (!window.confirm('Delete this chat session?')) return;

        try {
            await ragService.deleteSession(sessionId);
            const remaining = sessions.filter(s => s.session_id !== sessionId);
            setSessions(remaining);
            if (currentSessionId === sessionId) {
                setCurrentSessionId(remaining[0]?.session_id || null);
            }
        } catch (error) {
            console.error('Failed to delete session', error);
        }
    };

    const handleRenameSession = async (sessionId: string, newTitle: string) => {
        const trimmed = newTitle.trim();
        if (!trimmed) {
            setEditingSessionId(null);
            return;
        }
        try {
            await ragService.renameSession(sessionId, trimmed);
            setSessions(prev => prev.map(s => s.session_id === sessionId ? { ...s, title: trimmed } : s));
        } catch (error) {
            console.error('Failed to rename session', error);
        }
        setEditingSessionId(null);
    };

    // ---- Sessions ----
    useEffect(() => {
        let cancelled = false;
        const loadSessions = async () => {
            if (!caseData?._id) return;
            try {
                const fetchedSessions = await ragService.getSessions(caseData._id);
                if (cancelled) return;
                if (fetchedSessions && fetchedSessions.length > 0) {
                    setSessions(fetchedSessions);
                    setCurrentSessionId(fetchedSessions[0].session_id);
                } else {
                    // Create first session inline (guarded against StrictMode double-run)
                    if (creatingSessionRef.current) return;
                    creatingSessionRef.current = true;
                    try {
                        const newSession = await ragService.createSession(caseData._id, 'Chat 1');
                        if (cancelled) return;
                        setSessions([newSession]);
                        setCurrentSessionId(newSession.session_id);
                        setMessages([]);
                    } finally {
                        creatingSessionRef.current = false;
                    }
                }
            } catch (error) {
                console.error("Error loading sessions", error);
            }
        };
        loadSessions();
        return () => { cancelled = true; };
    }, [caseData._id]);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!caseData?._id || !currentSessionId) return;
            try {
                const data = await ragService.getHistory(currentSessionId);
                if (data.history && Array.isArray(data.history)) {
                    const historyMessages: Message[] = data.history.map((msg: { role: string; content: string }, index: number) => ({
                        id: index,
                        sender: msg.role === 'user' ? 'You' : 'AI Assistant',
                        avatar: msg.role === 'assistant' ? 'https://ui-avatars.com/api/?name=AI&background=0D8ABC&color=fff' : undefined,
                        content: msg.content,
                        time: '',
                        isUser: msg.role === 'user',
                        // @ts-ignore
                        contexts: msg.contexts || []
                    }));
                    setMessages(historyMessages);
                } else {
                    setMessages([]);
                }
            } catch (err) {
                console.error("Failed to load history", err);
            }
        };
        fetchHistory();
    }, [currentSessionId, caseData._id]);

    const handleCreateSession = async () => {
        if (!caseData?._id || creatingSessionRef.current) return;
        creatingSessionRef.current = true;
        try {
            // Re-fetch sessions from server to get the true latest list
            const latestSessions = await ragService.getSessions(caseData._id);
            const nextNum = getNextChatNumber(latestSessions || []);
            const newSession = await ragService.createSession(caseData._id, `Chat ${nextNum}`);
            setSessions(prev => [newSession, ...prev]);
            setCurrentSessionId(newSession.session_id);
            setMessages([]);
        } catch (error) {
            console.error("Failed to create session", error);
        } finally {
            creatingSessionRef.current = false;
        }
    };

    // ---- Text selection → Check Sources ----
    const handleMouseUp = (msgContexts?: ContextItem[]) => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !msgContexts || msgContexts.length === 0) {
            setSelectionCoords(null);
            return;
        }
        const selText = selection.toString().trim();
        if (!selText) { setSelectionCoords(null); return; }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectionCoords({ x: rect.left + (rect.width / 2), y: rect.top - 10 });
        setSelectedText(selText);

        const scored = msgContexts
            .map(ctx => ({ ...ctx, _selectionScore: computeJaccard(selText, ctx.content) }))
            .filter(ctx => ctx._selectionScore > 0.02)
            .sort((a, b) => b._selectionScore - a._selectionScore);
        setSelectedContexts(scored.length > 0 ? scored : msgContexts);
    };

    useEffect(() => {
        const handleClick = () => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed) {
                setSelectionCoords(null);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // ---- Open sources panel & load document ----
    const openSourcesPanel = useCallback(async (contexts: ContextItem[]) => {
        setSourcesPanelOpen(true);
        setSelectedContexts(contexts);
        setSourceViewMode('text');
        setDocLoading(false);
        setDocumentText([]);
        // Store the user's mouse-selected text for blue highlighting
        setSelectionHighlight(selectedText);

        // Collect unique source filenames
        const sources = [...new Set(contexts.map(c => c.source).filter(Boolean))] as string[];
        if (sources.length === 0) return;

        const firstSource = sources[0];
        setActiveSourceTab(firstSource);

        // Collect chunk texts for highlighting
        const chunks = contexts.filter(c => c.source === firstSource).map(c => c.content);
        setHighlightChunks(chunks);
        setActiveHighlightIdx(0);

        // Fetch document text
        setDocLoading(true);
        try {
            const data = await ragService.getDocumentText(caseData._id, firstSource);
            setDocumentText(data.pages || []);
        } catch (err) {
            console.error("Failed to load document text", err);
            setDocumentText([]);
        } finally {
            setDocLoading(false);
        }
    }, [caseData._id, selectedText]);

    // Switch active source tab
    const switchSourceTab = useCallback(async (source: string) => {
        setActiveSourceTab(source);
        setActiveHighlightIdx(0);
        setSourceViewMode('text');

        const chunks = (selectedContexts || []).filter(c => c.source === source).map(c => c.content);
        setHighlightChunks(chunks);

        setDocLoading(true);
        try {
            const data = await ragService.getDocumentText(caseData._id, source);
            setDocumentText(data.pages || []);
        } catch (err) {
            console.error("Failed to load document text", err);
            setDocumentText([]);
        } finally {
            setDocLoading(false);
        }
    }, [caseData._id, selectedContexts]);

    // Auto-scroll to first highlight when document loads
    useEffect(() => {
        if (!docLoading && highlightRefs.current[0]) {
            setTimeout(() => {
                highlightRefs.current[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    }, [docLoading, documentText]);

    // Jump between highlights
    const jumpToHighlight = (idx: number) => {
        setActiveHighlightIdx(idx);
        highlightRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // ---- Find text positions in document (normalized whitespace matching) ----
    const findTextPositions = (fullText: string, needles: string[]): Array<{ start: number; end: number; idx: number }> => {
        const normalizeForSearch = (t: string) => t.replace(/\s+/g, ' ').trim();
        const normalizedFull = normalizeForSearch(fullText);
        const results: Array<{ start: number; end: number; idx: number }> = [];

        // Build a mapping from normalized index → original index
        const normToOrig: number[] = [];
        let ni = 0;
        let prevWasSpace = false;
        for (let oi = 0; oi < fullText.length; oi++) {
            const ch = fullText[oi];
            if (/\s/.test(ch)) {
                if (!prevWasSpace) {
                    normToOrig.push(oi);
                    ni++;
                    prevWasSpace = true;
                }
            } else {
                normToOrig.push(oi);
                ni++;
                prevWasSpace = false;
            }
        }
        // Sentinel
        normToOrig.push(fullText.length);

        for (let i = 0; i < needles.length; i++) {
            const needle = normalizeForSearch(needles[i]);
            if (!needle) continue;

            // Exact normalized match
            let pos = normalizedFull.indexOf(needle);
            if (pos !== -1) {
                const origStart = normToOrig[pos] ?? 0;
                const origEnd = normToOrig[Math.min(pos + needle.length, normToOrig.length - 1)] ?? fullText.length;
                results.push({ start: origStart, end: origEnd, idx: i });
            } else {
                // Fallback: try first 80 chars
                const short = needle.substring(0, Math.min(80, needle.length));
                const shortPos = normalizedFull.indexOf(short);
                if (shortPos !== -1) {
                    const origStart = normToOrig[shortPos] ?? 0;
                    const origEnd = normToOrig[Math.min(shortPos + needle.length, normToOrig.length - 1)] ?? fullText.length;
                    results.push({ start: origStart, end: origEnd, idx: i });
                }
            }
        }
        return results;
    };

    // ---- Find best fuzzy match for user's selected text in document ----
    const findSelectionInDocument = (fullText: string, selection: string): { start: number; end: number } | null => {
        if (!selection || selection.length < 3) return null;

        // First try exact normalized match
        const positions = findTextPositions(fullText, [selection]);
        if (positions.length > 0) return positions[0];

        // Fuzzy: slide a window over the document and find the best word-overlap
        const selWords = selection.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(Boolean);
        if (selWords.length < 2) return null;
        const selSet = new Set(selWords);

        const words = fullText.split(/\s+/);
        const windowSize = Math.max(selWords.length, Math.min(selWords.length * 3, words.length));
        let bestScore = 0;
        let bestStart = -1;
        let bestEnd = -1;

        // Track character offsets for each word
        const wordOffsets: number[] = [];
        let offset = 0;
        for (const w of words) {
            const idx = fullText.indexOf(w, offset);
            wordOffsets.push(idx >= 0 ? idx : offset);
            offset = (idx >= 0 ? idx : offset) + w.length;
        }

        for (let i = 0; i <= words.length - Math.min(windowSize, words.length); i++) {
            const end = Math.min(i + windowSize, words.length);
            let overlap = 0;
            for (let j = i; j < end; j++) {
                if (selSet.has(words[j].toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''))) overlap++;
            }
            const score = overlap / (selSet.size + (end - i) - overlap); // Jaccard
            if (score > bestScore && score > 0.15) {
                bestScore = score;
                bestStart = wordOffsets[i];
                bestEnd = wordOffsets[end - 1] + words[end - 1].length;
            }
        }

        if (bestStart >= 0) return { start: bestStart, end: bestEnd };
        return null;
    };

    // ---- Render document text with highlights ----
    // Yellow = full RAG context chunk, Purple = the specific part matching user's selection (within yellow)
    const renderDocumentWithHighlights = (fullText: string, chunks: string[]): React.ReactNode => {
        if (!chunks.length && !selectionHighlight) return <span>{fullText}</span>;

        // 1. Find chunk regions (yellow)
        const chunkPositions = findTextPositions(fullText, chunks);
        if (chunkPositions.length === 0 && !selectionHighlight) return <span>{fullText}</span>;

        // 2. Find user selection match position
        let selRange: { start: number; end: number } | null = null;
        if (selectionHighlight) {
            selRange = findSelectionInDocument(fullText, selectionHighlight);
        }

        // 3. Build flat, non-overlapping segments with proper types
        //    Each segment is: { start, end, type: 'plain' | 'yellow' | 'purple', chunkIdx }
        type Segment = { start: number; end: number; type: 'plain' | 'yellow' | 'purple'; chunkIdx: number };

        // Sort chunks by position
        const sortedChunks = [...chunkPositions].sort((a, b) => a.start - b.start);

        // Merge overlapping chunks
        const mergedChunks: Array<{ start: number; end: number; idx: number }> = [];
        for (const c of sortedChunks) {
            const last = mergedChunks[mergedChunks.length - 1];
            if (last && c.start <= last.end) {
                last.end = Math.max(last.end, c.end);
            } else {
                mergedChunks.push({ ...c });
            }
        }

        // For each chunk region, split it into yellow and purple sub-segments
        const segments: Segment[] = [];
        for (const chunk of mergedChunks) {
            if (selRange && selRange.start < chunk.end && selRange.end > chunk.start) {
                // Selection overlaps this chunk — split into up to 3 parts
                const overlapStart = Math.max(chunk.start, selRange.start);
                const overlapEnd = Math.min(chunk.end, selRange.end);

                // Yellow before purple
                if (overlapStart > chunk.start) {
                    segments.push({ start: chunk.start, end: overlapStart, type: 'yellow', chunkIdx: chunk.idx });
                }
                // Purple (the matching part)
                segments.push({ start: overlapStart, end: overlapEnd, type: 'purple', chunkIdx: chunk.idx });
                // Yellow after purple
                if (overlapEnd < chunk.end) {
                    segments.push({ start: overlapEnd, end: chunk.end, type: 'yellow', chunkIdx: chunk.idx });
                }
            } else {
                // No selection overlap — entire chunk is yellow
                segments.push({ start: chunk.start, end: chunk.end, type: 'yellow', chunkIdx: chunk.idx });
            }
        }

        // If selection falls entirely outside any chunk, show it as purple standalone
        if (selRange) {
            const insideChunk = mergedChunks.some(c => selRange!.start < c.end && selRange!.end > c.start);
            if (!insideChunk) {
                segments.push({ start: selRange.start, end: selRange.end, type: 'purple', chunkIdx: -1 });
                segments.sort((a, b) => a.start - b.start);
            }
        }

        // Reset refs
        highlightRefs.current = [];
        selectionRef.current = null;
        let chunkRefCounter = 0;

        // Build JSX
        const parts: React.ReactNode[] = [];
        let cursor = 0;

        for (const seg of segments) {
            // Plain text before this segment
            if (seg.start > cursor) {
                parts.push(<span key={`t-${cursor}`}>{fullText.slice(cursor, seg.start)}</span>);
            }

            if (seg.type === 'purple') {
                // Purple = user's selected text found in document
                const thisRefIdx = chunkRefCounter++;
                parts.push(
                    <mark
                        key={`sel-${seg.start}`}
                        ref={(el) => {
                            highlightRefs.current[thisRefIdx] = el;
                            selectionRef.current = el;
                        }}
                        className="bg-purple-200 rounded-sm px-0.5 transition-all duration-300 ring-2 ring-purple-400 shadow-lg shadow-purple-200/50"
                        onClick={() => jumpToHighlight(thisRefIdx)}
                        title="Your selected text"
                    >
                        {fullText.slice(seg.start, seg.end)}
                    </mark>
                );
            } else {
                // Yellow = chunk context
                const thisRefIdx = chunkRefCounter++;
                parts.push(
                    <mark
                        key={`h-${seg.start}`}
                        ref={(el) => { highlightRefs.current[thisRefIdx] = el; }}
                        className={`bg-yellow-200 rounded-sm px-0.5 transition-all duration-300 cursor-pointer ${thisRefIdx === activeHighlightIdx ? 'bg-yellow-300 ring-2 ring-yellow-400 shadow-lg shadow-yellow-200/50' : 'hover:bg-yellow-300'}`}
                        onClick={() => jumpToHighlight(thisRefIdx)}
                        title="AI context source"
                    >
                        {fullText.slice(seg.start, seg.end)}
                    </mark>
                );
            }
            cursor = seg.end;
        }

        if (cursor < fullText.length) {
            parts.push(<span key={`t-${cursor}`}>{fullText.slice(cursor)}</span>);
        }
        return <>{parts}</>;
    };

    // ---- Messaging ----
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => { scrollToBottom(); }, [messages]);

    const handleSendMessage = async (messageOverride?: string, skipUserMsg?: boolean) => {
        const msgContent = messageOverride || inputValue;
        if (!msgContent.trim() || !currentSessionId) return;

        let botMsgId = Date.now() + 1;

        if (!skipUserMsg) {
            const newUserMsg: Message = {
                id: Date.now(),
                sender: 'You',
                content: msgContent,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isUser: true
            };

            const botMsg: Message = {
                id: botMsgId,
                sender: 'AI Assistant',
                avatar: 'https://ui-avatars.com/api/?name=AI&background=0D8ABC&color=fff',
                content: '',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isUser: false,
            };

            setMessages(prev => [...prev, newUserMsg, botMsg]);
        } else {
            // For regeneration — just add the bot message placeholder
            const botMsg: Message = {
                id: botMsgId,
                sender: 'AI Assistant',
                avatar: 'https://ui-avatars.com/api/?name=AI&background=0D8ABC&color=fff',
                content: '',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isUser: false,
            };
            setMessages(prev => [...prev, botMsg]);
        }

        if (!messageOverride) setInputValue('');
        setIsLoading(true);

        // Abort any existing stream
        if (streamControllerRef.current) {
            streamControllerRef.current.abort();
        }

        const controller = ragService.chatStream(
            caseData._id,
            msgContent,
            5,
            currentSessionId,
            // onToken
            (token: string) => {
                setMessages(prev => prev.map(m =>
                    m.id === botMsgId ? { ...m, content: m.content + token } : m
                ));
            },
            // onContexts
            (contexts) => {
                setMessages(prev => prev.map(m =>
                    m.id === botMsgId ? { ...m, contexts } : m
                ));
            },
            // onDone
            (_fullAnswer: string, usage?: TokenUsage) => {
                setMessages(prev => prev.map(m =>
                    m.id === botMsgId ? { ...m, usage: usage || null } : m
                ));
                setIsLoading(false);
                streamControllerRef.current = null;
            },
            // onError
            (error: string) => {
                console.error("Stream error:", error);
                setMessages(prev => prev.map(m =>
                    m.id === botMsgId
                        ? { ...m, content: m.content || "Sorry, I encountered an error processing your request.", error: true }
                        : m
                ));
                setIsLoading(false);
                streamControllerRef.current = null;
            },
            // modelOverride
            selectedModel || undefined,
        );

        streamControllerRef.current = controller;
    };

    // Regenerate: remove last AI message and resend the preceding user message
    const handleRegenerate = (aiMessageId: number) => {
        const aiMsgIndex = messages.findIndex(m => m.id === aiMessageId);
        if (aiMsgIndex < 0) return;
        // Find the preceding user message
        let userMsg: Message | null = null;
        for (let i = aiMsgIndex - 1; i >= 0; i--) {
            if (messages[i].isUser) { userMsg = messages[i]; break; }
        }
        if (!userMsg) return;
        // Remove the AI message
        setMessages(prev => prev.filter(m => m.id !== aiMessageId));
        // Resend
        handleSendMessage(userMsg.content, true);
    };

    // Edit and resubmit user message
    const handleEditSubmit = async (messageId: number) => {
        const msgIndex = messages.findIndex(m => m.id === messageId);
        if (msgIndex < 0 || !editingContent.trim()) return;

        // Truncate messages after the edited one
        const truncated = messages.slice(0, msgIndex);
        setMessages(truncated);
        setEditingMessageId(null);

        // Truncate server-side history
        if (currentSessionId) {
            try {
                // Each frontend message = 1 backend message (user + assistant pairs)
                // We need to count how many messages to keep on server
                const serverIndex = truncated.filter(m => m.id !== 0).length; // rough count
                await ragService.truncateSession(currentSessionId, Math.max(0, serverIndex));
            } catch {
                // Non-critical, continue anyway
            }
        }

        // Send the edited message
        handleSendMessage(editingContent);
    };

    // Feedback handler
    const handleFeedback = async (messageId: number, feedback: 'up' | 'down') => {
        const msg = messages.find(m => m.id === messageId);
        if (!msg || !currentSessionId) return;

        // Toggle off if same feedback
        const newFeedback = msg.feedback === feedback ? null : feedback;
        setMessages(prev => prev.map(m =>
            m.id === messageId ? { ...m, feedback: newFeedback } : m
        ));

        if (newFeedback) {
            try {
                await ragService.submitFeedback(currentSessionId, messageId, newFeedback, msg.content);
            } catch {
                // Revert on error
                setMessages(prev => prev.map(m =>
                    m.id === messageId ? { ...m, feedback: msg.feedback } : m
                ));
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
    };

    // ---- Keyboard Shortcuts ----
    useKeyboardShortcuts({
        onNewChat: handleCreateSession,
        onStopGeneration: () => {
            if (chatSearchOpen) {
                setChatSearchOpen(false);
                setChatSearchQuery('');
                return;
            }
            if (streamControllerRef.current) {
                streamControllerRef.current.abort();
                streamControllerRef.current = null;
                setIsLoading(false);
            }
        },
        onFocusInput: () => {
            chatInputRef.current?.focus();
        },
        onToggleSidebar: () => {
            if (isMobile) {
                setMobileDrawerOpen(prev => !prev);
            } else {
                setSidebarOpen(prev => !prev);
            }
        },
        onToggleShortcutsHelp: () => setShowShortcuts(prev => !prev),
        onSearchInChat: () => {
            setChatSearchOpen(prev => !prev);
            setTimeout(() => chatSearchInputRef.current?.focus(), 100);
        },
    });

    // ---- Drag & Drop ----
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };
    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const files = e.dataTransfer.files;
        if (files.length > 0 && fileInputRef.current) {
            // Trigger the same upload flow
            const dt = new DataTransfer();
            for (let i = 0; i < files.length; i++) dt.items.add(files[i]);
            fileInputRef.current.files = dt.files;
            fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
        }
    };

    // ---- Paste files from clipboard ----
    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.files;
        if (items && items.length > 0 && fileInputRef.current) {
            e.preventDefault();
            const dt = new DataTransfer();
            for (let i = 0; i < items.length; i++) dt.items.add(items[i]);
            fileInputRef.current.files = dt.files;
            fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
        }
    };

    // ---- File Upload ----
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !caseData?._id) return;

        // Reset input so re-selecting the same file works
        const fileList = Array.from(files);
        e.target.value = '';

        // Process files sequentially to avoid backend race conditions
        for (const file of fileList) {
            const fileName = file.name;

            // Check file size (50MB limit)
            if (file.size > 50 * 1024 * 1024) {
                const errorMsg: Message = {
                    id: Date.now(),
                    sender: 'System',
                    content: `**${fileName}** exceeds the 50MB file size limit.`,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isUser: false,
                };
                setMessages(prev => [...prev, errorMsg]);
                continue;
            }

            // Add to uploading tracker
            setUploadingFiles(prev => [...prev, { name: fileName, status: 'uploading' }]);

            // Post uploading system message
            const uploadMsgId = Date.now();
            setMessages(prev => [...prev, {
                id: uploadMsgId,
                sender: 'System',
                content: `Uploading **${fileName}**...`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isUser: false,
            }]);

            try {
                await ragService.ingestDocument(caseData._id, file);

                // Update status to processing
                setUploadingFiles(prev => prev.map(f => f.name === fileName ? { ...f, status: 'processing' } : f));
                setMessages(prev => prev.map(m => m.id === uploadMsgId ? { ...m, content: `**${fileName}** uploaded. Processing for AI analysis...` } : m));

                // Poll for ready status
                const pollInterval = setInterval(async () => {
                    try {
                        const statuses = await ragService.getDocumentStatuses(caseData._id);
                        const docStatus = Array.isArray(statuses) ? statuses.find((d: any) => d.filename === fileName) : null;

                        if (docStatus?.status === 'Ready') {
                            clearInterval(pollInterval);
                            setUploadingFiles(prev => prev.map(f => f.name === fileName ? { ...f, status: 'ready' } : f));
                            setMessages(prev => prev.map(m => m.id === uploadMsgId ? { ...m, content: `**${fileName}** is ready! You can now ask questions about it.` } : m));
                            // Clean up ready files from tracker after a delay
                            setTimeout(() => {
                                setUploadingFiles(prev => prev.filter(f => f.name !== fileName));
                            }, 3000);
                        } else if (docStatus?.status === 'Failed') {
                            clearInterval(pollInterval);
                            setUploadingFiles(prev => prev.map(f => f.name === fileName ? { ...f, status: 'failed' } : f));
                            setMessages(prev => prev.map(m => m.id === uploadMsgId ? { ...m, content: `**${fileName}** failed to process. Try uploading again from the Documents tab.` } : m));
                        }
                    } catch {
                        // Polling error — keep trying
                    }
                }, 3000);

                // Safety: stop polling after 5 minutes
                setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000);

            } catch (error: any) {
                const errMsg = error?.response?.data?.detail || error?.response?.data?.error || 'Upload failed';
                setUploadingFiles(prev => prev.map(f => f.name === fileName ? { ...f, status: 'failed' } : f));
                setMessages(prev => prev.map(m => m.id === uploadMsgId ? { ...m, content: `Failed to upload **${fileName}**: ${errMsg}` } : m));
            }
        }
    };

    // Get unique sources from current contexts
    const uniqueSources = selectedContexts ? [...new Set(selectedContexts.map(c => c.source).filter(Boolean))] as string[] : [];

    // Get chunks for active tab
    const activeChunks = (selectedContexts || []).filter(c => c.source === activeSourceTab);

    return (
        <>
            {/* Security Banner */}
            <div className="bg-blue-50 border-b border-blue-100 py-2 flex items-center justify-center gap-2 text-xs font-medium text-blue-700">
                <LockIcon />
                {t('portal.chat.security')}
            </div>

            {/* Main layout */}
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden h-[calc(100vh-140px)]" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>

                {/* Drag overlay */}
                {isDragOver && (
                    <div className="absolute inset-0 z-50 bg-blue-500/10 border-2 border-dashed border-blue-400 rounded-xl flex items-center justify-center backdrop-blur-sm pointer-events-none">
                        <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-3">
                            <svg className="w-12 h-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            <p className="text-sm font-semibold text-slate-700">Drop files to upload</p>
                            <p className="text-xs text-slate-400">PDF, DOCX, TXT, Images, ZIP</p>
                        </div>
                    </div>
                )}

                {/* Mobile sidebar backdrop */}
                {isMobile && mobileDrawerOpen && (
                    <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden" onClick={() => setMobileDrawerOpen(false)} />
                )}

                {/* SESSIONS SIDEBAR (left) — drawer on mobile, inline on desktop */}
                <div className={`
                    ${isMobile
                        ? `fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ${mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`
                        : `${isSidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300`
                    }
                    bg-white border-r border-slate-200 flex flex-col flex-shrink-0 overflow-hidden
                `}>
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-bold text-slate-700 text-sm">{t('portal.chat.chats')}</h3>
                        <div className="flex items-center gap-1.5">
                            {/* Custom instructions button */}
                            <button
                                onClick={() => setShowCustomInstructions(true)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                                title="Custom instructions"
                                aria-label="Custom instructions"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </button>
                            <button onClick={handleCreateSession} className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors" title={t('portal.chat.newChat')} aria-label="New chat">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            </button>
                            {isMobile && (
                                <button onClick={() => setMobileDrawerOpen(false)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md lg:hidden" aria-label="Close sidebar">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Sidebar search (#10) */}
                    <div className="px-3 py-2 border-b border-slate-100">
                        <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-2.5 py-1.5">
                            <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input
                                type="text"
                                value={sidebarSearch}
                                onChange={(e) => setSidebarSearch(e.target.value)}
                                placeholder="Filter chats..."
                                className="flex-1 text-xs bg-transparent outline-none text-slate-600 placeholder-slate-400"
                                aria-label="Filter chat sessions"
                            />
                            {sidebarSearch && (
                                <button onClick={() => setSidebarSearch('')} className="text-slate-400 hover:text-slate-600" aria-label="Clear search">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1" role="listbox" aria-label="Chat sessions">
                        {filteredSessions.map(session => (
                            <div
                                key={session.session_id}
                                role="option"
                                aria-selected={currentSessionId === session.session_id}
                                className={`group/session w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-2.5 cursor-pointer ${currentSessionId === session.session_id ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm ring-1 ring-blue-200' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                                onClick={() => { setCurrentSessionId(session.session_id); if (isMobile) setMobileDrawerOpen(false); }}
                            >
                                {/* Pin indicator */}
                                {session.pinned ? (
                                    <svg className="w-4 h-4 flex-shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.828 3.172a4 4 0 015.656 0l1.344 1.344a4 4 0 010 5.656L11.5 15.5 4.5 8.5l5.328-5.328zM3.5 17.5l1-4 3 3-4 1z" /></svg>
                                ) : (
                                    <svg className={`w-4 h-4 flex-shrink-0 ${currentSessionId === session.session_id ? 'text-blue-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                )}
                                {editingSessionId === session.session_id ? (
                                    <input
                                        className="flex-1 min-w-0 text-sm bg-white border border-blue-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        value={editingTitle}
                                        onChange={(e) => setEditingTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleRenameSession(session.session_id, editingTitle);
                                            } else if (e.key === 'Escape') {
                                                setEditingSessionId(null);
                                            }
                                        }}
                                        onBlur={() => handleRenameSession(session.session_id, editingTitle)}
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <span
                                        className="truncate flex-1"
                                        onDoubleClick={(e) => {
                                            e.stopPropagation();
                                            setEditingSessionId(session.session_id);
                                            setEditingTitle(session.title);
                                        }}
                                    >
                                        {session.title}
                                    </span>
                                )}
                                {/* Pin button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); handlePinSession(session.session_id); }}
                                    className={`p-1 rounded transition-opacity flex-shrink-0 ${session.pinned ? 'text-amber-500 opacity-100' : 'opacity-0 group-hover/session:opacity-100 text-slate-400 hover:text-amber-500'}`}
                                    title={session.pinned ? 'Unpin session' : 'Pin session'}
                                    aria-label={session.pinned ? 'Unpin session' : 'Pin session'}
                                >
                                    <svg className="w-3.5 h-3.5" fill={session.pinned ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                                </button>
                                {sessions.length > 1 && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.session_id); }}
                                        className="p-1 rounded opacity-0 group-hover/session:opacity-100 transition-opacity hover:bg-red-100 hover:text-red-600 flex-shrink-0"
                                        title="Delete session"
                                        aria-label="Delete session"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* CHAT AREA (center) */}
                <div className="flex-1 flex flex-col relative bg-slate-50/50 min-w-0" onPaste={handlePaste}>
                    {/* Toggle left sidebar / hamburger on mobile */}
                    <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                        <button
                            onClick={() => isMobile ? setMobileDrawerOpen(!mobileDrawerOpen) : setSidebarOpen(!isSidebarOpen)}
                            className="p-2 bg-white/80 backdrop-blur shadow-sm border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 transition-colors"
                            aria-label={isSidebarOpen || mobileDrawerOpen ? 'Close sidebar' : 'Open sidebar'}
                        >
                            {(isMobile ? !mobileDrawerOpen : !isSidebarOpen) ? (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                            )}
                        </button>

                        {/* Model picker (#22) */}
                        {availableModels.length > 0 && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowModelPicker(!showModelPicker)}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/80 backdrop-blur shadow-sm border border-slate-200 rounded-lg text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors"
                                    aria-label="Select AI model"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    {selectedModel ? availableModels.find(m => m.id === selectedModel)?.name || 'Default' : 'Default'}
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                                {showModelPicker && (
                                    <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 py-1 min-w-[180px] z-50">
                                        <button
                                            onClick={() => { setSelectedModel(''); setShowModelPicker(false); }}
                                            className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${!selectedModel ? 'text-blue-600 font-medium bg-blue-50' : 'text-slate-600'}`}
                                        >
                                            Default (Auto)
                                        </button>
                                        {availableModels.map(model => (
                                            <button
                                                key={model.id}
                                                onClick={() => { setSelectedModel(model.id); setShowModelPicker(false); }}
                                                className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors flex items-center justify-between ${selectedModel === model.id ? 'text-blue-600 font-medium bg-blue-50' : 'text-slate-600'}`}
                                            >
                                                <span>{model.name}</span>
                                                <span className="text-[10px] text-slate-400 capitalize">{model.provider}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* In-chat search overlay (#10) */}
                    {chatSearchOpen && (
                        <div className="absolute top-0 left-0 right-0 z-20 bg-white border-b border-slate-200 shadow-sm flex items-center gap-2 px-4 py-2">
                            <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input
                                ref={chatSearchInputRef}
                                type="text"
                                value={chatSearchQuery}
                                onChange={(e) => setChatSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') navigateSearchMatch(e.shiftKey ? 'prev' : 'next');
                                    if (e.key === 'Escape') { setChatSearchOpen(false); setChatSearchQuery(''); }
                                }}
                                placeholder="Search in conversation..."
                                className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder-slate-400"
                                aria-label="Search in conversation"
                            />
                            {chatSearchMatches.length > 0 && (
                                <span className="text-xs text-slate-400 tabular-nums">{activeMatchIdx + 1}/{chatSearchMatches.length}</span>
                            )}
                            <button onClick={() => navigateSearchMatch('prev')} className="p-1 hover:bg-slate-100 rounded text-slate-400" aria-label="Previous match">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                            </button>
                            <button onClick={() => navigateSearchMatch('next')} className="p-1 hover:bg-slate-100 rounded text-slate-400" aria-label="Next match">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            <button onClick={() => { setChatSearchOpen(false); setChatSearchQuery(''); }} className="p-1 hover:bg-slate-100 rounded text-slate-400" aria-label="Close search">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    )}

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth" role="log" aria-live="polite" aria-label="Chat messages">
                        {messages.length === 0 && (
                            <div className="text-center text-slate-500 py-20 flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
                                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-600 shadow-sm border border-blue-100">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                </div>
                                <h3 className="text-slate-900 font-bold text-lg mb-1">{t('portal.chat.title')}</h3>
                                <p className="text-slate-400 text-sm max-w-xs mb-6">{t('portal.chat.subtitle')}</p>

                                {/* Prompt Suggestions / Starter Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
                                    {[
                                        { icon: '📋', text: 'Summarize all uploaded documents' },
                                        { icon: '⚖️', text: 'What are the key legal issues in this case?' },
                                        { icon: '📅', text: 'List all important dates and deadlines' },
                                        { icon: '🔍', text: 'Find relevant precedents and case law' },
                                    ].map((suggestion, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSendMessage(suggestion.text)}
                                            className="text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 transition-all group/suggestion shadow-sm hover:shadow-md"
                                        >
                                            <span className="text-lg mr-2">{suggestion.icon}</span>
                                            <span className="text-xs text-slate-600 group-hover/suggestion:text-blue-700 font-medium">{suggestion.text}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                id={`msg-${msg.id}`}
                                className={`flex gap-4 ${msg.isUser ? 'flex-row-reverse' : ''} animate-in slide-in-from-bottom-2 fade-in duration-300 fill-mode-backwards group/msg ${chatSearchMatches.includes(messages.indexOf(msg)) ? 'ring-2 ring-yellow-400 rounded-xl' : ''}`}
                            >
                                {!msg.isUser && (
                                    <div className="flex-shrink-0">
                                        <img src={msg.avatar || "https://ui-avatars.com/api/?name=" + msg.sender} alt={msg.sender} className="w-8 h-8 rounded-full object-cover shadow-sm ring-2 ring-white" />
                                    </div>
                                )}
                                <div className={`max-w-[85%] lg:max-w-3xl ${msg.isUser ? 'items-end flex flex-col' : ''}`}>
                                    <div className={`flex items-baseline gap-2 mb-1 px-1 ${msg.isUser ? 'flex-row-reverse' : ''}`}>
                                        <span className="text-xs font-bold text-slate-700">{msg.sender}</span>
                                        <span className="text-[10px] text-slate-400 font-medium">{msg.time}</span>
                                    </div>

                                    {/* Edit mode for user messages */}
                                    {msg.isUser && editingMessageId === msg.id ? (
                                        <div className="w-full flex flex-col gap-2">
                                            <textarea
                                                value={editingContent}
                                                onChange={(e) => setEditingContent(e.target.value)}
                                                className="w-full p-3 rounded-xl border border-blue-300 bg-white text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                rows={3}
                                                autoFocus
                                            />
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => setEditingMessageId(null)} className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                                                <button onClick={() => handleEditSubmit(msg.id)} className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">Save & Submit</button>
                                            </div>
                                        </div>
                                    ) : (
                                    <div
                                        onMouseUp={() => handleMouseUp(msg.contexts)}
                                        className={`
                                            p-4 rounded-2xl text-sm leading-relaxed shadow-sm relative group transition-all duration-200
                                            ${msg.isUser
                                                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-sm shadow-blue-200'
                                                : msg.error
                                                    ? 'bg-red-50 border border-red-200 text-slate-700 rounded-tl-sm'
                                                    : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-slate-100 hover:shadow-md'
                                            }
                                            selection:bg-blue-200 selection:text-blue-900 prose prose-sm max-w-none
                                            ${msg.isUser ? 'prose-invert' : 'prose-slate'}
                                        `}
                                    >
                                        {msg.isUser ? (
                                            <div className="whitespace-pre-wrap">{msg.content}</div>
                                        ) : (
                                            <ReactMarkdown
                                                remarkPlugins={[remarkMath]}
                                                rehypePlugins={[rehypeSanitize, rehypeKatex]}
                                                components={{
                                                    // Code block with syntax highlighting + copy button
                                                    code: ({ node, className, children, ...props }) => {
                                                        const match = /language-(\w+)/.exec(className || '');
                                                        const codeString = String(children).replace(/\n$/, '');
                                                        const isInline = !match && !codeString.includes('\n');

                                                        if (isInline) {
                                                            return <code className="bg-slate-100 rounded px-1 py-0.5 text-xs font-mono text-pink-600" {...props}>{children}</code>;
                                                        }

                                                        // Mermaid diagram rendering (#24)
                                                        if (match?.[1] === 'mermaid') {
                                                            return (
                                                                <Suspense fallback={<div className="my-3 p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-400">Loading diagram...</div>}>
                                                                    <MermaidBlock code={codeString} />
                                                                </Suspense>
                                                            );
                                                        }

                                                        return (
                                                            <div className="relative group/code my-3 rounded-lg overflow-hidden border border-slate-200">
                                                                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 border-b border-slate-200">
                                                                    <span className="text-[10px] font-mono text-slate-500 uppercase">{match?.[1] || 'code'}</span>
                                                                    <button
                                                                        onClick={() => navigator.clipboard.writeText(codeString)}
                                                                        className="text-[10px] font-medium text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                                                                    >
                                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                                        Copy
                                                                    </button>
                                                                </div>
                                                                <SyntaxHighlighter
                                                                    style={isDark ? oneDark : oneLight}
                                                                    language={match?.[1] || 'text'}
                                                                    PreTag="div"
                                                                    customStyle={{ margin: 0, padding: '12px', fontSize: '12px', background: 'transparent' }}
                                                                >
                                                                    {codeString}
                                                                </SyntaxHighlighter>
                                                            </div>
                                                        );
                                                    },
                                                    ul: ({ node, ...props }) => <ul className="list-disc pl-4 space-y-1 my-2" {...props} />,
                                                    ol: ({ node, ...props }) => <ol className="list-decimal pl-4 space-y-1 my-2" {...props} />,
                                                    strong: ({ node, ...props }) => <strong className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors" {...props} />,
                                                    a: ({ node, ...props }) => <a className="text-blue-600 hover:underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />,
                                                    table: ({ node, ...props }) => <div className='overflow-x-auto my-4 rounded-lg border border-slate-200'><table className='w-full text-left text-xs' {...props} /></div>,
                                                    th: ({ node, ...props }) => <th className='bg-slate-50 px-3 py-2 border-b border-slate-200 font-bold text-slate-700' {...props} />,
                                                    td: ({ node, ...props }) => <td className='px-3 py-2 border-b border-slate-100' {...props} />,
                                                    p: ({ node, children, ...props }) => {
                                                        const renderWithCitations = (child: React.ReactNode): React.ReactNode => {
                                                            if (typeof child !== 'string') return child;
                                                            const parts = child.split(/(\[\d+\])/g);
                                                            if (parts.length === 1) return child;
                                                            return parts.map((part, i) => {
                                                                const match = part.match(/^\[(\d+)\]$/);
                                                                if (match) {
                                                                    const citNum = parseInt(match[1]);
                                                                    const citCtx = msg.contexts?.find(c => c.metadata?.citation_index === citNum);
                                                                    return (
                                                                        <span
                                                                            key={i}
                                                                            className="inline-flex items-center justify-center w-5 h-5 mx-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold cursor-pointer hover:bg-blue-600 hover:text-white transition-colors align-super"
                                                                            title={citCtx ? `Source: ${citCtx.source || 'Unknown'}` : `Citation ${citNum}`}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (msg.contexts) openSourcesPanel(msg.contexts);
                                                                            }}
                                                                        >
                                                                            {citNum}
                                                                        </span>
                                                                    );
                                                                }
                                                                return part;
                                                            });
                                                        };
                                                        return <p {...props}>{React.Children.map(children, renderWithCitations)}</p>;
                                                    },
                                                }}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        )}

                                        {/* Error retry banner */}
                                        {msg.error && !msg.isUser && (
                                            <div className="mt-2 pt-2 border-t border-red-200 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                <span className="text-xs text-red-600">Something went wrong</span>
                                                <button
                                                    onClick={() => handleRegenerate(msg.id)}
                                                    className="ml-auto text-xs font-medium text-red-600 hover:text-red-800 flex items-center gap-1"
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                    Retry
                                                </button>
                                            </div>
                                        )}

                                        {/* Inline references */}
                                        {msg.contexts && msg.contexts.length > 0 && (
                                            <div className={`mt-3 pt-3 border-t ${msg.isUser ? 'border-white/20' : 'border-slate-100'}`}>
                                                <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${msg.isUser ? 'opacity-80' : 'text-slate-400'}`}>
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    {t('portal.chat.references')}
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {[...new Set(msg.contexts.map(ctx => ctx.source).filter(Boolean))].map((source, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => openSourcesPanel(msg.contexts!)}
                                                            className={`
                                                                inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors border cursor-pointer
                                                                ${msg.isUser
                                                                    ? 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
                                                                    : 'bg-slate-50 hover:bg-blue-50 border-slate-200 hover:border-blue-200 text-slate-600 hover:text-blue-600'
                                                                }
                                                            `}
                                                            title="View in document"
                                                        >
                                                            <svg className="w-3 h-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                            {source}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    )}

                                    {/* Message Actions (copy, regenerate, feedback, edit) */}
                                    <MessageActions
                                        content={msg.content}
                                        isUser={msg.isUser}
                                        messageId={msg.id}
                                        onRegenerate={!msg.isUser ? () => handleRegenerate(msg.id) : undefined}
                                        onEdit={msg.isUser ? () => { setEditingMessageId(msg.id); setEditingContent(msg.content); } : undefined}
                                        onFeedback={!msg.isUser ? handleFeedback : undefined}
                                        feedbackState={msg.feedback}
                                        isLoading={isLoading}
                                        hasError={msg.error}
                                        onRetry={msg.error ? () => handleRegenerate(msg.id) : undefined}
                                        tokenUsage={msg.usage}
                                    />
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-4 animate-pulse" role="status" aria-label="AI is thinking">
                                <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0"></div>
                                <div className="bg-white border border-slate-100 text-slate-800 rounded-tl-sm p-4 rounded-2xl shadow-sm">
                                    <div className="flex space-x-1.5">
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="h-8 w-full"></div>
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input — sticky on mobile for safe-area padding */}
                    <div className={`${isMobile ? 'sticky' : 'absolute'} bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none ${isMobile ? 'pb-[env(safe-area-inset-bottom,16px)]' : ''}`}>
                        <div className="pointer-events-auto max-w-4xl mx-auto">
                            {/* Context window indicator */}
                            {messages.length > 0 && (
                                <div className="flex items-center justify-between mb-1.5 px-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-medium ${messages.length >= 18 ? 'text-amber-600' : 'text-slate-400'}`}>
                                            {Math.ceil(messages.length / 2)}/10 messages in context
                                        </span>
                                        {messages.length >= 18 && (
                                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Near limit</span>
                                        )}
                                    </div>
                                    {/* Export dropdown */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowExportMenu(!showExportMenu)}
                                            className="text-[10px] text-slate-400 hover:text-blue-600 font-medium flex items-center gap-1 transition-colors"
                                            title="Export conversation"
                                            aria-label="Export conversation"
                                        >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            Export
                                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                        {showExportMenu && (
                                            <div className="absolute bottom-full right-0 mb-1 bg-white rounded-lg shadow-xl border border-slate-200 py-1 min-w-[130px] z-50">
                                                <button
                                                    onClick={() => {
                                                        exportAsMarkdown(messages, sessions.find(s => s.session_id === currentSessionId)?.title || 'Chat');
                                                        setShowExportMenu(false);
                                                    }}
                                                    className="w-full text-left px-3 py-1.5 text-[11px] text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                                >
                                                    <span className="text-slate-400">MD</span> Markdown
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        exportAsPdf(messages, sessions.find(s => s.session_id === currentSessionId)?.title || 'Chat');
                                                        setShowExportMenu(false);
                                                    }}
                                                    className="w-full text-left px-3 py-1.5 text-[11px] text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                                >
                                                    <span className="text-red-400">PDF</span> PDF Document
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {/* Upload status indicator */}
                            {uploadingFiles.filter(f => f.status !== 'ready').length > 0 && (
                                <div className="mb-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm">
                                    {uploadingFiles.filter(f => f.status !== 'ready').map(f => (
                                        <div key={f.name} className="flex items-center gap-2 text-xs text-slate-500 py-0.5">
                                            {(f.status === 'uploading' || f.status === 'processing') && (
                                                <svg className="w-3.5 h-3.5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                            )}
                                            {f.status === 'failed' && (
                                                <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            )}
                                            <span className="truncate">{f.name}</span>
                                            <span className="text-slate-400">—</span>
                                            <span className={f.status === 'failed' ? 'text-red-500' : 'text-blue-500'}>
                                                {f.status === 'uploading' ? 'Uploading...' : f.status === 'processing' ? 'Processing...' : 'Failed'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-end gap-2 bg-white/80 backdrop-blur-md p-2 rounded-3xl border border-slate-200/60 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-slate-200/40 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors self-center"
                                >
                                    <PaperClipIcon />
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept=".pdf,.docx,.txt,.md,.jpg,.jpeg,.png,.bmp,.tiff,.zip"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                                <TransliterateInput
                                    value={inputValue}
                                    onChangeText={setInputValue}
                                    onKeyDown={handleKeyDown}
                                    placeholder={t('portal.chat.placeholder')}
                                    className="flex-1 bg-transparent max-h-32 min-h-[44px] py-3 resize-none outline-none text-sm text-slate-700 placeholder-slate-400 leading-relaxed"
                                    type="textarea"
                                    rows={1}
                                    aria-label="Chat message input"
                                />
                                {/* Voice input (#19) */}
                                {SpeechRecognition && (
                                    <button
                                        onClick={toggleVoiceInput}
                                        className={`p-3 rounded-full transition-all self-center ${isListening ? 'bg-red-100 text-red-500 animate-pulse' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                        title={isListening ? 'Stop listening' : 'Voice input'}
                                        aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                                    >
                                        {isListening ? (
                                            <span className="relative flex h-5 w-5 items-center justify-center">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <svg className="relative w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" /></svg>
                                            </span>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                            </svg>
                                        )}
                                    </button>
                                )}
                                {isLoading ? (
                                    <button
                                        onClick={() => {
                                            if (streamControllerRef.current) {
                                                streamControllerRef.current.abort();
                                                streamControllerRef.current = null;
                                                setIsLoading(false);
                                            }
                                        }}
                                        className="p-3 rounded-full shadow-sm transition-all flex items-center justify-center self-center mb-0.5 bg-red-500 hover:bg-red-600 text-white transform hover:scale-105 active:scale-95"
                                        title="Stop generation (Esc)"
                                        aria-label="Stop generation"
                                    >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleSendMessage()}
                                        disabled={!inputValue.trim()}
                                        className={`p-3 rounded-full shadow-sm transition-all flex items-center justify-center self-center mb-0.5 ${
                                            !inputValue.trim()
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                : 'bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-200 hover:shadow-blue-300 transform hover:scale-105 active:scale-95'
                                        }`}
                                    >
                                        <svg className="w-5 h-5 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                        </div>
                    </div>
                </div>

                {/* ============================================================ */}
                {/* RIGHT SIDEBAR — Document Viewer with Yellow Highlights       */}
                {/* ============================================================ */}
                {/* Mobile source panel backdrop */}
                {isMobile && sourcesPanelOpen && (
                    <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden" onClick={() => setSourcesPanelOpen(false)} />
                )}
                <div className={`
                    ${isMobile
                        ? `fixed inset-0 z-50 bg-white flex flex-col transition-transform duration-300 ${sourcesPanelOpen ? 'translate-x-0' : 'translate-x-full'}`
                        : `${sourcesPanelOpen ? 'w-[520px]' : 'w-0'} transition-all duration-500 ease-in-out bg-white border-l border-slate-200 flex flex-col flex-shrink-0 overflow-hidden relative`
                    }
                `}>

                    {/* Header */}
                    <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex items-center gap-3 flex-shrink-0">
                        <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-800 text-sm">{t('portal.chat.sourceDoc')}</h3>
                            <p className="text-[11px] text-slate-400 truncate">{activeSourceTab || t('portal.chat.selectSource')}</p>
                        </div>

                        {/* Highlight navigator */}
                        {highlightChunks.length > 0 && !docLoading && (
                            <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 rounded-lg px-2.5 py-1.5">
                                <svg className="w-3.5 h-3.5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                                <span className="text-[11px] font-bold text-yellow-700">{activeHighlightIdx + 1}/{highlightRefs.current.filter(Boolean).length || highlightChunks.length}</span>
                                <button
                                    onClick={() => jumpToHighlight(Math.max(0, activeHighlightIdx - 1))}
                                    className="p-0.5 hover:bg-yellow-200 rounded transition-colors text-yellow-600"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                </button>
                                <button
                                    onClick={() => jumpToHighlight(Math.min((highlightRefs.current.filter(Boolean).length || highlightChunks.length) - 1, activeHighlightIdx + 1))}
                                    className="p-0.5 hover:bg-yellow-200 rounded transition-colors text-yellow-600"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                            </div>
                        )}

                        {/* Download */}
                        {activeSourceTab && (
                            <a
                                href={`${import.meta.env.VITE_RAG_API_URL || 'http://localhost:8000'}/download/${caseData._id}/${encodeURIComponent(activeSourceTab)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-slate-400 hover:text-blue-600"
                                title="Download original"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </a>
                        )}

                        {/* Text / Original toggle */}
                        {(() => {
                            const ext = activeSourceTab?.split('.').pop()?.toLowerCase() || '';
                            const isVisualFile = ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'pdf'].includes(ext);
                            if (!isVisualFile || !activeSourceTab) return null;
                            return (
                                <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                                    <button
                                        onClick={() => setSourceViewMode('text')}
                                        className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${sourceViewMode === 'text' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Text
                                    </button>
                                    <button
                                        onClick={() => setSourceViewMode('original')}
                                        className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${sourceViewMode === 'original' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Original
                                    </button>
                                </div>
                            );
                        })()}

                        {/* Close */}
                        <button
                            onClick={() => setSourcesPanelOpen(false)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* Source tabs */}
                    {uniqueSources.length > 1 && (
                        <div className="flex border-b border-slate-200 bg-slate-50/80 overflow-x-auto flex-shrink-0">
                            {uniqueSources.map(source => {
                                const count = (selectedContexts || []).filter(c => c.source === source).length;
                                return (
                                    <button
                                        key={source}
                                        onClick={() => switchSourceTab(source)}
                                        className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all flex items-center gap-2
                                            ${activeSourceTab === source
                                                ? 'border-blue-600 text-blue-700 bg-white'
                                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/50'
                                            }`}
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        <span className="truncate max-w-[120px]">{source}</span>
                                        <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full px-1.5 py-0.5">{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Matched chunks summary bar */}
                    {activeChunks.length > 0 && !docLoading && (
                        <div className="px-4 py-2.5 bg-amber-50/80 border-b border-amber-100 flex-shrink-0">
                            <div className="flex items-center gap-2 text-[11px] text-amber-700">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" /></svg>
                                <span className="font-semibold">{activeChunks.length} matching passage{activeChunks.length > 1 ? 's' : ''} highlighted below</span>
                                {activeChunks[0]?.metadata?.page_number != null && (
                                    <span className="ml-auto bg-white border border-amber-200 rounded px-1.5 py-0.5 text-[10px] font-medium">
                                        Page {activeChunks.map(c => c.metadata?.page_number).filter(Boolean).join(', ')}
                                    </span>
                                )}
                            </div>
                            {/* Highlight legend */}
                            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500">
                                <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm bg-yellow-200 border border-yellow-300"></span> AI source</span>
                                {selectionHighlight && (
                                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm bg-purple-200 border border-purple-300"></span> Your selection</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Document content */}
                    <div ref={docViewerRef} className="flex-1 overflow-y-auto">
                        {sourceViewMode === 'original' && activeSourceTab ? (
                            (() => {
                                const ext = activeSourceTab.split('.').pop()?.toLowerCase() || '';
                                const downloadUrl = `${import.meta.env.VITE_RAG_API_URL || 'http://localhost:8000'}/download/${caseData._id}/${encodeURIComponent(activeSourceTab)}`;
                                const isImage = ['jpg', 'jpeg', 'png', 'bmp', 'tiff'].includes(ext);
                                if (isImage) {
                                    return (
                                        <div className="p-4 flex items-center justify-center">
                                            <img src={downloadUrl} alt={activeSourceTab} className="max-w-full h-auto rounded-lg shadow-sm border border-slate-200" />
                                        </div>
                                    );
                                }
                                return (
                                    <iframe src={downloadUrl} title={activeSourceTab} className="w-full h-full border-0" />
                                );
                            })()
                        ) : docLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="w-10 h-10 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                                <p className="text-sm text-slate-400 font-medium">Loading document...</p>
                            </div>
                        ) : documentText.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 px-8">
                                <svg className="w-12 h-12 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                <p className="text-sm font-medium text-center">Select text in a response and click "Check Sources" to view the source document here.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {documentText.map((page, pageIdx) => (
                                    <div key={pageIdx} className="relative">
                                        {/* Page header */}
                                        {page.page_number != null && (
                                            <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-5 py-1.5 flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Page {page.page_number}</span>
                                                {page.file_type && (
                                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">{page.file_type}</span>
                                                )}
                                            </div>
                                        )}
                                        {/* Page text with highlights */}
                                        <div className="px-5 py-4 text-[13px] leading-7 text-slate-700 font-[Georgia,_'Times_New_Roman',_serif] whitespace-pre-wrap break-words">
                                            {renderDocumentWithHighlights(page.text, highlightChunks)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Check Sources Tooltip (floating on text selection) */}
            {selectionCoords && selectedContexts && (
                <div
                    className="fixed z-50 transform -translate-x-1/2 -translate-y-[120%] bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold py-2.5 px-5 rounded-xl shadow-2xl cursor-pointer hover:bg-slate-800 transition-all animate-in fade-in zoom-in-95 duration-200 border border-white/10 ring-1 ring-black/20"
                    style={{ top: selectionCoords.y, left: selectionCoords.x }}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openSourcesPanel(selectedContexts);
                        setSelectionCoords(null);
                    }}
                >
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                        Check Sources <span className="opacity-60 font-normal">({selectedContexts.length})</span>
                    </div>
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900/90 backdrop-blur-md rotate-45 border-r border-b border-white/10"></div>
                </div>
            )}

            {/* Custom Instructions Modal (#26) */}
            <CustomInstructionsModal
                open={showCustomInstructions}
                onClose={() => setShowCustomInstructions(false)}
            />

            {/* Keyboard Shortcuts Overlay */}
            {showShortcuts && (
                <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center" onClick={() => setShowShortcuts(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 max-w-[90vw]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900">Keyboard Shortcuts</h3>
                            <button onClick={() => setShowShortcuts(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="space-y-2.5">
                            {SHORTCUTS.map((s, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600">{s.description}</span>
                                    <div className="flex gap-1">
                                        {s.keys.map((k, j) => (
                                            <kbd key={j} className="px-2 py-0.5 text-[11px] font-mono bg-slate-100 text-slate-600 rounded border border-slate-200 shadow-sm">{k}</kbd>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CaseChat;
