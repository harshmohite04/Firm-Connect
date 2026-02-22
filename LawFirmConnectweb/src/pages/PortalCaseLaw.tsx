import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import PortalLayout from '../components/PortalLayout';
import TransliterateInput from '../components/TransliterateInput';
import CaseLawDocViewer from '../components/CaseLawDocViewer';
import caseLawService from '../services/caseLawService';
import type { CaseLawSearchDoc, CaseLawBookmark } from '../services/caseLawService';
import toast from 'react-hot-toast';

// Icons
const SearchIcon = () => (
    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const BookmarkIcon = ({ filled }: { filled?: boolean }) => (
    <svg className="w-5 h-5" fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
);

const ScaleIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
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

const TagIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
);

type ActiveTab = 'search' | 'saved';

const PortalCaseLaw: React.FC = () => {
    const { t } = useTranslation();

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<CaseLawSearchDoc[]>([]);
    const [searching, setSearching] = useState(false);
    const [searchPage, setSearchPage] = useState(0);
    const [totalResults, setTotalResults] = useState(0);
    const [hasSearched, setHasSearched] = useState(false);

    // Filters
    const [courtFilter, setCourtFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Tab state
    const [activeTab, setActiveTab] = useState<ActiveTab>('search');

    // Bookmarks
    const [bookmarks, setBookmarks] = useState<CaseLawBookmark[]>([]);
    const [bookmarkedDocIds, setBookmarkedDocIds] = useState<Set<number>>(new Set());
    const [loadingBookmarks, setLoadingBookmarks] = useState(false);

    // Document viewer
    const [selectedDoc, setSelectedDoc] = useState<{ id: number; title: string } | null>(null);

    // Bookmark note modal
    const [bookmarkNoteDocId, setBookmarkNoteDocId] = useState<number | null>(null);
    const [bookmarkNoteText, setBookmarkNoteText] = useState('');
    const [bookmarkTags, setBookmarkTags] = useState('');

    // Fetch bookmarks on mount
    useEffect(() => {
        fetchBookmarks();
    }, []);

    const fetchBookmarks = async () => {
        setLoadingBookmarks(true);
        try {
            const data = await caseLawService.getBookmarks();
            setBookmarks(data);
            setBookmarkedDocIds(new Set(data.map(b => b.docId)));
        } catch (error) {
            console.error("Failed to fetch bookmarks", error);
        } finally {
            setLoadingBookmarks(false);
        }
    };

    const handleSearch = useCallback(async (page = 0) => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        setHasSearched(true);
        setSearchPage(page);
        try {
            // Convert date format from YYYY-MM-DD to DD-MM-YYYY for IK API
            let fromdate: string | undefined;
            let todate: string | undefined;
            if (dateFrom) {
                const [y, m, d] = dateFrom.split('-');
                fromdate = `${d}-${m}-${y}`;
            }
            if (dateTo) {
                const [y, m, d] = dateTo.split('-');
                todate = `${d}-${m}-${y}`;
            }

            const result = await caseLawService.searchCases({
                formInput: searchQuery + (courtFilter ? ` doctypes:${courtFilter}` : ''),
                pagenum: page,
                fromdate,
                todate,
            });
            setSearchResults(result.docs || []);
            setTotalResults(result.found || result.total || 0);
        } catch (error) {
            console.error("Search failed", error);
            toast.error(t('caseLaw.searchError'));
        } finally {
            setSearching(false);
        }
    }, [searchQuery, courtFilter, dateFrom, dateTo, t]);

    const handleBookmarkToggle = async (doc: CaseLawSearchDoc) => {
        const isBookmarked = bookmarkedDocIds.has(doc.tid);
        try {
            if (isBookmarked) {
                await caseLawService.removeBookmark(doc.tid);
                setBookmarkedDocIds(prev => {
                    const next = new Set(prev);
                    next.delete(doc.tid);
                    return next;
                });
                setBookmarks(prev => prev.filter(b => b.docId !== doc.tid));
                toast.success(t('caseLaw.bookmarkRemoved'));
            } else {
                await caseLawService.bookmarkCase({
                    docId: doc.tid,
                    title: doc.title,
                    court: doc.docsource || '',
                    date: doc.publishdate || '',
                });
                setBookmarkedDocIds(prev => new Set(prev).add(doc.tid));
                fetchBookmarks();
                toast.success(t('caseLaw.bookmarkAdded'));
            }
        } catch (error: any) {
            if (error?.response?.status === 409) {
                toast.error(t('caseLaw.alreadyBookmarked'));
            } else {
                toast.error(t('caseLaw.bookmarkError'));
            }
        }
    };

    const handleViewDoc = (docId: number, title: string) => {
        setSelectedDoc({ id: docId, title });
    };

    const handleUpdateBookmark = async (docId: number) => {
        try {
            const tags = bookmarkTags.split(',').map(t => t.trim()).filter(Boolean);
            await caseLawService.updateBookmark(docId, {
                notes: bookmarkNoteText,
                tags,
            });
            toast.success(t('caseLaw.bookmarkUpdated'));
            setBookmarkNoteDocId(null);
            setBookmarkNoteText('');
            setBookmarkTags('');
            fetchBookmarks();
        } catch {
            toast.error(t('caseLaw.bookmarkError'));
        }
    };

    return (
        <PortalLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-200 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">{t('caseLaw.title')}</h1>
                            <p className="text-slate-500 mt-2">{t('caseLaw.subtitle')}</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setActiveTab('search')}
                                className={`px-5 py-2.5 rounded-xl font-semibold transition-colors ${activeTab === 'search' ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                            >
                                {t('caseLaw.searchTab')}
                            </button>
                            <button
                                onClick={() => setActiveTab('saved')}
                                className={`px-5 py-2.5 rounded-xl font-semibold transition-colors flex items-center gap-2 ${activeTab === 'saved' ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                            >
                                <BookmarkIcon filled={activeTab === 'saved'} />
                                {t('caseLaw.savedTab')} ({bookmarks.length})
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow group">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                <SearchIcon />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{totalResults > 0 ? totalResults.toLocaleString() : '0'}</p>
                        <p className="text-sm text-slate-500 mt-1">{t('caseLaw.resultsFound')}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow group">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                                <BookmarkIcon filled />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{bookmarks.length}</p>
                        <p className="text-sm text-slate-500 mt-1">{t('caseLaw.savedCases')}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow group col-span-2 lg:col-span-1">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                <ScaleIcon />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{searchResults.length}</p>
                        <p className="text-sm text-slate-500 mt-1">{t('caseLaw.currentPage')}</p>
                    </div>
                </div>

                {activeTab === 'search' && (
                    <>
                        {/* Search Bar & Filters */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
                            <div className="flex flex-col lg:flex-row gap-4">
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
                                            if (e.key === 'Enter') handleSearch(0);
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={() => handleSearch(0)}
                                    disabled={searching || !searchQuery.trim()}
                                    className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {searching ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <SearchIcon />
                                    )}
                                    {t('caseLaw.searchBtn')}
                                </button>
                            </div>

                            {/* Filters row */}
                            <div className="flex flex-wrap gap-3 items-center">
                                <select
                                    value={courtFilter}
                                    onChange={(e) => setCourtFilter(e.target.value)}
                                    className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                >
                                    <option value="">{t('caseLaw.allCourts')}</option>
                                    <option value="supremecourt">{t('caseLaw.supremeCourt')}</option>
                                    <option value="highcourts">{t('caseLaw.highCourts')}</option>
                                    <option value="tribunals">{t('caseLaw.tribunals')}</option>
                                    <option value="districtcourts">{t('caseLaw.districtCourts')}</option>
                                </select>
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <span>{t('caseLaw.from')}</span>
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                    />
                                    <span>{t('caseLaw.to')}</span>
                                    <input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Search Results */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center text-slate-600">
                                        <ScaleIcon />
                                    </div>
                                    <h3 className="font-bold text-slate-900">{t('caseLaw.searchResults')}</h3>
                                </div>
                                {totalResults > 0 && (
                                    <span className="text-sm text-slate-500">
                                        {t('caseLaw.page')} {searchPage + 1} &middot; {totalResults.toLocaleString()} {t('caseLaw.total')}
                                    </span>
                                )}
                            </div>

                            <div className="divide-y divide-slate-100">
                                {searching ? (
                                    <div className="p-8 text-center">
                                        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-slate-600 font-medium">{t('caseLaw.searching')}</p>
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    searchResults.map((doc) => (
                                        <div key={doc.tid} className="p-5 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <h4
                                                        className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer transition-colors"
                                                        onClick={() => handleViewDoc(doc.tid, doc.title)}
                                                        dangerouslySetInnerHTML={{ __html: doc.title }}
                                                    />
                                                    {doc.headline && (
                                                        <p
                                                            className="text-sm text-slate-500 mt-1 line-clamp-2"
                                                            dangerouslySetInnerHTML={{ __html: doc.headline }}
                                                        />
                                                    )}
                                                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                                                        {doc.docsource && (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700">
                                                                {doc.docsource}
                                                            </span>
                                                        )}
                                                        {doc.publishdate && (
                                                            <span className="text-xs text-slate-400">{doc.publishdate}</span>
                                                        )}
                                                        {doc.numcitedby != null && doc.numcitedby > 0 && (
                                                            <span className="text-xs text-slate-400">
                                                                {t('caseLaw.citedBy')}: {doc.numcitedby}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button
                                                        onClick={() => handleBookmarkToggle(doc)}
                                                        className={`p-2 rounded-lg transition-colors ${bookmarkedDocIds.has(doc.tid) ? 'text-amber-500 bg-amber-50 hover:bg-amber-100' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100'}`}
                                                        title={bookmarkedDocIds.has(doc.tid) ? t('caseLaw.removeBookmark') : t('caseLaw.addBookmark')}
                                                    >
                                                        <BookmarkIcon filled={bookmarkedDocIds.has(doc.tid)} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleViewDoc(doc.tid, doc.title)}
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                        title={t('caseLaw.viewDocument')}
                                                    >
                                                        <ExternalLinkIcon />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : hasSearched ? (
                                    <div className="p-8 text-center">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <ScaleIcon />
                                        </div>
                                        <p className="font-semibold text-slate-900">{t('caseLaw.noResults')}</p>
                                        <p className="text-sm text-slate-500 mt-1">{t('caseLaw.tryDifferent')}</p>
                                    </div>
                                ) : (
                                    <div className="p-8 text-center">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <SearchIcon />
                                        </div>
                                        <p className="font-semibold text-slate-900">{t('caseLaw.startSearching')}</p>
                                        <p className="text-sm text-slate-500 mt-1">{t('caseLaw.searchDescription')}</p>
                                    </div>
                                )}
                            </div>

                            {/* Pagination */}
                            {searchResults.length > 0 && (
                                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
                                    <button
                                        onClick={() => handleSearch(searchPage - 1)}
                                        disabled={searchPage === 0}
                                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {t('portal.common.previous')}
                                    </button>
                                    <span className="text-sm text-slate-500">{t('caseLaw.page')} {searchPage + 1}</span>
                                    <button
                                        onClick={() => handleSearch(searchPage + 1)}
                                        disabled={searchResults.length < 10}
                                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {t('portal.common.next')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'saved' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center text-amber-700">
                                    <BookmarkIcon filled />
                                </div>
                                <h3 className="font-bold text-slate-900">{t('caseLaw.savedCases')}</h3>
                            </div>
                            <span className="text-sm text-slate-500">{bookmarks.length} {t('caseLaw.saved')}</span>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {loadingBookmarks ? (
                                <div className="p-8 text-center">
                                    <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin mx-auto mb-4"></div>
                                </div>
                            ) : bookmarks.length > 0 ? (
                                bookmarks.map((bm) => (
                                    <div key={bm._id} className="p-5 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <h4
                                                    className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer transition-colors"
                                                    onClick={() => handleViewDoc(bm.docId, bm.title)}
                                                >
                                                    {bm.title}
                                                </h4>
                                                <div className="flex items-center gap-4 mt-2 flex-wrap">
                                                    {bm.court && (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700">
                                                            {bm.court}
                                                        </span>
                                                    )}
                                                    {bm.date && (
                                                        <span className="text-xs text-slate-400">{bm.date}</span>
                                                    )}
                                                    {bm.tags?.length > 0 && bm.tags.map(tag => (
                                                        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                            <TagIcon /> {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                                {bm.notes && (
                                                    <p className="text-sm text-slate-500 mt-2 italic">"{bm.notes}"</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <button
                                                    onClick={() => {
                                                        setBookmarkNoteDocId(bm.docId);
                                                        setBookmarkNoteText(bm.notes || '');
                                                        setBookmarkTags(bm.tags?.join(', ') || '');
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                    title={t('caseLaw.editNotes')}
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleBookmarkToggle({ tid: bm.docId, title: bm.title } as CaseLawSearchDoc)}
                                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title={t('caseLaw.removeBookmark')}
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <BookmarkIcon />
                                    </div>
                                    <p className="font-semibold text-slate-900">{t('caseLaw.noBookmarks')}</p>
                                    <p className="text-sm text-slate-500 mt-1">{t('caseLaw.bookmarkHint')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Indian Kanoon Attribution */}
                <div className="text-center text-xs text-slate-400 py-2">
                    {t('caseLaw.poweredBy')}{' '}
                    <a
                        href="https://indiankanoon.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline font-medium"
                    >
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

            {/* Edit Notes/Tags Modal */}
            {bookmarkNoteDocId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="fixed inset-0 bg-black/40" onClick={() => setBookmarkNoteDocId(null)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 m-4">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">{t('caseLaw.editNotesTitle')}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('caseLaw.notes')}</label>
                                <textarea
                                    value={bookmarkNoteText}
                                    onChange={(e) => setBookmarkNoteText(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    placeholder={t('caseLaw.notesPlaceholder')}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('caseLaw.tags')}</label>
                                <input
                                    type="text"
                                    value={bookmarkTags}
                                    onChange={(e) => setBookmarkTags(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    placeholder={t('caseLaw.tagsPlaceholder')}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setBookmarkNoteDocId(null)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                            >
                                {t('portal.common.cancel')}
                            </button>
                            <button
                                onClick={() => handleUpdateBookmark(bookmarkNoteDocId)}
                                className="px-4 py-2 text-sm font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-800"
                            >
                                {t('portal.common.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PortalLayout>
    );
};

export default PortalCaseLaw;
