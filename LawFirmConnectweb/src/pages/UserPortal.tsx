import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../components/PortalLayout';
import caseService from '../services/caseService';
import type { Case } from '../services/caseService';
import scheduleService from '../services/scheduleService';
import type { CalendarEvent } from '../services/scheduleService';
import { messageService } from '../services/messageService';
import { useTranslation } from 'react-i18next';

/* ─────────────── SVG Icons ─────────────── */
const PlusIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);

const SparklesIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
);

const DraftIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
    </svg>
);

const UploadIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);

const SearchIcon2 = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);

const PenSquareIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
);

const MoreHorizIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
);

const ArrowRightIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
);

const CalendarSmallIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
);

const ExternalLinkIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
);

const CheckSmallIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);

/* ─────────────── Component ─────────────── */
const UserPortal: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [activeCases, setActiveCases] = useState<Case[]>([]);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState('');
    const [error, setError] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
    const { t } = useTranslation();

    // Update time every minute
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // User info
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    try {
                        const user = JSON.parse(userStr);
                        setUserName(user.firstName || 'User');
                    } catch { setUserName("User"); }
                } else {
                    setUserName('Client');
                }

                // Cases
                let activeCount = 0;
                let pendingCount = 0;
                let recentCases: Case[] = [];
                try {
                    const casesData = await caseService.getCases();
                    if (Array.isArray(casesData)) {
                        const openCases = casesData.filter(c => c.status !== 'Closed');
                        activeCount = openCases.length;
                        pendingCount = casesData.filter(c => c.status?.toLowerCase() === 'pending' || c.status?.toLowerCase() === 'in progress').length;
                        recentCases = openCases
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            .slice(0, 3);
                        setActiveCases(recentCases);
                    }
                } catch (err) { console.error("Failed to fetch cases:", err); }

                // Messages
                let unreadCount = 0;
                try {
                    const msgData = await messageService.getUnreadCount();
                    unreadCount = msgData.count || 0;
                } catch (e) { console.error("Failed to fetch message count", e); }

                // Calendar Events
                try {
                    const eventsData = await scheduleService.getEvents();
                    if (Array.isArray(eventsData)) {
                        const now = new Date();
                        const future = eventsData
                            .filter((e: CalendarEvent) => {
                                if (!e.startDate) return false;
                                try {
                                    const startStr = typeof e.startDate === 'string' ? e.startDate.split('T')[0] : new Date(e.startDate).toISOString().split('T')[0];
                                    const eventDate = new Date(`${startStr}T${e.startTime || '00:00'}`);
                                    return eventDate > now;
                                } catch { return false; }
                            })
                            .sort((a: any, b: any) => {
                                const aDate = new Date(`${typeof a.startDate === 'string' ? a.startDate.split('T')[0] : new Date(a.startDate).toISOString().split('T')[0]}T${a.startTime || '00:00'}`);
                                const bDate = new Date(`${typeof b.startDate === 'string' ? b.startDate.split('T')[0] : new Date(b.startDate).toISOString().split('T')[0]}T${b.startTime || '00:00'}`);
                                return aDate.getTime() - bDate.getTime();
                            })
                            .slice(0, 3);
                        setUpcomingEvents(future);
                    }
                } catch (e) { console.error("Failed to fetch events", e); }

                setStats({ activeCases: activeCount, unreadMessages: unreadCount, pendingDeadlines: pendingCount });
                setLoading(false);
            } catch (globalError: any) {
                console.error("Critical error loading dashboard", globalError);
                setError(globalError.message || "Unknown error");
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'active': case 'open':
                return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
            case 'pending': case 'in progress':
                return 'bg-amber-50 text-amber-600 border border-amber-200';
            case 'closed':
                return 'bg-slate-100 text-slate-500 border border-slate-200';
            case 'review':
                return 'bg-blue-50 text-blue-600 border border-blue-200';
            default:
                return 'bg-slate-100 text-slate-600 border border-slate-200';
        }
    };

    const getRelativeTime = (dateStr: string) => {
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatEventDate = (event: CalendarEvent) => {
        try {
            const startStr = typeof event.startDate === 'string' ? event.startDate.split('T')[0] : new Date(event.startDate).toISOString().split('T')[0];
            const d = new Date(startStr);
            return {
                month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
                day: d.getDate()
            };
        } catch { return { month: '—', day: '—' }; }
    };

    const formatEventTime = (event: CalendarEvent) => {
        try {
            const start = event.startTime || '';
            const end = event.endTime || '';
            if (!start) return '';
            const fmt = (t: string) => {
                const [h, m] = t.split(':');
                const hr = parseInt(h);
                const ampm = hr >= 12 ? 'PM' : 'AM';
                const hr12 = hr % 12 || 12;
                return `${hr12}:${m} ${ampm}`;
            };
            return end ? `${fmt(start)} - ${fmt(end)}` : fmt(start);
        } catch { return ''; }
    };

    if (loading) {
        return (
            <PortalLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-600 font-medium">{t('userPortal.loading')}</p>
                    </div>
                </div>
            </PortalLayout>
        );
    }

    if (error) {
        return (
            <PortalLayout>
                <div className="p-10 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{t('userPortal.error')}</h3>
                    <p className="text-slate-600">{error}</p>
                </div>
            </PortalLayout>
        );
    }

    return (
        <PortalLayout>
            <div className="max-w-7xl mx-auto space-y-6">

                {/* ═══════ Welcome Header ═══════ */}
                <div className="relative overflow-hidden rounded-2xl p-6 lg:p-8" style={{ background: 'linear-gradient(135deg, #f8f9ff 0%, #f0f1ff 50%, #eef0ff 100%)', border: '1px solid #e5e7ff' }}>
                    {/* Decorative Sparkle */}
                    <div className="absolute top-4 right-6 lg:right-10 opacity-20">
                        <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
                            <path d="M50 0L56 38L90 25L62 50L90 75L56 62L50 100L44 62L10 75L38 50L10 25L44 38L50 0Z" fill="#6366f1" />
                        </svg>
                    </div>

                    <div className="relative">
                        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
                            {getGreeting()}, {userName} 👋
                        </h1>
                        <p className="text-slate-500 mt-2 max-w-lg text-sm lg:text-base">
                            Welcome back to your LawFirmAI dashboard. You have {stats?.activeCases || 0} active cases and {stats?.unreadMessages || 0} updates pending review.
                        </p>
                        <div className="flex flex-wrap gap-3 mt-5">
                            <Link
                                to="/portal/cases/new"
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                <PlusIcon /> Start New Case
                            </Link>
                            <button
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors shadow-sm border border-slate-200"
                            >
                                <DraftIcon /> Quick Draft
                            </button>
                        </div>
                    </div>
                </div>

                {/* ═══════ Stats Cards ═══════ */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Active Cases */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow group">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-slate-500 font-medium">Active Cases</span>
                            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">+8%</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{stats?.activeCases || 0}</p>
                        <p className="text-xs text-slate-400 mt-1">Ongoing</p>
                    </div>

                    {/* Pending Deadlines */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow group">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-slate-500 font-medium">Pending Deadlines</span>
                            <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">Due soon</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{stats?.pendingDeadlines || 0}</p>
                        <p className="text-xs text-slate-400 mt-1">Critical</p>
                    </div>

                    {/* Unread Messages */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow group">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-slate-500 font-medium">Unread Messages</span>
                            {(stats?.unreadMessages || 0) > 0 && (
                                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">New</span>
                            )}
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{stats?.unreadMessages || 0}</p>
                        <p className="text-xs text-slate-400 mt-1">Items</p>
                    </div>

                    {/* Billable Hours */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow group">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-slate-500 font-medium">Billable Hours</span>
                            <span className="text-[11px] font-medium text-slate-400">Target: 180h</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">148h</p>
                        <p className="text-xs text-slate-400 mt-1">Monthly</p>
                        <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: '82%' }}></div>
                        </div>
                    </div>
                </div>

                {/* ═══════ Main Content: Recent Cases + AI Insights ═══════ */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Recent Cases Table — 2 cols */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-6 py-4 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-900">Recent Cases</h3>
                                <Link to="/portal/cases" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 underline underline-offset-2">
                                    View All Cases
                                </Link>
                            </div>

                            {/* Table Header */}
                            <div className="px-6 py-2.5 grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100">
                                <div className="col-span-4">Case Name / ID</div>
                                <div className="col-span-2">Client</div>
                                <div className="col-span-3">Status</div>
                                <div className="col-span-2">Last Updated</div>
                                <div className="col-span-1"></div>
                            </div>

                            {/* Table Rows */}
                            <div className="divide-y divide-slate-100">
                                {activeCases.length > 0 ? activeCases.map((caseItem) => (
                                    <Link
                                        to={`/portal/cases/${caseItem._id}`}
                                        key={caseItem._id}
                                        className="px-6 py-4 grid grid-cols-12 gap-2 items-center hover:bg-slate-50/80 transition-colors"
                                    >
                                        <div className="col-span-4">
                                            <p className="text-sm font-semibold text-slate-900 truncate">{caseItem.title}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">#{caseItem.caseNumber || `LFA-${caseItem._id.slice(-6)}`}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-sm text-slate-600 truncate">{caseItem.clientName || '—'}</p>
                                        </div>
                                        <div className="col-span-3">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(caseItem.status)}`}>
                                                {caseItem.status}
                                            </span>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-sm text-slate-500">{getRelativeTime(caseItem.createdAt)}</p>
                                        </div>
                                        <div className="col-span-1 flex justify-end">
                                            <button className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors" onClick={e => e.preventDefault()}>
                                                <MoreHorizIcon />
                                            </button>
                                        </div>
                                    </Link>
                                )) : (
                                    <div className="px-6 py-10 text-center">
                                        <p className="text-sm text-slate-500">No active cases yet.</p>
                                        <Link to="/portal/cases/new" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 mt-2 inline-block">Start a new case →</Link>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ═══════ Quick Action Buttons ═══════ */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <Link
                                to="/portal/cases/new"
                                className="flex flex-col items-center gap-2.5 p-5 bg-white rounded-xl border border-slate-200 hover:shadow-lg hover:border-indigo-200 transition-all group cursor-pointer"
                            >
                                <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <PlusIcon />
                                </div>
                                <span className="text-sm font-semibold text-slate-700">New Case</span>
                            </Link>
                            <button className="flex flex-col items-center gap-2.5 p-5 bg-white rounded-xl border border-slate-200 hover:shadow-lg hover:border-orange-200 transition-all group cursor-pointer">
                                <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                    <UploadIcon />
                                </div>
                                <span className="text-sm font-semibold text-slate-700">Upload</span>
                            </button>
                            <Link
                                to="/portal/case-law"
                                className="flex flex-col items-center gap-2.5 p-5 bg-white rounded-xl border border-slate-200 hover:shadow-lg hover:border-violet-200 transition-all group cursor-pointer"
                            >
                                <div className="w-11 h-11 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-colors">
                                    <SearchIcon2 />
                                </div>
                                <span className="text-sm font-semibold text-slate-700">Search</span>
                            </Link>
                            <button className="flex flex-col items-center gap-2.5 p-5 bg-white rounded-xl border border-slate-200 hover:shadow-lg hover:border-red-200 transition-all group cursor-pointer">
                                <div className="w-11 h-11 rounded-xl bg-red-100 text-red-500 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-colors">
                                    <PenSquareIcon />
                                </div>
                                <span className="text-sm font-semibold text-slate-700">Draft</span>
                            </button>
                        </div>
                    </div>

                    {/* ═══════ Right Sidebar ═══════ */}
                    <div className="space-y-6">

                        {/* AI Insights */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 flex items-center gap-2">
                                <SparklesIcon />
                                <h3 className="text-base font-bold text-slate-900">AI Insights</h3>
                            </div>

                            <div className="px-5 pb-5 space-y-4">
                                {/* Insight 1 */}
                                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                    <h4 className="text-sm font-bold text-slate-800 mb-1">Potential Conflict Detected</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed mb-2">
                                        Found similarities in the Smith v. Peterson case with a 2018 ruling.
                                    </p>
                                    <button className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                                        Analyze Conflict <ArrowRightIcon />
                                    </button>
                                </div>

                                {/* Insight 2 */}
                                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                    <h4 className="text-sm font-bold text-slate-800 mb-1">Drafting Assistant</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed mb-2">
                                        Your summary for the Miller Estate is ready for review.
                                    </p>
                                    <button className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                                        Open Draft <ExternalLinkIcon />
                                    </button>
                                </div>

                                {/* Insight 3 */}
                                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                    <h4 className="text-sm font-bold text-slate-800 mb-1">Calendar Optimization</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed mb-2">
                                        AI suggests blocking Friday for research on Case #084.
                                    </p>
                                    <button className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                                        Approve Slot <CheckSmallIcon />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Upcoming Events */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 flex items-center justify-between">
                                <h3 className="text-base font-bold text-slate-900">Upcoming</h3>
                                <Link to="/portal/calendar" className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                    <CalendarSmallIcon />
                                </Link>
                            </div>

                            <div className="px-5 pb-5 space-y-3">
                                {upcomingEvents.length > 0 ? upcomingEvents.map((event, idx) => {
                                    const { month, day } = formatEventDate(event);
                                    return (
                                        <div key={event._id || idx} className="flex gap-4 items-start">
                                            <div className="text-center min-w-[40px]">
                                                <span className="block text-[10px] font-bold text-indigo-600 uppercase">{month}</span>
                                                <span className="block text-xl font-bold text-slate-900">{day}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 truncate">{event.title}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">{formatEventTime(event)}</p>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="text-center py-4">
                                        <p className="text-sm text-slate-400">No upcoming events</p>
                                        <Link to="/portal/calendar" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 mt-1 inline-block">
                                            View Calendar →
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PortalLayout>
    );
};

export default UserPortal;
