import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import caseLawService from '../services/caseLawService';
import type { CaseLawDocument, CaseLawMeta } from '../services/caseLawService';
import toast from 'react-hot-toast';

interface CaseLawDocViewerProps {
    docId: number;
    title: string;
    onClose: () => void;
    onNavigateDoc?: (docId: number, title: string) => void;
}

const CaseLawDocViewer: React.FC<CaseLawDocViewerProps> = ({ docId, title, onClose, onNavigateDoc }) => {
    const { t } = useTranslation();
    const [docContent, setDocContent] = useState<CaseLawDocument | null>(null);
    const [docMeta, setDocMeta] = useState<CaseLawMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [activePanel, setActivePanel] = useState<'doc' | 'meta'>('doc');
    const [fontSize, setFontSize] = useState(15);
    const contentRef = useRef<HTMLDivElement>(null);
    const [navHistory, setNavHistory] = useState<{ id: number; title: string }[]>([]);

    const fetchDoc = useCallback(async (id: number) => {
        setLoading(true);
        setDocContent(null);
        setDocMeta(null);
        try {
            const [doc, meta] = await Promise.all([
                caseLawService.getDocument(id),
                caseLawService.getDocMeta(id),
            ]);
            setDocContent(doc);
            setDocMeta(meta);
        } catch {
            toast.error(t('caseLaw.docError'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchDoc(docId);
    }, [docId, fetchDoc]);

    // Intercept clicks on Indian Kanoon links inside the document
    useEffect(() => {
        const container = contentRef.current;
        if (!container) return;

        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const anchor = target.closest('a');
            if (!anchor) return;

            // Always prevent default — no link inside the doc should navigate our app
            e.preventDefault();
            e.stopPropagation();

            const href = anchor.getAttribute('href') || '';
            // Match IK doc links: /doc/12345/ or indiankanoon.org/doc/12345
            const match = href.match(/\/doc\/(\d+)\/?/);
            if (match) {
                const newDocId = parseInt(match[1], 10);
                const linkTitle = anchor.textContent || `Document ${newDocId}`;
                // Push current to history
                setNavHistory(prev => [...prev, { id: docId, title }]);
                if (onNavigateDoc) {
                    onNavigateDoc(newDocId, linkTitle);
                } else {
                    // Internal navigation
                    fetchDoc(newDocId);
                }
            } else if (href.startsWith('http')) {
                // Absolute URLs (including rewritten IK links) — open in new tab
                window.open(href, '_blank', 'noopener,noreferrer');
            } else if (href.startsWith('/')) {
                // Relative links that weren't rewritten — open on Indian Kanoon
                window.open(`https://indiankanoon.org${href}`, '_blank', 'noopener,noreferrer');
            } else if (href && !href.startsWith('#') && !href.startsWith('javascript')) {
                // Any other relative link (no leading slash) — open on Indian Kanoon
                window.open(`https://indiankanoon.org/${href}`, '_blank', 'noopener,noreferrer');
            }
        };

        container.addEventListener('click', handleClick);
        return () => container.removeEventListener('click', handleClick);
    }, [docId, title, onNavigateDoc, fetchDoc]);

    const handleBack = () => {
        if (navHistory.length === 0) return;
        const prev = navHistory[navHistory.length - 1];
        setNavHistory(h => h.slice(0, -1));
        if (onNavigateDoc) {
            onNavigateDoc(prev.id, prev.title);
        } else {
            fetchDoc(prev.id);
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow || !docContent) return;
        printWindow.document.write(`
            <!DOCTYPE html>
            <html><head><title>${docMeta?.title || title}</title>
            <style>
                body { font-family: Georgia, 'Times New Roman', serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.8; color: #1a1a1a; font-size: 14px; }
                h1,h2,h3 { font-family: system-ui, sans-serif; }
                a { color: #1d4ed8; }
                .doc_title { font-size: 1.3em; font-weight: bold; margin-bottom: 16px; }
                .doc_bench, .doc_author { color: #555; font-style: italic; margin-bottom: 8px; }
                p { margin: 0.8em 0; text-align: justify; }
                @media print { body { margin: 0; } }
            </style></head><body>${docContent.doc}</body></html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    const handleCopyText = async () => {
        if (!docContent) return;
        const tmp = document.createElement('div');
        tmp.innerHTML = docContent.doc;
        const text = tmp.textContent || tmp.innerText || '';
        try {
            await navigator.clipboard.writeText(text);
            toast.success(t('caseLaw.textCopied'));
        } catch {
            toast.error('Copy failed');
        }
    };

    // Process doc HTML to improve formatting
    const processDocHtml = (html: string): string => {
        if (!html) return '';
        let processed = html;

        // Convert ALL relative href links to absolute Indian Kanoon URLs.
        // Matches href="/" or href="/doc/..." or href="/search?..." etc.
        processed = processed.replace(
            /href="(\/[^"]*?)"/g,
            'href="https://indiankanoon.org$1"'
        );

        // Also catch relative links without leading slash (e.g. href="search?..." or href="doc/123")
        // but skip http/https, mailto:, javascript:, and # anchors
        processed = processed.replace(
            /href="(?!https?:\/\/|mailto:|javascript:|#)([^"]+)"/g,
            'href="https://indiankanoon.org/$1"'
        );

        // Add target blank to all external links so they open in new tabs
        processed = processed.replace(
            /href="(https?:\/\/[^"]+)"/g,
            'href="$1" target="_blank" rel="noopener noreferrer"'
        );

        return processed;
    };

    const displayTitle = docMeta?.title || title;

    return (
        <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="ml-auto relative bg-white w-full max-w-4xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
                {/* Sticky Header */}
                <div className="flex-shrink-0 bg-white border-b border-slate-200 z-10">
                    {/* Top bar */}
                    <div className="px-6 py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            {navHistory.length > 0 && (
                                <button
                                    onClick={handleBack}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
                                    title="Back"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                            )}
                            <div className="min-w-0 flex-1">
                                <h2
                                    className="text-base font-bold text-slate-900 truncate"
                                    dangerouslySetInnerHTML={{ __html: displayTitle }}
                                />
                                {docMeta && (
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        {docMeta.docsource && (
                                            <span className="text-xs font-medium text-blue-600">{docMeta.docsource}</span>
                                        )}
                                        {docMeta.publishdate && (
                                            <span className="text-xs text-slate-400">{docMeta.publishdate}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Font size */}
                            <button
                                onClick={() => setFontSize(s => Math.max(12, s - 1))}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title={t('caseLaw.decreaseFont')}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                                </svg>
                            </button>
                            <span className="text-xs text-slate-400 w-8 text-center">{fontSize}</span>
                            <button
                                onClick={() => setFontSize(s => Math.min(22, s + 1))}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title={t('caseLaw.increaseFont')}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                            </button>

                            <div className="w-px h-5 bg-slate-200 mx-1" />

                            {/* Copy */}
                            <button
                                onClick={handleCopyText}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title={t('caseLaw.copyText')}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>

                            {/* Print */}
                            <button
                                onClick={handlePrint}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title={t('caseLaw.print')}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                            </button>

                            {/* Open on IK */}
                            <a
                                href={`https://indiankanoon.org/doc/${docId}/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title={t('caseLaw.openOnIK')}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>

                            <div className="w-px h-5 bg-slate-200 mx-1" />

                            {/* Close */}
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Tab bar: Document / Metadata */}
                    <div className="px-6 flex gap-6 border-t border-slate-100">
                        <button
                            onClick={() => setActivePanel('doc')}
                            className={`py-2.5 text-sm font-medium border-b-2 transition-colors ${activePanel === 'doc' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            {t('caseLaw.documentTab')}
                        </button>
                        <button
                            onClick={() => setActivePanel('meta')}
                            className={`py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activePanel === 'meta' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            {t('caseLaw.metadataTab')}
                            {docMeta && (docMeta.citations?.length || docMeta.citedby?.length) ? (
                                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                    {(docMeta.citations?.length || 0) + (docMeta.citedby?.length || 0)}
                                </span>
                            ) : null}
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 gap-4">
                            <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                            <p className="text-sm text-slate-500">{t('caseLaw.loadingDocument')}</p>
                        </div>
                    ) : activePanel === 'doc' ? (
                        /* Document Content */
                        docContent ? (
                            <div className="max-w-3xl mx-auto px-8 py-8">
                                {/* Metadata summary card */}
                                {docMeta && (
                                    <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                                            {docMeta.bench && (
                                                <div>
                                                    <span className="text-slate-400 font-medium">{t('caseLaw.bench')}: </span>
                                                    <span className="text-slate-700">{docMeta.bench}</span>
                                                </div>
                                            )}
                                            {docMeta.author && (
                                                <div>
                                                    <span className="text-slate-400 font-medium">{t('caseLaw.author')}: </span>
                                                    <span className="text-slate-700">{docMeta.author}</span>
                                                </div>
                                            )}
                                            {docMeta.publishdate && (
                                                <div>
                                                    <span className="text-slate-400 font-medium">{t('caseLaw.date')}: </span>
                                                    <span className="text-slate-700">{docMeta.publishdate}</span>
                                                </div>
                                            )}
                                            {docMeta.numcites != null && (
                                                <div>
                                                    <span className="text-slate-400 font-medium">{t('caseLaw.cites')}: </span>
                                                    <span className="text-slate-700">{docMeta.numcites}</span>
                                                </div>
                                            )}
                                            {docMeta.numcitedby != null && (
                                                <div>
                                                    <span className="text-slate-400 font-medium">{t('caseLaw.citedBy')}: </span>
                                                    <span className="text-slate-700">{docMeta.numcitedby}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Document body */}
                                <div
                                    ref={contentRef}
                                    className="ik-doc-content"
                                    style={{ fontSize: `${fontSize}px` }}
                                    dangerouslySetInnerHTML={{ __html: processDocHtml(docContent.doc) }}
                                />

                                {/* Attribution */}
                                <div className="mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
                                    {t('caseLaw.poweredBy')}{' '}
                                    <a href="https://indiankanoon.org" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-medium">
                                        Indian Kanoon
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-32 gap-3">
                                <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <p className="text-slate-500 font-medium">{t('caseLaw.docError')}</p>
                            </div>
                        )
                    ) : (
                        /* Metadata Panel */
                        <div className="max-w-3xl mx-auto px-8 py-8 space-y-8">
                            {/* Case Info */}
                            {docMeta && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">{t('caseLaw.caseInfo')}</h3>
                                        <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-200">
                                            {docMeta.title && (
                                                <div className="px-4 py-3 flex gap-4">
                                                    <span className="text-sm text-slate-400 font-medium w-24 flex-shrink-0">{t('caseLaw.titleLabel')}</span>
                                                    <span className="text-sm text-slate-900 font-medium" dangerouslySetInnerHTML={{ __html: docMeta.title }} />
                                                </div>
                                            )}
                                            {docMeta.docsource && (
                                                <div className="px-4 py-3 flex gap-4">
                                                    <span className="text-sm text-slate-400 font-medium w-24 flex-shrink-0">{t('caseLaw.court')}</span>
                                                    <span className="text-sm text-slate-700">{docMeta.docsource}</span>
                                                </div>
                                            )}
                                            {docMeta.bench && (
                                                <div className="px-4 py-3 flex gap-4">
                                                    <span className="text-sm text-slate-400 font-medium w-24 flex-shrink-0">{t('caseLaw.bench')}</span>
                                                    <span className="text-sm text-slate-700">{docMeta.bench}</span>
                                                </div>
                                            )}
                                            {docMeta.author && (
                                                <div className="px-4 py-3 flex gap-4">
                                                    <span className="text-sm text-slate-400 font-medium w-24 flex-shrink-0">{t('caseLaw.author')}</span>
                                                    <span className="text-sm text-slate-700">{docMeta.author}</span>
                                                </div>
                                            )}
                                            {docMeta.publishdate && (
                                                <div className="px-4 py-3 flex gap-4">
                                                    <span className="text-sm text-slate-400 font-medium w-24 flex-shrink-0">{t('caseLaw.date')}</span>
                                                    <span className="text-sm text-slate-700">{docMeta.publishdate}</span>
                                                </div>
                                            )}
                                            {docMeta.doctype && (
                                                <div className="px-4 py-3 flex gap-4">
                                                    <span className="text-sm text-slate-400 font-medium w-24 flex-shrink-0">{t('caseLaw.docType')}</span>
                                                    <span className="text-sm text-slate-700 capitalize">{docMeta.doctype}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Citations (cases this judgment cites) */}
                                    {docMeta.citations && docMeta.citations.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                </svg>
                                                {t('caseLaw.casesReferredTo')} ({docMeta.citations.length})
                                            </h3>
                                            <div className="space-y-1">
                                                {docMeta.citations.map((c, i) => (
                                                    <button
                                                        key={c.tid || i}
                                                        onClick={() => {
                                                            setNavHistory(prev => [...prev, { id: docId, title }]);
                                                            if (onNavigateDoc) {
                                                                onNavigateDoc(c.tid, c.title);
                                                            } else {
                                                                fetchDoc(c.tid);
                                                            }
                                                        }}
                                                        className="w-full text-left px-4 py-2.5 rounded-lg hover:bg-blue-50 transition-colors group flex items-start gap-3"
                                                    >
                                                        <span className="text-xs text-slate-300 font-mono mt-0.5 flex-shrink-0 w-6">{i + 1}.</span>
                                                        <span className="text-sm text-slate-700 group-hover:text-blue-700 leading-snug" dangerouslySetInnerHTML={{ __html: c.title }} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Cited By (cases that cite this judgment) */}
                                    {docMeta.citedby && docMeta.citedby.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                </svg>
                                                {t('caseLaw.citedByLabel')} ({docMeta.citedby.length})
                                            </h3>
                                            <div className="space-y-1">
                                                {docMeta.citedby.map((c, i) => (
                                                    <button
                                                        key={c.tid || i}
                                                        onClick={() => {
                                                            setNavHistory(prev => [...prev, { id: docId, title }]);
                                                            if (onNavigateDoc) {
                                                                onNavigateDoc(c.tid, c.title);
                                                            } else {
                                                                fetchDoc(c.tid);
                                                            }
                                                        }}
                                                        className="w-full text-left px-4 py-2.5 rounded-lg hover:bg-emerald-50 transition-colors group flex items-start gap-3"
                                                    >
                                                        <span className="text-xs text-slate-300 font-mono mt-0.5 flex-shrink-0 w-6">{i + 1}.</span>
                                                        <span className="text-sm text-slate-700 group-hover:text-emerald-700 leading-snug" dangerouslySetInnerHTML={{ __html: c.title }} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* No citations */}
                                    {(!docMeta.citations || docMeta.citations.length === 0) && (!docMeta.citedby || docMeta.citedby.length === 0) && (
                                        <div className="text-center py-12 text-slate-400">
                                            <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                            </svg>
                                            <p className="text-sm">{t('caseLaw.noCitations')}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Custom styles for Indian Kanoon HTML */}
            <style>{`
                .ik-doc-content {
                    font-family: Georgia, 'Times New Roman', 'Noto Serif', serif;
                    line-height: 1.9;
                    color: #1e293b;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                }

                .ik-doc-content .doc_title,
                .ik-doc-content .docsource_main {
                    font-family: system-ui, -apple-system, sans-serif;
                    font-size: 1.25em;
                    font-weight: 700;
                    color: #0f172a;
                    margin-bottom: 12px;
                    line-height: 1.4;
                }

                .ik-doc-content .doc_bench,
                .ik-doc-content .doc_author {
                    font-style: italic;
                    color: #64748b;
                    margin-bottom: 8px;
                    font-size: 0.95em;
                }

                .ik-doc-content .doc_citations {
                    background: #f8fafc;
                    border-left: 3px solid #3b82f6;
                    padding: 12px 16px;
                    margin: 16px 0;
                    border-radius: 0 8px 8px 0;
                    font-size: 0.9em;
                }

                .ik-doc-content p {
                    margin: 0.75em 0;
                    text-align: justify;
                }

                .ik-doc-content a {
                    color: #2563eb;
                    text-decoration: none;
                    border-bottom: 1px solid #93c5fd;
                    transition: all 0.15s;
                    cursor: pointer;
                }

                .ik-doc-content a:hover {
                    color: #1d4ed8;
                    border-bottom-color: #2563eb;
                    background: #eff6ff;
                    border-radius: 2px;
                    padding: 0 2px;
                    margin: 0 -2px;
                }

                .ik-doc-content blockquote {
                    border-left: 3px solid #cbd5e1;
                    padding-left: 16px;
                    margin: 16px 0;
                    color: #475569;
                    font-style: italic;
                }

                .ik-doc-content pre {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 16px;
                    overflow-x: auto;
                    font-size: 0.85em;
                    line-height: 1.6;
                }

                .ik-doc-content table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 16px 0;
                    font-size: 0.9em;
                }

                .ik-doc-content th,
                .ik-doc-content td {
                    border: 1px solid #e2e8f0;
                    padding: 8px 12px;
                    text-align: left;
                }

                .ik-doc-content th {
                    background: #f8fafc;
                    font-weight: 600;
                }

                .ik-doc-content h2,
                .ik-doc-content h3,
                .ik-doc-content h4 {
                    font-family: system-ui, -apple-system, sans-serif;
                    color: #0f172a;
                    margin-top: 1.5em;
                    margin-bottom: 0.5em;
                }

                .ik-doc-content h2 { font-size: 1.2em; }
                .ik-doc-content h3 { font-size: 1.1em; }
                .ik-doc-content h4 { font-size: 1.05em; }

                .ik-doc-content b,
                .ik-doc-content strong {
                    color: #0f172a;
                }

                .ik-doc-content .hidden_text {
                    display: none;
                }

                .ik-doc-content .ad_doc {
                    display: none;
                }

                /* IK paragraph numbering */
                .ik-doc-content .judgments .s_number {
                    font-weight: 700;
                    color: #3b82f6;
                    margin-right: 4px;
                }

                /* Indian Kanoon section separators */
                .ik-doc-content hr {
                    border: none;
                    border-top: 1px solid #e2e8f0;
                    margin: 24px 0;
                }

                /* Lists */
                .ik-doc-content ol,
                .ik-doc-content ul {
                    padding-left: 24px;
                    margin: 12px 0;
                }

                .ik-doc-content li {
                    margin: 4px 0;
                }
            `}</style>
        </div>
    );
};

export default CaseLawDocViewer;
