import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import caseLawService from '../../services/caseLawService';
import type { CaseLawSearchDoc, CaseLawBookmark } from '../../services/caseLawService';
import CaseLawDocViewer from '../../components/CaseLawDocViewer';
import TransliterateInput from '../../components/TransliterateInput';
import toast from 'react-hot-toast';

const SearchIcon = () => (
    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const LinkIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
);

const CloseIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const ExternalLinkIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
);

const SparklesIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
);

const CasePrecedents: React.FC = () => {
    const { t } = useTranslation();
    const { id: caseId } = useParams<{ id: string }>();
    // @ts-ignore
    const { caseData } = useOutletContext<{ caseData: any }>();

    // Manual search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<CaseLawSearchDoc[]>([]);
    const [searching, setSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // AI-suggested precedents (embedding-based)
    const [suggestedResults, setSuggestedResults] = useState<CaseLawSearchDoc[]>([]);
    const [suggestedQueries, setSuggestedQueries] = useState<string[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [suggestionError, setSuggestionError] = useState<string | null>(null);
    const [hasSuggested, setHasSuggested] = useState(false);

    // Linked precedents (bookmarks for this case)
    const [linkedPrecedents, setLinkedPrecedents] = useState<CaseLawBookmark[]>([]);
    const [loadingLinked, setLoadingLinked] = useState(true);
    const [linkedDocIds, setLinkedDocIds] = useState<Set<number>>(new Set());

    // Document viewer
    const [selectedDoc, setSelectedDoc] = useState<{ id: number; title: string } | null>(null);

    // Fetch linked precedents
    useEffect(() => {
        if (!caseId) return;
        fetchLinkedPrecedents();
    }, [caseId]);

    // Auto-suggest from embeddings on mount
    useEffect(() => {
        if (caseId && !hasSuggested) {
            handleFindPrecedents();
        }
    }, [caseId]);

    const fetchLinkedPrecedents = async () => {
        setLoadingLinked(true);
        try {
            const data = await caseLawService.getBookmarks(caseId);
            setLinkedPrecedents(data);
            setLinkedDocIds(new Set(data.map(b => b.docId)));
        } catch (error) {
            console.error("Failed to fetch linked precedents", error);
        } finally {
            setLoadingLinked(false);
        }
    };

    const handleFindPrecedents = async () => {
        if (!caseId) return;
        setLoadingSuggestions(true);
        setSuggestionError(null);
        setHasSuggested(true);
        try {
            const result = await caseLawService.findPrecedents(caseId);
            setSuggestedResults(result.docs || []);
            setSuggestedQueries(result.queries || []);
        } catch (error: any) {
            console.error("Find precedents failed", error);
            const detail = error?.response?.data?.detail;
            if (detail?.includes("No document embeddings")) {
                setSuggestionError(t('caseLaw.noEmbeddings'));
            } else {
                setSuggestionError(t('caseLaw.suggestError'));
            }
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const handleSearch = useCallback(async (queryOverride?: string) => {
        const q = queryOverride || searchQuery;
        if (!q.trim()) return;
        setSearching(true);
        setHasSearched(true);
        try {
            const result = await caseLawService.searchCases({ formInput: q, pagenum: 0 });
            setSearchResults(result.docs || []);
        } catch (error) {
            console.error("Search failed", error);
            toast.error(t('caseLaw.searchError'));
        } finally {
            setSearching(false);
        }
    }, [searchQuery, t]);

    const handleLinkPrecedent = async (doc: CaseLawSearchDoc) => {
        if (!caseId) return;
        try {
            await caseLawService.bookmarkCase({
                docId: doc.tid,
                title: doc.title?.replace(/<[^>]*>/g, '') || '',
                court: doc.docsource || '',
                date: doc.publishdate || '',
                caseId,
            });
            setLinkedDocIds(prev => new Set(prev).add(doc.tid));
            fetchLinkedPrecedents();
            toast.success(t('caseLaw.precedentLinked'));
        } catch (error: any) {
            if (error?.response?.status === 409) {
                toast.error(t('caseLaw.alreadyBookmarked'));
            } else {
                toast.error(t('caseLaw.bookmarkError'));
            }
        }
    };

    const handleUnlinkPrecedent = async (docId: number) => {
        try {
            await caseLawService.removeBookmark(docId);
            setLinkedDocIds(prev => {
                const next = new Set(prev);
                next.delete(docId);
                return next;
            });
            setLinkedPrecedents(prev => prev.filter(b => b.docId !== docId));
            toast.success(t('caseLaw.precedentUnlinked'));
        } catch {
            toast.error(t('caseLaw.bookmarkError'));
        }
    };

    const handleViewDoc = (docId: number, title: string) => {
        setSelectedDoc({ id: docId, title });
    };

    const renderDocCard = (doc: CaseLawSearchDoc, matchedQuery?: string) => (
        <div key={doc.tid} className="p-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <h4
                        className="font-semibold text-sm text-slate-900 hover:text-blue-600 cursor-pointer"
                        onClick={() => handleViewDoc(doc.tid, doc.title)}
                        dangerouslySetInnerHTML={{ __html: doc.title }}
                    />
                    {doc.headline && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: doc.headline }} />
                    )}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {doc.docsource && (
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{doc.docsource}</span>
                        )}
                        {doc.publishdate && <span className="text-xs text-slate-400">{doc.publishdate}</span>}
                        {matchedQuery && (
                            <span className="text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded font-medium">
                                {matchedQuery}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {linkedDocIds.has(doc.tid) ? (
                        <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded">
                            {t('caseLaw.linked')}
                        </span>
                    ) : (
                        <button
                            onClick={() => handleLinkPrecedent(doc)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                            <LinkIcon /> {t('caseLaw.link')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
                {/* Linked Precedents */}
                <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3">{t('caseLaw.linkedPrecedents')}</h3>
                    {loadingLinked ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-8 h-8 border-3 border-slate-200 border-t-slate-600 rounded-full animate-spin"></div>
                        </div>
                    ) : linkedPrecedents.length > 0 ? (
                        <div className="space-y-2">
                            {linkedPrecedents.map((bm) => (
                                <div key={bm._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-white transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <h4
                                            className="font-semibold text-slate-900 text-sm hover:text-blue-600 cursor-pointer truncate"
                                            onClick={() => handleViewDoc(bm.docId, bm.title)}
                                        >
                                            {bm.title}
                                        </h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            {bm.court && (
                                                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{bm.court}</span>
                                            )}
                                            {bm.date && <span className="text-xs text-slate-400">{bm.date}</span>}
                                        </div>
                                        {bm.notes && <p className="text-xs text-slate-500 mt-1 italic">"{bm.notes}"</p>}
                                    </div>
                                    <div className="flex items-center gap-1 ml-3">
                                        <button
                                            onClick={() => handleViewDoc(bm.docId, bm.title)}
                                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition-colors"
                                            title={t('caseLaw.viewDocument')}
                                        >
                                            <ExternalLinkIcon />
                                        </button>
                                        <button
                                            onClick={() => handleUnlinkPrecedent(bm.docId)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                                            title={t('caseLaw.unlinkPrecedent')}
                                        >
                                            <CloseIcon />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                            <p className="text-sm text-slate-500">{t('caseLaw.noPrecedentsLinked')}</p>
                            <p className="text-xs text-slate-400 mt-1">{t('caseLaw.searchToLink')}</p>
                        </div>
                    )}
                </div>

                {/* AI-Suggested Precedents (embedding-based) */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <SparklesIcon />
                            {t('caseLaw.aiSuggested')}
                        </h3>
                        {hasSuggested && !loadingSuggestions && (
                            <button
                                onClick={handleFindPrecedents}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                {t('caseLaw.refresh')}
                            </button>
                        )}
                    </div>

                    {loadingSuggestions ? (
                        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-100 p-8 text-center">
                            <div className="w-10 h-10 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3"></div>
                            <p className="text-sm font-medium text-purple-700">{t('caseLaw.analyzingDocuments')}</p>
                            <p className="text-xs text-purple-500 mt-1">{t('caseLaw.analyzingDescription')}</p>
                        </div>
                    ) : suggestionError ? (
                        <div className="bg-amber-50 rounded-xl border border-amber-200 p-6 text-center">
                            <svg className="w-8 h-8 text-amber-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                            <p className="text-sm text-amber-700">{suggestionError}</p>
                            <p className="text-xs text-amber-500 mt-1">{t('caseLaw.useManualSearch')}</p>
                        </div>
                    ) : suggestedResults.length > 0 ? (
                        <div>
                            {/* Show the generated queries as tags */}
                            {suggestedQueries.length > 0 && (
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                    <span className="text-xs text-slate-400 font-medium">{t('caseLaw.queriesUsed')}:</span>
                                    {suggestedQueries.map((q, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                setSearchQuery(q);
                                                handleSearch(q);
                                            }}
                                            className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
                                            title={t('caseLaw.clickToSearch')}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="border border-purple-200 rounded-xl overflow-hidden bg-white">
                                <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-purple-100">
                                    <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                                        <SparklesIcon />
                                        {t('caseLaw.suggestedPrecedents')} ({suggestedResults.length})
                                    </h4>
                                </div>
                                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                                    {suggestedResults.map((doc) =>
                                        renderDocCard(doc, (doc as any)._matched_query)
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : hasSuggested ? (
                        <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-6 text-center">
                            <p className="text-sm text-slate-500">{t('caseLaw.noSuggestionsFound')}</p>
                        </div>
                    ) : null}
                </div>

                {/* Manual Search */}
                <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3">{t('caseLaw.manualSearch')}</h3>
                    <div className="flex gap-3">
                        <div className="flex-grow relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchIcon />
                            </div>
                            <TransliterateInput
                                value={searchQuery}
                                onChangeText={(text) => setSearchQuery(text)}
                                placeholder={t('caseLaw.searchPlaceholder')}
                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-200 focus:border-slate-300 text-sm transition-all"
                                onKeyDown={(e: React.KeyboardEvent) => {
                                    if (e.key === 'Enter') handleSearch();
                                }}
                            />
                        </div>
                        <button
                            onClick={() => handleSearch()}
                            disabled={searching || !searchQuery.trim()}
                            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 text-sm flex items-center gap-2"
                        >
                            {searching ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <SearchIcon />
                            )}
                            {t('caseLaw.searchBtn')}
                        </button>
                    </div>
                </div>

                {/* Manual Search Results */}
                {(searching || searchResults.length > 0 || hasSearched) && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                            <h4 className="font-semibold text-slate-900 text-sm">{t('caseLaw.searchResults')}</h4>
                        </div>
                        <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                            {searching ? (
                                <div className="p-6 text-center">
                                    <div className="w-8 h-8 border-3 border-slate-200 border-t-slate-600 rounded-full animate-spin mx-auto mb-2"></div>
                                    <p className="text-sm text-slate-500">{t('caseLaw.searching')}</p>
                                </div>
                            ) : searchResults.length > 0 ? (
                                searchResults.map((doc) => renderDocCard(doc))
                            ) : hasSearched ? (
                                <div className="p-6 text-center text-sm text-slate-500">{t('caseLaw.noResults')}</div>
                            ) : null}
                        </div>
                    </div>
                )}

                {/* Attribution */}
                <div className="text-center text-xs text-slate-400 pt-2">
                    {t('caseLaw.poweredBy')}{' '}
                    <a href="https://indiankanoon.org" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-medium">
                        Indian Kanoon
                    </a>
                </div>
            </div>

            {/* Document Viewer */}
            {selectedDoc && (
                <CaseLawDocViewer
                    docId={selectedDoc.id}
                    title={selectedDoc.title}
                    onClose={() => setSelectedDoc(null)}
                    onNavigateDoc={(id, t) => setSelectedDoc({ id, title: t })}
                />
            )}
        </div>
    );
};

export default CasePrecedents;
