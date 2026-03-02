import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useOutletContext, useParams } from 'react-router-dom';
import caseService, { type ActivityLog } from '../../services/caseService';
import TransliterateInput from '../../components/TransliterateInput';

/* ──────────────────────── Inline Icons ──────────────────────── */

const SearchIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
);

const PlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 5v14M5 12h14" />
    </svg>
);

const DocIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const NoteIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);

const EmailIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);

const PaymentIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const UserIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const EmptyIcon = () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

const MoreIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
    </svg>
);

const CloseIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const TrashIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
);

const CopyIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
);

const PinIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 17v5" /><path d="M9 11V4a1 1 0 011-1h4a1 1 0 011 1v7" /><path d="M5 17h14" /><path d="M7 11l-2 6h14l-2-6" />
    </svg>
);

const ChevronDownIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
);

/* ──────────────────────── Style helpers ──────────────────────── */

const getActivityMeta = (type: string) => {
    switch (type) {
        case 'document_upload':
            return { icon: <DocIcon />, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', dotColor: '#3b82f6', label: 'Document Upload' };
        case 'note_added':
            return { icon: <NoteIcon />, color: '#64748b', bg: 'rgba(100,116,139,0.1)', dotColor: '#94a3b8', label: 'Note Added' };
        case 'email_received':
            return { icon: <EmailIcon />, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', dotColor: '#6366f1', label: 'Email Received' };
        case 'payment_received':
            return { icon: <PaymentIcon />, color: '#10b981', bg: 'rgba(16,185,129,0.1)', dotColor: '#10b981', label: 'Payment Received' };
        case 'lawyer_assigned':
            return { icon: <UserIcon />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', dotColor: '#8b5cf6', label: 'Lawyer Assigned' };
        default:
            return { icon: <NoteIcon />, color: '#64748b', bg: 'rgba(100,116,139,0.1)', dotColor: '#94a3b8', label: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) };
    }
};

const getPerformedByName = (performedBy: any) => {
    if (!performedBy) return 'Unknown';
    if (typeof performedBy === 'string') return performedBy;
    if (performedBy.firstName && performedBy.lastName) return `${performedBy.firstName} ${performedBy.lastName}`;
    return performedBy.name || 'Unknown';
};

const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    }
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

/* ──────────────────────── Styles ──────────────────────── */

const s = {
    wrapper: {
        flex: 1,
        padding: '24px',
        overflowY: 'auto' as const,
        background: 'var(--color-bg-primary, #f8f9fa)',
    },
    inner: {
        width: '100%',
    },
    /* Top Bar */
    topBar: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '28px',
        flexWrap: 'wrap' as const,
    },
    searchWrap: {
        flex: 1,
        minWidth: '200px',
        position: 'relative' as const,
    },
    searchIconPos: {
        position: 'absolute' as const,
        left: '14px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: 'var(--color-text-tertiary, #9ca3af)',
        pointerEvents: 'none' as const,
        display: 'flex',
    },
    searchInput: {
        width: '100%',
        padding: '10px 14px 10px 42px',
        border: '1px solid var(--color-surface-border, #e5e7eb)',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: 500,
        color: 'var(--color-text-primary, #1a1a2e)',
        background: 'var(--color-surface, #fff)',
        outline: 'none',
    },
    selectWrap: {
        position: 'relative' as const,
        display: 'inline-flex',
        alignItems: 'center',
    },
    select: {
        padding: '10px 32px 10px 14px',
        border: '1px solid var(--color-surface-border, #e5e7eb)',
        borderRadius: '10px',
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--color-text-primary, #1a1a2e)',
        background: 'var(--color-surface, #fff)',
        appearance: 'none' as const,
        cursor: 'pointer',
        outline: 'none',
    },
    selectChevron: {
        position: 'absolute' as const,
        right: '10px',
        top: '50%',
        transform: 'translateY(-50%)',
        pointerEvents: 'none' as const,
        color: 'var(--color-text-tertiary, #9ca3af)',
        display: 'flex',
    },
    addBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '10px 18px',
        border: 'none',
        borderRadius: '10px',
        background: 'var(--gradient-accent, linear-gradient(135deg, #5048e5, #7c3aed))',
        color: '#fff',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'opacity 0.2s',
        whiteSpace: 'nowrap' as const,
    },
    /* Timeline */
    timeline: {
        position: 'relative' as const,
        paddingLeft: '28px',
    },
    timelineLine: {
        position: 'absolute' as const,
        left: '7px',
        top: '8px',
        bottom: '0',
        width: '2px',
        background: 'var(--color-surface-border, #e5e7eb)',
        borderRadius: '1px',
    },
    entry: {
        position: 'relative' as const,
        marginBottom: '20px',
    },
    dot: (color: string) => ({
        position: 'absolute' as const,
        left: '-28px',
        top: '22px',
        width: '14px',
        height: '14px',
        borderRadius: '50%',
        background: color,
        border: '3px solid var(--color-surface, #fff)',
        boxShadow: '0 0 0 2px ' + color + '33',
        zIndex: 2,
    }),
    card: {
        background: 'var(--color-surface, #fff)',
        borderRadius: '14px',
        padding: '18px 20px',
        border: '1px solid var(--color-surface-border, #e5e7eb)',
        transition: 'box-shadow 0.2s',
    },
    cardTop: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '8px',
    },
    cardLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    iconBox: (bg: string, color: string) => ({
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
        color: color,
        flexShrink: 0,
    }),
    cardTitle: {
        fontSize: '14px',
        fontWeight: 700,
        color: 'var(--color-text-primary, #1a1a2e)',
        lineHeight: 1.3,
    },
    cardMeta: {
        fontSize: '12px',
        color: 'var(--color-text-tertiary, #9ca3af)',
        fontWeight: 500,
        marginTop: '2px',
    },
    cardRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    moreBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--color-text-tertiary, #9ca3af)',
        padding: '4px',
        borderRadius: '6px',
        display: 'flex',
        transition: 'background 0.15s',
    },
    dropdownWrap: {
        position: 'relative' as const,
    },
    dropdown: {
        position: 'absolute' as const,
        right: 0,
        top: '100%',
        marginTop: '4px',
        background: 'var(--color-surface, #fff)',
        border: '1px solid var(--color-surface-border, #e5e7eb)',
        borderRadius: '10px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
        zIndex: 20,
        minWidth: '170px',
        overflow: 'hidden',
        padding: '4px',
    },
    dropdownItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        padding: '9px 12px',
        border: 'none',
        background: 'transparent',
        borderRadius: '7px',
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--color-text-primary, #1a1a2e)',
        cursor: 'pointer',
        transition: 'background 0.12s',
        textAlign: 'left' as const,
    },
    dropdownItemDanger: {
        color: '#ef4444',
    },
    cardDesc: {
        fontSize: '13px',
        color: 'var(--color-text-secondary, #6b7280)',
        lineHeight: 1.6,
        paddingLeft: '46px',
    },
    /* Empty State */
    empty: {
        textAlign: 'center' as const,
        padding: '60px 20px',
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
        fontSize: '16px',
        fontWeight: 700,
        color: 'var(--color-text-primary, #1a1a2e)',
        marginBottom: '6px',
    },
    emptyDesc: {
        fontSize: '14px',
        color: 'var(--color-text-secondary, #6b7280)',
    },
    /* Modal */
    overlay: {
        position: 'fixed' as const,
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
        padding: '16px',
    },
    modal: {
        background: 'var(--color-surface, #fff)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '440px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    },
    modalHeader: {
        padding: '18px 20px',
        borderBottom: '1px solid var(--color-surface-border, #e5e7eb)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: '16px',
        fontWeight: 700,
        color: 'var(--color-text-primary, #1a1a2e)',
    },
    modalClose: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--color-text-tertiary, #9ca3af)',
        padding: '4px',
        borderRadius: '6px',
        display: 'flex',
        transition: 'color 0.15s',
    },
    modalBody: {
        padding: '20px',
    },
    label: {
        display: 'block',
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--color-text-secondary, #6b7280)',
        marginBottom: '6px',
    },
    input: {
        width: '100%',
        padding: '10px 14px',
        border: '1px solid var(--color-surface-border, #e5e7eb)',
        borderRadius: '10px',
        fontSize: '14px',
        color: 'var(--color-text-primary, #1a1a2e)',
        background: 'var(--color-bg-tertiary, #f9fafb)',
        outline: 'none',
        marginBottom: '14px',
    },
    modalFooter: {
        padding: '14px 20px',
        borderTop: '1px solid var(--color-surface-border, #e5e7eb)',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
    },
    cancelBtn: {
        padding: '9px 18px',
        border: 'none',
        borderRadius: '8px',
        background: 'transparent',
        color: 'var(--color-text-secondary, #6b7280)',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
    },
    submitBtn: {
        padding: '9px 18px',
        border: 'none',
        borderRadius: '8px',
        background: 'var(--gradient-accent, linear-gradient(135deg, #5048e5, #7c3aed))',
        color: '#fff',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
    },
};

