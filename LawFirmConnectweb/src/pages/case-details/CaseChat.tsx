import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import ragService from '../../services/ragService';
import ReactMarkdown from 'react-markdown';

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

interface Message {
    id: number;
    sender: string;
    avatar?: string;
    content: string;
    time: string;
    isUser: boolean;
    contexts?: ContextItem[];
}

interface Session {
    session_id: string;
    title: string;
    created_at: string;
}

interface DocPage {
    text: string;
    page_number?: number;
    file_type?: string;
}

const CaseChat: React.FC = () => {
    // @ts-ignore
    const { caseData } = useOutletContext<{ caseData: CaseData }>();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Session State
    const [sessions, setSessions] = useState<Session[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);

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
    const highlightRefs = useRef<(HTMLElement | null)[]>([]);
    const selectionRef = useRef<HTMLElement | null>(null); // ref for blue selection highlight
    const docViewerRef = useRef<HTMLDivElement>(null);

    // Highlighted citation index
    const [highlightedCitation, setHighlightedCitation] = useState<number | null>(null);

    // Jaccard similarity
    const computeJaccard = (textA: string, textB: string): number => {
        const tokenize = (t: string) => new Set(t.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean));
        const setA = tokenize(textA);
        const setB = tokenize(textB);
        if (setA.size === 0 || setB.size === 0) return 0;
        let intersection = 0;
        setA.forEach(w => { if (setB.has(w)) intersection++; });
        return intersection / (setA.size + setB.size - intersection);
    };

    // ---- Sessions ----
    useEffect(() => {
        const loadSessions = async () => {
            if (!caseData?._id) return;
            try {
                const fetchedSessions = await ragService.getSessions(caseData._id);
                if (fetchedSessions && fetchedSessions.length > 0) {
                    setSessions(fetchedSessions);
                    setCurrentSessionId(fetchedSessions[0].session_id);
                } else {
                    await handleCreateSession();
                }
            } catch (error) {
                console.error("Error loading sessions", error);
            }
        };
        loadSessions();
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
        if (!caseData?._id) return;
        try {
            const newSession = await ragService.createSession(caseData._id, `Chat ${sessions.length + 1}`);
            setSessions([newSession, ...sessions]);
            setCurrentSessionId(newSession.session_id);
            setMessages([]);
        } catch (error) {
            console.error("Failed to create session", error);
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
        const selWords = selection.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
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
                if (selSet.has(words[j].toLowerCase().replace(/[^\w]/g, ''))) overlap++;
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

    const handleSendMessage = async () => {
        if (!inputValue.trim() || !currentSessionId) return;
        const newUserMsg: Message = {
            id: Date.now(),
            sender: 'You',
            content: inputValue,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isUser: true
        };
        setMessages(prev => [...prev, newUserMsg]);
        setInputValue('');
        setIsLoading(true);
        try {
            const responseData = await ragService.chat(caseData._id, newUserMsg.content, 5, currentSessionId);
            const botMsg: Message = {
                id: Date.now() + 1,
                sender: 'AI Assistant',
                avatar: 'https://ui-avatars.com/api/?name=AI&background=0D8ABC&color=fff',
                content: responseData.answer,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isUser: false,
                contexts: responseData.contexts
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error("Error sending message:", error);
            setMessages(prev => [...prev, {
                id: Date.now() + 1, sender: 'System',
                content: "Sorry, I encountered an error processing your request.",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isUser: false
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
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
                This channel is encrypted and Attorney-Client Privileged.
            </div>

            {/* Main layout */}
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden h-[calc(100vh-140px)]">

                {/* SESSIONS SIDEBAR (left) */}
                <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 overflow-hidden`}>
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-bold text-slate-700 text-sm">Chats</h3>
                        <button onClick={handleCreateSession} className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors" title="New Chat">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {sessions.map(session => (
                            <button
                                key={session.session_id}
                                onClick={() => setCurrentSessionId(session.session_id)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-2.5 ${currentSessionId === session.session_id ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm ring-1 ring-blue-200' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                            >
                                <svg className={`w-4 h-4 ${currentSessionId === session.session_id ? 'text-blue-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                <span className="truncate">{session.title}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* CHAT AREA (center) */}
                <div className="flex-1 flex flex-col relative bg-slate-50/50 min-w-0">
                    {/* Toggle left sidebar */}
                    <div className="absolute top-4 left-4 z-10">
                        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 bg-white/80 backdrop-blur shadow-sm border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 transition-colors">
                            {isSidebarOpen ? (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                            )}
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth">
                        {messages.length === 0 && (
                            <div className="text-center text-slate-500 py-20 flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
                                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-600 shadow-sm border border-blue-100">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                </div>
                                <h3 className="text-slate-900 font-bold text-lg mb-1">AI Legal Assistant</h3>
                                <p className="text-slate-400 text-sm max-w-xs">Ask questions about the case, retrieve documents, or summarize facts.</p>
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex gap-4 ${msg.isUser ? 'flex-row-reverse' : ''} animate-in slide-in-from-bottom-2 fade-in duration-300 fill-mode-backwards`}
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
                                    <div
                                        onMouseUp={() => handleMouseUp(msg.contexts)}
                                        className={`
                                            p-4 rounded-2xl text-sm leading-relaxed shadow-sm relative group transition-all duration-200
                                            ${msg.isUser
                                                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-sm shadow-blue-200'
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
                                                components={{
                                                    ul: ({ node, ...props }) => <ul className="list-disc pl-4 space-y-1 my-2" {...props} />,
                                                    ol: ({ node, ...props }) => <ol className="list-decimal pl-4 space-y-1 my-2" {...props} />,
                                                    strong: ({ node, ...props }) => <strong className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors" {...props} />,
                                                    a: ({ node, ...props }) => <a className="text-blue-600 hover:underline font-medium" {...props} />,
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
                                                                            onMouseEnter={() => setHighlightedCitation(citNum)}
                                                                            onMouseLeave={() => setHighlightedCitation(null)}
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

                                        {/* Inline references */}
                                        {msg.contexts && msg.contexts.length > 0 && (
                                            <div className={`mt-3 pt-3 border-t ${msg.isUser ? 'border-white/20' : 'border-slate-100'}`}>
                                                <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${msg.isUser ? 'opacity-80' : 'text-slate-400'}`}>
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    References
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
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-4 animate-pulse">
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

                    {/* Input */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none">
                        <div className="pointer-events-auto max-w-4xl mx-auto">
                            <div className="flex items-end gap-2 bg-white/80 backdrop-blur-md p-2 rounded-3xl border border-slate-200/60 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-slate-200/40 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400">
                                <button className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors self-center">
                                    <PaperClipIcon />
                                </button>
                                <textarea
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type your message..."
                                    className="flex-1 bg-transparent max-h-32 min-h-[44px] py-3 resize-none outline-none text-sm text-slate-700 placeholder-slate-400 leading-relaxed"
                                    rows={1}
                                ></textarea>
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!inputValue.trim() || isLoading}
                                    className={`p-3 rounded-full shadow-sm transition-all flex items-center justify-center self-center mb-0.5 ${
                                        !inputValue.trim() || isLoading
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            : 'bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-200 hover:shadow-blue-300 transform hover:scale-105 active:scale-95'
                                    }`}
                                >
                                    <svg className="w-5 h-5 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ============================================================ */}
                {/* RIGHT SIDEBAR — Document Viewer with Yellow Highlights       */}
                {/* ============================================================ */}
                <div className={`${sourcesPanelOpen ? 'w-[520px]' : 'w-0'} transition-all duration-500 ease-in-out bg-white border-l border-slate-200 flex flex-col flex-shrink-0 overflow-hidden relative`}>

                    {/* Header */}
                    <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex items-center gap-3 flex-shrink-0">
                        <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-800 text-sm">Source Document</h3>
                            <p className="text-[11px] text-slate-400 truncate">{activeSourceTab || 'Select a source'}</p>
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
                        {docLoading ? (
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
        </>
    );
};

export default CaseChat;
