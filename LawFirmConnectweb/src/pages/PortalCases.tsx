import React from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PortalLayout from '../components/PortalLayout';
import type { Case } from '../services/caseService';
import caseService from '../services/caseService';
import TransliterateInput from '../components/TransliterateInput';

/* ──────────────────────── Icons ──────────────────────── */

const BriefcaseIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2ZM10 5h4v2h-4V5Zm10 15H4v-5.4l3 1.05V17a1 1 0 0 0 2 0v-.78l3 1.05 3-1.05V17a1 1 0 0 0 2 0v-1.35l3-1.05V20Zm0-8.4-8 2.8-8-2.8V9h16v2.6Z" />
    </svg>
);

const FolderIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 6h-8l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Zm0 12H4V8h16v10Z" />
    </svg>
);

const CheckCircleIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm-1 15-4-4 1.4-1.4L11 14.2l5.6-5.6L18 10l-7 7Z" />
    </svg>
);

const SearchIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
    </svg>
);

const PlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 5v14M5 12h14" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m9 18 6-6-6-6" />
    </svg>
);

const DashboardIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
);

const EmptyFileIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
);

/* ──────────────────────── Styles (inline CSS-in-JS) ──────────────────────── */

const styles = {
    page: {
        minHeight: '100vh',
        background: 'var(--color-bg-primary, #f0f2f5)',
        display: 'flex',
        flexDirection: 'column' as const,
    },
    container: {
        padding: '16px 0',
        width: '100%',
        flex: 1,
    },
    /* ── Header ── */
    header: {
        background: 'var(--color-surface, #fff)',
        borderRadius: '14px',
        padding: '22px 24px',
        marginBottom: '16px',
        border: '1px solid var(--color-surface-border, #e5e7eb)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap' as const,
        gap: '12px',
    },
    headerTitle: {
        fontSize: '26px',
        fontWeight: 800,
        color: 'var(--color-text-primary, #1a1a2e)',
        letterSpacing: '-0.5px',
        margin: 0,
        lineHeight: 1.2,
    },
    headerSubtitle: {
        fontSize: '14px',
        color: 'var(--color-text-secondary, #6b7280)',
        marginTop: '6px',
        fontWeight: 500,
    },
    headerActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    dashboardBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        border: '1px solid var(--color-surface-border, #d1d5db)',
        borderRadius: '10px',
        background: 'var(--color-surface, #fff)',
        color: 'var(--color-text-primary, #1a1a2e)',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    newCaseBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '10px 20px',
        border: 'none',
        borderRadius: '10px',
        background: 'var(--gradient-accent, linear-gradient(135deg, #5048e5, #7c3aed))',
        color: '#fff',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s',
        textDecoration: 'none',
    },
    /* ── Stats ── */
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        marginBottom: '16px',
    },
    statCard: {
        background: 'var(--color-surface, #fff)',
        borderRadius: '14px',
        padding: '18px 20px',
        border: '1px solid var(--color-surface-border, #e5e7eb)',
        transition: 'box-shadow 0.2s',
    },
    statTop: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '12px',
    },
    statIconBox: {
        width: '42px',
        height: '42px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statBadge: {
        fontSize: '9px',
        fontWeight: 700,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.08em',
        padding: '3px 8px',
        borderRadius: '20px',
    },
    statNumber: {
        fontSize: '30px',
        fontWeight: 800,
        lineHeight: 1,
        color: 'var(--color-text-primary, #1a1a2e)',
        letterSpacing: '-1px',
    },
    statLabel: {
        fontSize: '13px',
        color: 'var(--color-text-secondary, #6b7280)',
        marginTop: '4px',
        fontWeight: 500,
    },
    /* ── Search & Filter ── */
    searchBar: {
        background: 'var(--color-surface, #fff)',
        borderRadius: '14px',
        padding: '14px 20px',
        marginBottom: '16px',
        border: '1px solid var(--color-surface-border, #e5e7eb)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap' as const,
    },
    searchInputWrapper: {
        flex: 1,
        position: 'relative' as const,
        minWidth: '200px',
    },
    searchInput: {
        width: '100%',
        padding: '10px 12px 10px 40px',
        border: '1px solid var(--color-surface-border, #e5e7eb)',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: 500,
        color: 'var(--color-text-primary, #1a1a2e)',
        background: 'var(--color-bg-tertiary, #f9fafb)',
        outline: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    searchIconPos: {
        position: 'absolute' as const,
        left: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: 'var(--color-text-tertiary, #9ca3af)',
        pointerEvents: 'none' as const,
    },
    filterPills: {
        display: 'flex',
        gap: '6px',
    },
    filterPill: (active: boolean) => ({
        padding: '8px 18px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        border: 'none',
        transition: 'all 0.2s',
        background: active ? 'var(--color-accent, #5048e5)' : 'var(--color-bg-tertiary, #f3f4f6)',
        color: active ? '#fff' : 'var(--color-text-secondary, #6b7280)',
    }),
    /* ── Table ── */
    tableCard: {
        background: 'var(--color-surface, #fff)',
        borderRadius: '14px',
        border: '1px solid var(--color-surface-border, #e5e7eb)',
        overflow: 'hidden',
        marginBottom: '16px',
    },
    tableHeader: {
        display: 'grid',
        gridTemplateColumns: '2.5fr 1fr 1.2fr 1fr 0.5fr',
        padding: '14px 28px',
        borderBottom: '1px solid var(--color-surface-border, #e5e7eb)',
        background: 'var(--color-bg-tertiary, #f9fafb)',
    },
    tableHeaderCell: {
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.08em',
        color: 'var(--color-text-tertiary, #9ca3af)',
    },
    tableRow: {
        display: 'grid',
        gridTemplateColumns: '2.5fr 1fr 1.2fr 1fr 0.5fr',
        padding: '18px 28px',
        alignItems: 'center',
        transition: 'background-color 0.15s',
        cursor: 'pointer',
        textDecoration: 'none',
        color: 'inherit',
    },
    tableRowBorder: {
        borderBottom: '1px solid var(--color-surface-border, #e5e7eb)',
    },
    caseInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        minWidth: 0,
    },
    caseAvatar: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: '14px',
        color: '#fff',
        flexShrink: 0,
    },
    caseName: {
        fontSize: '14px',
        fontWeight: 700,
        color: 'var(--color-text-primary, #1a1a2e)',
        lineHeight: 1.3,
        whiteSpace: 'nowrap' as const,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    caseDesc: {
        fontSize: '12px',
        color: 'var(--color-text-secondary, #6b7280)',
        marginTop: '2px',
        whiteSpace: 'nowrap' as const,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    statusBadge: (status: string) => {
        const s = status?.toLowerCase();
        if (s === 'closed') return { background: 'var(--color-bg-tertiary, #f3f4f6)', color: 'var(--color-text-tertiary, #6b7280)', border: '1px solid var(--color-surface-border, #e5e7eb)' };
        if (s === 'open' || s === 'active') return { background: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.2)' };
        return { background: 'rgba(245, 158, 11, 0.1)', color: '#D97706', border: '1px solid rgba(245, 158, 11, 0.2)' };
    },
    statusText: {
        fontSize: '12px',
        fontWeight: 600,
        padding: '4px 12px',
        borderRadius: '6px',
        display: 'inline-block',
    },
    attorneyText: {
        fontSize: '14px',
        fontWeight: 500,
        color: 'var(--color-text-primary, #1a1a2e)',
    },
    dateText: {
        fontSize: '13px',
        color: 'var(--color-text-secondary, #6b7280)',
        fontWeight: 500,
    },
    chevronCell: {
        display: 'flex',
        justifyContent: 'flex-end',
        color: 'var(--color-text-tertiary, #9ca3af)',
    },
    /* ── Empty State ── */
    emptyState: {
        background: 'var(--color-surface, #fff)',
        borderRadius: '14px',
        border: '1px solid var(--color-surface-border, #e5e7eb)',
        padding: '48px 20px',
        textAlign: 'center' as const,
        marginBottom: '16px',
    },
    emptyIcon: {
        width: '64px',
        height: '64px',
        borderRadius: '16px',
        background: 'var(--color-bg-tertiary, #f3f4f6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px',
        color: 'var(--color-text-tertiary, #9ca3af)',
    },
    emptyTitle: {
        fontSize: '18px',
        fontWeight: 700,
        color: 'var(--color-text-primary, #1a1a2e)',
        marginBottom: '8px',
    },
    emptyDesc: {
        fontSize: '14px',
        color: 'var(--color-text-secondary, #6b7280)',
        maxWidth: '360px',
        margin: '0 auto 24px',
        lineHeight: 1.6,
    },
    emptyBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 28px',
        borderRadius: '28px',
        border: 'none',
        background: '#ef4444',
        color: '#fff',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        textDecoration: 'none',
        transition: 'all 0.2s',
    },
    /* ── Footer ── */
    footer: {
        textAlign: 'center' as const,
        padding: '24px',
        fontSize: '13px',
        color: 'var(--color-text-tertiary, #9ca3af)',
        borderTop: '1px solid var(--color-surface-border, #e5e7eb)',
    },
    /* ── Back button ── */
    backBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--color-accent, #5048e5)',
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        padding: 0,
        marginBottom: '8px',
        transition: 'opacity 0.2s',
    },
};