/* ──────────────────────── Component ──────────────────────── */

const CaseActivity: React.FC = () => {
    // @ts-ignore
    const { caseData, setCaseData } = useOutletContext<{ caseData: any, setCaseData: any }>();
    const { id } = useParams<{ id: string }>();

    const [activitySearchQuery, setActivitySearchQuery] = useState('');
    const [activityTypeFilter, setActivityTypeFilter] = useState('all');
    const [activities, setActivities] = useState<ActivityLog[]>([]);

    const [showActivityModal, setShowActivityModal] = useState(false);
    const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
    const menuRef = React.useRef<HTMLDivElement>(null);

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenMenuIndex(null);
            }
        };
        if (openMenuIndex !== null) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openMenuIndex]);

    const handleCopyActivity = (description: string) => {
        navigator.clipboard.writeText(description);
        toast.success('Copied to clipboard');
        setOpenMenuIndex(null);
    };

    const handlePinActivity = () => {
        toast.success('Activity pinned');
        setOpenMenuIndex(null);
    };

    const handleDeleteActivity = () => {
        toast.success('Activity deleted');
        setOpenMenuIndex(null);
    };

    const [activityForm, setActivityForm] = useState({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0].slice(0, 5),
        user: 'You'
    });

    useEffect(() => {
        const fetchActivities = async () => {
            if (id) {
                try {
                    const fetchedActivities = await caseService.getCaseActivity(id);
                    setActivities(fetchedActivities);
                } catch (error) {
                    console.error("Failed to fetch activities", error);
                }
            }
        };
        fetchActivities();
    }, [id]);

    const handleActivitySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;
        try {
            const combinedDescription = activityForm.title
                ? `**${activityForm.title}** - ${activityForm.description}`
                : activityForm.description;

            const newActivities = await caseService.addCaseActivity(id, {
                description: combinedDescription,
                type: 'note_added'
            });

            setActivities(newActivities);
            setShowActivityModal(false);
            setActivityForm({
                title: '',
                description: '',
                date: new Date().toISOString().split('T')[0],
                time: new Date().toTimeString().split(' ')[0].slice(0, 5),
                user: 'You'
            });
        } catch (error) {
            console.error("Failed to add activity", error);
            toast.error("Failed to add activity");
        }
    };

    const filteredActivities = activities
        .filter(a => {
            const userName = getPerformedByName(a.performedBy);
            if (activitySearchQuery) {
                const q = activitySearchQuery.toLowerCase();
                if (!a.description.toLowerCase().includes(q) && !userName.toLowerCase().includes(q)) return false;
            }
            if (activityTypeFilter !== 'all') {
                if (a.type !== activityTypeFilter) return false;
            }
            return true;
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <div style={s.wrapper}>
            <div style={s.inner}>

                {/* ── Top Bar ── */}
                <div style={s.topBar}>
                    <div style={s.searchWrap}>
                        <div style={s.searchIconPos}><SearchIcon /></div>
                        <TransliterateInput
                            value={activitySearchQuery}
                            onChangeText={(text) => setActivitySearchQuery(text)}
                            placeholder="Search activity..."
                            style={s.searchInput}
                        />
                    </div>
                    <div style={s.selectWrap}>
                        <select
                            value={activityTypeFilter}
                            onChange={(e) => setActivityTypeFilter(e.target.value)}
                            style={s.select}
                        >
                            <option value="all">All Types</option>
                            <option value="document_upload">Documents</option>
                            <option value="note_added">Notes</option>
                            <option value="email_received">Emails</option>
                            <option value="payment_received">Payments</option>
                            <option value="lawyer_assigned">Assignments</option>
                        </select>
                        <div style={s.selectChevron}><ChevronDownIcon /></div>
                    </div>
                    <button
                        onClick={() => setShowActivityModal(true)}
                        style={s.addBtn}
                        onMouseOver={e => (e.currentTarget.style.opacity = '0.9')}
                        onMouseOut={e => (e.currentTarget.style.opacity = '1')}
                    >
                        <PlusIcon /> Add Note
                    </button>
                </div>

                {/* ── Timeline ── */}
                {filteredActivities.length === 0 ? (
                    <div style={s.empty}>
                        <div style={s.emptyIcon}><EmptyIcon /></div>
                        <div style={s.emptyTitle}>No activity yet</div>
                        <div style={s.emptyDesc}>New updates will appear here.</div>
                    </div>
                ) : (
                    <div style={s.timeline}>
                        <div style={s.timelineLine} />
                        {filteredActivities.map((activity, index) => {
                            const meta = getActivityMeta(activity.type);
                            const performer = getPerformedByName(activity.performedBy);
                            return (
                                <div key={activity.createdAt + index} style={s.entry}>
                                    {/* Dot */}
                                    <div style={s.dot(meta.dotColor)} />

                                    {/* Card */}
                                    <div
                                        style={s.card}
                                        onMouseOver={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)')}
                                        onMouseOut={e => (e.currentTarget.style.boxShadow = 'none')}
                                    >
                                        <div style={s.cardTop}>
                                            <div style={s.cardLeft}>
                                                <div style={s.iconBox(meta.bg, meta.color)}>
                                                    {meta.icon}
                                                </div>
                                                <div>
                                                    <div style={s.cardTitle}>{meta.label}</div>
                                                    <div style={s.cardMeta}>
                                                        {performer} · {formatTime(activity.createdAt)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={s.cardRight}>
                                                <div style={s.dropdownWrap} ref={openMenuIndex === index ? menuRef : undefined}>
                                                    <button
                                                        style={s.moreBtn}
                                                        onClick={() => setOpenMenuIndex(openMenuIndex === index ? null : index)}
                                                        onMouseOver={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary, #f3f4f6)')}
                                                        onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                                                    >
                                                        <MoreIcon />
                                                    </button>
                                                    {openMenuIndex === index && (
                                                        <div style={s.dropdown}>
                                                            <button
                                                                style={s.dropdownItem}
                                                                onClick={() => handleCopyActivity(activity.description)}
                                                                onMouseOver={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary, #f3f4f6)')}
                                                                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                                                            >
                                                                <CopyIcon /> Copy to clipboard
                                                            </button>
                                                            <button
                                                                style={s.dropdownItem}
                                                                onClick={handlePinActivity}
                                                                onMouseOver={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary, #f3f4f6)')}
                                                                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                                                            >
                                                                <PinIcon /> Pin activity
                                                            </button>
                                                            <button
                                                                style={{ ...s.dropdownItem, ...s.dropdownItemDanger }}
                                                                onClick={handleDeleteActivity}
                                                                onMouseOver={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')}
                                                                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                                                            >
                                                                <TrashIcon /> Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={s.cardDesc}>
                                            {activity.description}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Add Note Modal ── */}
            {showActivityModal && (
                <div style={s.overlay}>
                    <div style={s.modal}>
                        <div style={s.modalHeader}>
                            <h3 style={s.modalTitle}>Add New Note</h3>
                            <button
                                onClick={() => setShowActivityModal(false)}
                                style={s.modalClose}
                                onMouseOver={e => (e.currentTarget.style.color = 'var(--color-text-primary, #1a1a2e)')}
                                onMouseOut={e => (e.currentTarget.style.color = 'var(--color-text-tertiary, #9ca3af)')}
                            >
                                <CloseIcon />
                            </button>
                        </div>
                        <form onSubmit={handleActivitySubmit}>
                            <div style={s.modalBody}>
                                <label style={s.label}>Title (Optional)</label>
                                <TransliterateInput
                                    value={activityForm.title}
                                    onChangeText={(text) => setActivityForm({ ...activityForm, title: text })}
                                    style={s.input}
                                    placeholder="e.g. Call Summary"
                                />
                                <label style={s.label}>Description</label>
                                <TransliterateInput
                                    value={activityForm.description}
                                    onChangeText={(text) => setActivityForm({ ...activityForm, description: text })}
                                    style={{ ...s.input, minHeight: '80px', marginBottom: 0 }}
                                    placeholder="Add details..."
                                    type="textarea"
                                    rows={3}
                                />
                            </div>
                            <div style={s.modalFooter}>
                                <button
                                    type="button"
                                    onClick={() => setShowActivityModal(false)}
                                    style={s.cancelBtn}
                                >
                                    Cancel
                                </button>
                                <button type="submit" style={s.submitBtn}>
                                    Add Note
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CaseActivity;
