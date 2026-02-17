import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../components/PortalLayout';
import caseService from '../services/caseService';
import type { Case, ActivityLog } from '../services/caseService';
import scheduleService from '../services/scheduleService';
import type { CalendarEvent } from '../services/scheduleService';
import { messageService } from '../services/messageService';
import { useTranslation } from 'react-i18next';

// Icons
const CaseIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);

const CalendarIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const MessageIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
);

const WalletIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
);

const FolderIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
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

const CheckCircleIcon = () => (
    <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const BellIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
);

const UserPortal: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [activeCases, setActiveCases] = useState<Case[]>([]);
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [upcomingBooking, setUpcomingBooking] = useState<Date | null>(null);
    const [nextEventTitle, setNextEventTitle] = useState<string>('Appointment');
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState('');
    const [error, setError] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());
    const { t } = useTranslation();

    // Update time every minute
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // User Name
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    try {
                        const user = JSON.parse(userStr);
                        setUserName(user.firstName || 'User');
                    } catch (e) {
                        setUserName("User");
                    }
                } else {
                    setUserName('Client');
                }

                // 1. Fetch Cases
                let activeCount = 0;
                let recentCases: Case[] = [];
                try {
                    const casesData = await caseService.getCases();
                    if (Array.isArray(casesData)) {
                        const openCases = casesData.filter(c => c.status !== 'Closed');
                        activeCount = openCases.length;
                        recentCases = openCases
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            .slice(0, 3);
                        setActiveCases(recentCases);
                    }
                } catch (err) {
                    console.error("Failed to fetch cases:", err);
                }

                // 2. Fetch Activities
                let allActivities: ActivityLog[] = [];
                if (recentCases.length > 0) {
                    try {
                        const activityPromises = recentCases.map(c => caseService.getCaseActivity(c._id));
                        const results = await Promise.all(activityPromises);
                        results.forEach(logs => {
                            if (Array.isArray(logs)) {
                                allActivities = [...allActivities, ...logs];
                            }
                        });
                        allActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                        allActivities = allActivities.slice(0, 5);
                    } catch (e) {
                        console.error("Failed to fetch activities", e);
                    }
                }
                setActivities(allActivities);

                // 3. Fetch Unread Messages Count
                let unreadCount = 0;
                try {
                    const msgData = await messageService.getUnreadCount();
                    unreadCount = msgData.count || 0;
                } catch (e) {
                    console.error("Failed to fetch message count", e);
                }

                // 4. Fetch Calendar Events
                let nextEventDate: Date | null = null;
                try {
                    const eventsData = await scheduleService.getEvents();
                    if (Array.isArray(eventsData)) {
                        const now = new Date();
                        const futureEvent = eventsData.find((e: CalendarEvent) => {
                            if (!e.startDate || !e.startTime) return false;
                            try {
                                const startStr = typeof e.startDate === 'string' ? e.startDate.split('T')[0] : new Date(e.startDate).toISOString().split('T')[0];
                                const eventDate = new Date(`${startStr}T${e.startTime}`);
                                return eventDate > now;
                            } catch (err) {
                                return false;
                            }
                        });

                        if (futureEvent) {
                            const startStr = typeof futureEvent.startDate === 'string' ? futureEvent.startDate.split('T')[0] : new Date(futureEvent.startDate).toISOString().split('T')[0];
                            nextEventDate = new Date(`${startStr}T${futureEvent.startTime}`);
                            setNextEventTitle(futureEvent.title || 'Appointment');
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch events", e);
                }

                setStats({
                    activeCases: activeCount,
                    unreadMessages: unreadCount,
                });

                setUpcomingBooking(nextEventDate);
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
        if (hour < 12) return t('userPortal.greeting.morning');
        if (hour < 17) return t('userPortal.greeting.afternoon');
        return t('userPortal.greeting.evening');
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'active':
            case 'open':
                return 'bg-emerald-100 text-emerald-700';
            case 'pending':
            case 'in progress':
                return 'bg-amber-100 text-amber-700';
            case 'review':
                return 'bg-blue-100 text-blue-700';
            default:
                return 'bg-slate-100 text-slate-700';
        }
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
                
                {/* Welcome Header */}
                <div className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-200 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                            <p className="text-slate-500 text-sm font-medium mb-1">
                                {currentTime.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
                                {getGreeting()}, {userName}! 👋
                            </h1>
                            <p className="text-slate-500 mt-2">{t('userPortal.subtitle')}</p>
                        </div>
                        <div className="flex gap-3">
                            <Link 
                                to="/portal/cases"
                                className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2"
                            >
                                <CaseIcon /> {t('userPortal.viewCases')}
                            </Link>
                            <Link 
                                to="/portal/messages"
                                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2"
                            >
                                <MessageIcon /> {t('userPortal.messagesBtn')}
                                {stats?.unreadMessages > 0 && (
                                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{stats.unreadMessages}</span>
                                )}
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow group">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                <CaseIcon />
                            </div>
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{t('userPortal.active')}</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stats?.activeCases || 0}</p>
                        <p className="text-sm text-slate-500 mt-1">{t('userPortal.activeCases')}</p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow group">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                                <MessageIcon />
                            </div>
                            {stats?.unreadMessages > 0 && (
                                <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">{t('userPortal.new')}</span>
                            )}
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stats?.unreadMessages || 0}</p>
                        <p className="text-sm text-slate-500 mt-1">{t('userPortal.unreadMessages')}</p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow group">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-11 h-11 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                <CalendarIcon />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">
                            {upcomingBooking && !isNaN(upcomingBooking.getTime())
                                ? upcomingBooking.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
                                : '—'}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">{t('userPortal.nextHearing')}</p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow group">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                <WalletIcon />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">₹0</p>
                        <p className="text-sm text-slate-500 mt-1">{t('userPortal.dueAmount')}</p>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Active Matters - Takes 2 columns */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                    <FolderIcon />
                                </div>
                                <h3 className="font-bold text-slate-900">{t('userPortal.activeMatters')}</h3>
                            </div>
                            <Link to="/portal/cases" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                                {t('userPortal.viewAll')} <ArrowRightIcon />
                            </Link>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {activeCases && activeCases.map((caseItem: Case) => (
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
                                                <p className="text-sm text-slate-500 mt-0.5">
                                                    {caseItem.caseNumber || `Case #${caseItem._id.slice(-6)}`}
                                                </p>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${getStatusColor(caseItem.status)}`}>
                                                        {caseItem.status}
                                                    </span>
                                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                                        <ClockIcon />
                                                        {caseItem.createdAt ? new Date(caseItem.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right hidden sm:block">
                                            <div className="w-16 h-16">
                                                <svg viewBox="0 0 36 36" className="w-full h-full">
                                                    <path
                                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                        fill="none"
                                                        stroke="#e2e8f0"
                                                        strokeWidth="3"
                                                    />
                                                    <path
                                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                        fill="none"
                                                        stroke="#6366f1"
                                                        strokeWidth="3"
                                                        strokeDasharray="50, 100"
                                                        strokeLinecap="round"
                                                    />
                                                    <text x="18" y="20.5" textAnchor="middle" className="text-xs font-bold fill-slate-700">50%</text>
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                            {activeCases.length === 0 && (
                                <div className="p-8 text-center">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FolderIcon />
                                    </div>
                                    <p className="font-semibold text-slate-900">{t('userPortal.noActiveCases')}</p>
                                    <p className="text-sm text-slate-500 mt-1">{t('userPortal.noActiveCasesDesc')}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        
                        {/* Upcoming Appointment */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <div className="flex items-center gap-2">
                                    <CalendarIcon />
                                    <h3 className="font-bold text-slate-900">{t('userPortal.upcoming')}</h3>
                                </div>
                                <Link to="/portal/calendar" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">{t('userPortal.viewAll')}</Link>
                            </div>
                            <div className="p-5">
                                {upcomingBooking && !isNaN(upcomingBooking.getTime()) ? (
                                    <div className="flex gap-4 items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <div className="text-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm min-w-[60px]">
                                            <span className="block text-xs font-bold text-indigo-600 uppercase">
                                                {upcomingBooking.toLocaleDateString('en-IN', { month: 'short' })}
                                            </span>
                                            <span className="block text-2xl font-bold text-slate-900">
                                                {upcomingBooking.getDate()}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-900">{nextEventTitle}</p>
                                            <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                                <ClockIcon />
                                                {upcomingBooking.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <CalendarIcon />
                                        </div>
                                        <p className="text-sm text-slate-500">{t('userPortal.noUpcoming')}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                                <BellIcon />
                                <h3 className="font-bold text-slate-900">{t('userPortal.recentActivity')}</h3>
                            </div>
                            <div className="p-5">
                                <div className="space-y-4">
                                    {activities && activities.map((act, idx) => (
                                        <div className="flex items-start gap-3" key={idx}>
                                            <div className="mt-0.5">
                                                <CheckCircleIcon />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-slate-900 line-clamp-2">{act.description}</p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {new Date(act.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {activities.length === 0 && (
                                        <div className="text-center py-4">
                                            <p className="text-sm text-slate-500">{t('userPortal.noRecentActivity')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                            <h3 className="font-bold text-slate-900 mb-4">{t('userPortal.quickActions')}</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <Link 
                                    to="/portal/billing"
                                    className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-center group"
                                >
                                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 mx-auto mb-2 group-hover:scale-110 transition-transform">
                                        <WalletIcon />
                                    </div>
                                    <p className="text-xs font-semibold text-slate-700">{t('userPortal.billing')}</p>
                                </Link>
                                <Link 
                                    to="/portal/calendar"
                                    className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-center group"
                                >
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform">
                                        <CalendarIcon />
                                    </div>
                                    <p className="text-xs font-semibold text-slate-700">{t('userPortal.schedule')}</p>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PortalLayout>
    );
};

export default UserPortal;