/* ──────────────────────── Avatar colors ──────────────────────── */
const avatarColors = [
    'linear-gradient(135deg, #5048e5, #7c3aed)',
    'linear-gradient(135deg, #059669, #10b981)',
    'linear-gradient(135deg, #2563eb, #3b82f6)',
    'linear-gradient(135deg, #d946ef, #a855f7)',
    'linear-gradient(135deg, #ea580c, #f97316)',
    'linear-gradient(135deg, #0891b2, #06b6d4)',
];

const getAvatarColor = (title: string) => {
    let hash = 0;
    for (let i = 0; i < (title?.length || 0); i++) {
        hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    return avatarColors[Math.abs(hash) % avatarColors.length];
};

const getInitials = (title: string) => {
    if (!title) return 'C';
    const words = title.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return title.charAt(0).toUpperCase();
};

/* ──────────────────────── Component ──────────────────────── */

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

    if (loading) {
        return (
            <PortalLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full animate-spin mx-auto mb-4"
                             style={{ border: '4px solid var(--color-surface-border)', borderTopColor: 'var(--color-accent)' }}></div>
                        <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('cases.loading')}</p>
                    </div>
                </div>
            </PortalLayout>
        );
    }

    return (
        <PortalLayout>
            <div style={styles.container}>
                {/* ── Header Card ── */}
                <div style={styles.header}>
                    <div>
                        {viewUserId && viewUserName ? (
                            <>
                                <button
                                    onClick={() => navigate('/portal/firm-connect')}
                                    style={styles.backBtn}
                                    onMouseOver={e => (e.currentTarget.style.opacity = '0.7')}
                                    onMouseOut={e => (e.currentTarget.style.opacity = '1')}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Back to Firm Connect
                                </button>
                                <h1 style={styles.headerTitle}>{viewUserName}'s Cases</h1>
                                <p style={styles.headerSubtitle}>Viewing cases assigned to {viewUserName}.</p>
                            </>
                        ) : (
                            <>
                                <h1 style={styles.headerTitle}>My Legal Matters</h1>
                                <p style={styles.headerSubtitle}>Overview of all your active and archived cases</p>
                            </>
                        )}
                    </div>
                    <div style={styles.headerActions}>
                        {!viewUserId && (
                            <Link to="/portal/start-case" style={styles.newCaseBtn}>
                                <PlusIcon /> New Case
                            </Link>
                        )}
                    </div>
                </div>

                {/* ── Stats Grid ── */}
                <div style={styles.statsGrid}>
                    {/* Active Cases */}
                    <div style={styles.statCard}>
                        <div style={styles.statTop}>
                            <div style={{ ...styles.statIconBox, backgroundColor: 'rgba(80, 72, 229, 0.1)', color: '#5048e5' }}>
                                <BriefcaseIcon />
                            </div>
                            <span style={{ ...styles.statBadge, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
                                Active
                            </span>
                        </div>
                        <div style={styles.statNumber}>{activeCases.length}</div>
                        <div style={styles.statLabel}>Active Cases</div>
                    </div>

                    {/* Total Cases */}
                    <div style={styles.statCard}>
                        <div style={styles.statTop}>
                            <div style={{ ...styles.statIconBox, backgroundColor: 'var(--color-bg-tertiary, #f3f4f6)', color: 'var(--color-text-secondary, #6b7280)' }}>
                                <FolderIcon />
                            </div>
                        </div>
                        <div style={styles.statNumber}>{cases.length}</div>
                        <div style={styles.statLabel}>Total Cases</div>
                    </div>

                    {/* Closed Cases */}
                    <div style={styles.statCard}>
                        <div style={styles.statTop}>
                            <div style={{ ...styles.statIconBox, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
                                <CheckCircleIcon />
                            </div>
                        </div>
                        <div style={styles.statNumber}>{closedCases.length}</div>
                        <div style={styles.statLabel}>Closed Cases</div>
                    </div>
                </div>

                {/* ── Search & Filter Bar ── */}
                <div style={styles.searchBar}>
                    <div style={styles.searchInputWrapper}>
                        <div style={styles.searchIconPos}>
                            <SearchIcon />
                        </div>
                        <TransliterateInput
                            value={searchQuery}
                            onChangeText={(text) => setSearchQuery(text)}
                            placeholder={t('cases.searchPlaceholder')}
                            style={styles.searchInput}
                        />
                    </div>
                    <div style={styles.filterPills}>
                        {(['All', 'Active', 'Closed'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                style={styles.filterPill(filter === f)}
                                onMouseOver={e => {
                                    if (filter !== f) e.currentTarget.style.background = 'var(--color-surface-border, #e5e7eb)';
                                }}
                                onMouseOut={e => {
                                    if (filter !== f) e.currentTarget.style.background = 'var(--color-bg-tertiary, #f3f4f6)';
                                }}
                            >
                                {t(`cases.${f.toLowerCase()}`)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Cases Table ── */}
                {filteredCases.length > 0 && (
                    <div style={styles.tableCard}>
                        {/* Table Header */}
                        <div style={styles.tableHeader}>
                            <span style={styles.tableHeaderCell}>Case Details</span>
                            <span style={styles.tableHeaderCell}>Status</span>
                            <span style={styles.tableHeaderCell}>Attorney</span>
                            <span style={styles.tableHeaderCell}>Date</span>
                            <span style={{ ...styles.tableHeaderCell, textAlign: 'right' }}>Actions</span>
                        </div>

                        {/* Table Rows */}
                        {filteredCases.map((caseItem: Case, idx: number) => (
                            <Link
                                to={`/portal/cases/${caseItem._id}`}
                                key={caseItem._id}
                                style={{
                                    ...styles.tableRow,
                                    ...(idx < filteredCases.length - 1 ? styles.tableRowBorder : {}),
                                }}
                                onMouseOver={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary, #f9fafb)'; }}
                                onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                                {/* Case Details */}
                                <div style={styles.caseInfo}>
                                    <div style={{
                                        ...styles.caseAvatar,
                                        background: getAvatarColor(caseItem.title),
                                    }}>
                                        {getInitials(caseItem.title)}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={styles.caseName}>{caseItem.title}</div>
                                        <div style={styles.caseDesc}>
                                            {caseItem.description
                                                ? (caseItem.description.length > 45
                                                    ? caseItem.description.slice(0, 45) + '...'
                                                    : caseItem.description)
                                                : t('cases.noDescription')}
                                        </div>
                                    </div>
                                </div>

                                {/* Status */}
                                <div>
                                    <span style={{ ...styles.statusText, ...styles.statusBadge(caseItem.status) }}>
                                        {caseItem.status}
                                    </span>
                                </div>

                                {/* Attorney */}
                                <div style={styles.attorneyText}>
                                    {caseItem.leadAttorney?.name || '—'}
                                </div>

                                {/* Date */}
                                <div style={styles.dateText}>
                                    {new Date(caseItem.createdAt).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: '2-digit',
                                        year: 'numeric',
                                    })}
                                </div>

                                {/* Actions */}
                                <div style={styles.chevronCell}>
                                    <ChevronRightIcon />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* ── Empty State ── */}
                {filteredCases.length === 0 && (
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIcon}>
                            <EmptyFileIcon />
                        </div>
                        <h3 style={styles.emptyTitle}>
                            {t('cases.noCasesFound')}
                        </h3>
                        <p style={styles.emptyDesc}>
                            {searchQuery
                                ? t('cases.adjustSearch')
                                : "It looks like you haven't started any cases yet. Get started by creating your first legal matter."}
                        </p>
                        {!searchQuery && (
                            <Link to="/portal/start-case" style={styles.emptyBtn}>
                                <PlusIcon /> Create your first case
                            </Link>
                        )}
                    </div>
                )}

                {/* ── Footer ── */}
                <div style={styles.footer}>
                    © {new Date().getFullYear()} Law Firm Connect (LawFirmAI). All rights reserved.
                </div>
            </div>
        </PortalLayout>
    );
};

export default PortalCases;
