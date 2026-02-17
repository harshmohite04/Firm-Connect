import React from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import PortalLayout from '../components/PortalLayout';
import type { Case } from '../services/caseService';
import caseService from '../services/caseService';

// Icons - matching UserPortal style
const CaseIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);

const FolderIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
);

const CheckCircleIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const SearchIcon = () => (
    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const PlusIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);

const ArrowRightIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
);

const ClockIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const PortalCases: React.FC = () => {
    const { t } = useTranslation();
    const [cases, setCases] = React.useState<Case[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [filter, setFilter] = React.useState('All');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const viewUserId = searchParams.get('userId');
    const viewUserName = searchParams.get('name');

    React.useEffect(() => {
        const fetchCases = async () => {
            try {
                const data = await caseService.getCases(viewUserId || undefined);
                setCases(data);
            } catch (error) {
                console.error("Failed to fetch cases", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCases();
    }, [viewUserId]);

    const activeCases = cases.filter(c => c.status !== 'Closed');
    const closedCases = cases.filter(c => c.status === 'Closed');

    const filteredCases = cases.filter((c: Case) => {
        if (!c) return false;
        const matchesFilter = filter === 'All' ? true : (filter === 'Active' ? c.status !== 'Closed' : c.status === 'Closed');
        const query = searchQuery.toLowerCase();
        const matchesSearch = c.title?.toLowerCase().includes(query) ||
            c.description?.toLowerCase().includes(query);
        return matchesFilter && matchesSearch;
    });

    const getStatusStyle = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'open':
            case 'active':
                return 'bg-emerald-100 text-emerald-700';
            case 'closed':
                return 'bg-slate-100 text-slate-600';
            default:
                return 'bg-amber-100 text-amber-700';
        }
    };

    if (loading) {
        return (
            <PortalLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-600 font-medium">{t('cases.loading')}</p>
                    </div>
                </div>
            </PortalLayout>
        );
    }

    return (
        <PortalLayout>
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header - Matching UserPortal style */}
                <div className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-200 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                            {viewUserId && viewUserName ? (
                                <>
                                    <button
                                        onClick={() => navigate('/portal/firm-connect')}
                                        className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-2 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                        </svg>
                                        Back to Firm Connect
                                    </button>
                                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">{viewUserName}'s Cases</h1>
                                    <p className="text-slate-500 mt-2">Viewing cases assigned to {viewUserName}.</p>
                                </>
                            ) : (
                                <>
                                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">My Legal Matters</h1>
                                    <p className="text-slate-500 mt-2">Overview of all your active and archived cases.</p>
                                </>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <Link
                                to="/portal"
                                className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2"
                            >
                                {t('cases.dashboard')}
                            </Link>
                            {!viewUserId && (
                                <Link
                                    to="/portal/start-case"
                                    className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2"
                                >
                                    <PlusIcon /> New Case
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Grid - Matching UserPortal style */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow group">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                <CaseIcon />
                            </div>
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{t('cases.active')}</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{activeCases.length}</p>
                        <p className="text-sm text-slate-500 mt-1">{t('cases.activeCases')}</p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow group">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 group-hover:scale-110 transition-transform">
                                <FolderIcon />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{cases.length}</p>
                        <p className="text-sm text-slate-500 mt-1">{t('cases.totalCases')}</p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow group col-span-2 lg:col-span-1">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                <CheckCircleIcon />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{closedCases.length}</p>
                        <p className="text-sm text-slate-500 mt-1">{t('cases.closedCases')}</p>
                    </div>
                </div>

                {/* Search & Filter - Matching UserPortal card style */}
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-grow relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchIcon />
                            </div>
                            <input
                                type="text"
                                placeholder={t('cases.searchPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-200 focus:border-slate-300 text-sm transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            {(['All', 'Active', 'Closed'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${filter === f
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    {t(`cases.${f.toLowerCase()}`)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Cases List - Card style matching UserPortal "Active Matters" */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center text-slate-600">
                                <FolderIcon />
                            </div>
                            <h3 className="font-bold text-slate-900">
                                {filter === 'All' ? t('cases.allCases') : filter === 'Active' ? t('cases.activeCases') : t('cases.closedCases')}
                            </h3>
                        </div>
                        <span className="text-sm text-slate-500">{filteredCases.length} {filteredCases.length === 1 ? t('cases.case') : t('cases.casesLabel')}</span>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {filteredCases.map((caseItem: Case) => (
                            <Link
                                to={`/portal/cases/${caseItem._id}`}
                                key={caseItem._id}
                                className="p-5 hover:bg-slate-50 transition-colors block"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex gap-4 flex-1">
                                        <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                            {caseItem.title?.charAt(0) || 'C'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-900 truncate">{caseItem.title}</h4>
                                            <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">
                                                {caseItem.description || t('cases.noDescription')}
                                            </p>
                                            <div className="flex items-center gap-4 mt-2">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${getStatusStyle(caseItem.status)}`}>
                                                    {caseItem.status}
                                                </span>
                                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                                    <ClockIcon />
                                                    {new Date(caseItem.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                                {caseItem.leadAttorney && (
                                                    <span className="text-xs text-slate-400">
                                                        {t('cases.attorney')}: {caseItem.leadAttorney.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-slate-400">
                                        <ArrowRightIcon />
                                    </div>
                                </div>
                            </Link>
                        ))}

                        {filteredCases.length === 0 && (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FolderIcon />
                                </div>
                                <p className="font-semibold text-slate-900">{t('cases.noCasesFound')}</p>
                                <p className="text-sm text-slate-500 mt-1">
                                    {searchQuery ? t('cases.adjustSearch') : t('cases.startCreating')}
                                </p>
                                {!searchQuery && (
                                    <Link
                                        to="/portal/start-case"
                                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors"
                                    >
                                        <PlusIcon /> {t('cases.createCase')}
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PortalLayout>
    );
};

export default PortalCases;
