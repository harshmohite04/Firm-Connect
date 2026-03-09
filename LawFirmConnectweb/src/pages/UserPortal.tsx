import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PortalLayout from '../components/PortalLayout';
import portalService from '../services/portalService';
import type { DashboardData, AttentionItem, DashboardEvent } from '../services/portalService';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axios from 'axios';
import {
    Sparkles, Briefcase, Mail, Calendar, AlertCircle, Clock,
    ArrowRight, FileText, Activity, Video, CheckCircle, Users
} from 'lucide-react';

const UserPortal: React.FC = () => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [userName, setUserName] = useState('');
    const { t } = useTranslation();

    // Handle Razorpay redirect return URL params
    const [searchParams] = useSearchParams();
    useEffect(() => {
        const subscription = searchParams.get('subscription');
        const seat = searchParams.get('seat');

        if (subscription === 'success') {
            // Refresh user data from backend
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const userStr = localStorage.getItem('user');
            const token = userStr ? JSON.parse(userStr).token : null;
            if (token) {
                axios.get(`${apiUrl}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
                    .then(({ data }) => {
                        if (data.success) {
                            const updated = { ...data.user, token };
                            localStorage.setItem('user', JSON.stringify(updated));
                            setUserName(updated.firstName || 'User');
                        }
                    })
                    .catch(() => {});
            }
            toast.success('Subscription activated successfully!');
        } else if (subscription === 'failed') {
            toast.error('Subscription payment failed. Please try again.');
        }

        if (seat === 'success') {
            toast.success('Seat purchased successfully! Invite email sent.');
        } else if (seat === 'failed') {
            toast.error('Seat purchase failed. Please try again.');
        }

        // Clean URL params
        if (subscription || seat) {
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setUserName(user.firstName || 'User');
            } catch { setUserName('User'); }
        } else {
            setUserName('User');
        }

        const fetchDashboard = async () => {
            try {
                const dashboardData = await portalService.getDashboard();
                setData(dashboardData);
            } catch (err: any) {
                console.error('Failed to load dashboard:', err);
                setError(err.message || 'Failed to load dashboard');
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('userPortal.greeting.morning');
        if (hour < 17) return t('userPortal.greeting.afternoon');
        return t('userPortal.greeting.evening');
    };

    const getRelativeTime = (dateStr: string) => {
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'document_uploaded': return <FileText className="w-4 h-4" />;
            case 'status_changed': return <Activity className="w-4 h-4" />;
            case 'team_member_added': return <Users className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    const formatEventTime = (event: DashboardEvent) => {
        if (!event.startTime) return event.allDay ? 'All day' : '';
        const fmt = (t: string) => {
            const [h, m] = t.split(':');
            const hr = parseInt(h);
            const ampm = hr >= 12 ? 'PM' : 'AM';
            return `${hr % 12 || 12}:${m} ${ampm}`;
        };
        return event.endTime ? `${fmt(event.startTime)} - ${fmt(event.endTime)}` : fmt(event.startTime);
    };

    const getTodayEvents = (events: DashboardEvent[]) => {
        const today = new Date().toISOString().split('T')[0];
        return events.filter(e => {
            const eventDate = typeof e.startDate === 'string'
                ? e.startDate.split('T')[0]
                : new Date(e.startDate).toISOString().split('T')[0];
            return eventDate === today;
        });
    };

    const renderAttentionItem = (item: AttentionItem, idx: number) => {
        switch (item.type) {
            case 'overdue_case':
                return (
                    <Link
                        key={idx}
                        to={`/portal/cases/${item.caseId}`}
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-[var(--color-bg-secondary)] transition-colors"
                    >
                        <div className="mt-0.5 p-1.5 rounded-lg" style={{ backgroundColor: 'var(--color-warning)', opacity: 0.15 }}>
                            <AlertCircle className="w-4 h-4" style={{ color: 'var(--color-warning)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                {t('userPortal.overdueCase', { title: item.title, days: item.daysSinceActivity })}
                            </p>
                        </div>
                    </Link>
                );
            case 'upcoming_deadline':
                return (
                    <Link
                        key={idx}
                        to="/portal/calendar"
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-[var(--color-bg-secondary)] transition-colors"
                    >
                        <div className="mt-0.5 p-1.5 rounded-lg" style={{ backgroundColor: 'var(--color-info)', opacity: 0.15 }}>
                            <Calendar className="w-4 h-4" style={{ color: 'var(--color-info)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                {t('userPortal.upcomingDeadline', { title: item.title, time: item.startsIn })}
                            </p>
                        </div>
                    </Link>
                );
            case 'unread_messages':
                return (
                    <Link
                        key={idx}
                        to="/portal/messages"
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-[var(--color-bg-secondary)] transition-colors"
                    >
                        <div className="mt-0.5 p-1.5 rounded-lg" style={{ backgroundColor: 'var(--color-accent)', opacity: 0.15 }}>
                            <Mail className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                {t('userPortal.unreadMessages')}: {item.count}
                            </p>
                        </div>
                    </Link>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <PortalLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4"
                            style={{ borderColor: 'var(--color-surface-border)', borderTopColor: 'var(--color-accent)' }} />
                        <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                            {t('userPortal.loading')}
                        </p>
                    </div>
                </div>
            </PortalLayout>
        );
    }

    if (error) {
        return (
            <PortalLayout>
                <div className="p-10 text-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                        style={{ backgroundColor: 'var(--color-danger)', opacity: 0.1 }}>
                        <AlertCircle className="w-8 h-8" style={{ color: 'var(--color-danger)' }} />
                    </div>
                    <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                        {t('userPortal.error')}
                    </h3>
                    <p style={{ color: 'var(--color-text-secondary)' }}>{error}</p>
                </div>
            </PortalLayout>
        );
    }

    const stats = data?.stats;
    const todayEvents = getTodayEvents(data?.upcomingEvents || []);

    const statCards = [
        {
            label: t('userPortal.activeCases'),
            value: stats?.activeCases || 0,
            icon: <Briefcase className="w-5 h-5" />,
            link: '/portal/cases',
            accent: 'var(--color-success)',
        },
        {
            label: t('userPortal.pendingCases'),
            value: stats?.pendingCases || 0,
            icon: <Clock className="w-5 h-5" />,
            link: '/portal/cases',
            accent: 'var(--color-warning)',
        },
        {
            label: t('userPortal.unreadMessages'),
            value: stats?.unreadMessages || 0,
            icon: <Mail className="w-5 h-5" />,
            link: '/portal/messages',
            accent: 'var(--color-accent)',
            badge: (stats?.unreadMessages || 0) > 0 ? t('userPortal.new') : undefined,
        },
        {
            label: t('userPortal.upcomingEvents'),
            value: stats?.upcomingEvents || 0,
            icon: <Calendar className="w-5 h-5" />,
            link: '/portal/calendar',
            accent: 'var(--color-info)',
        },
    ];

    return (
        <PortalLayout>
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Welcome Bar */}
                <div className="relative p-6 rounded-2xl overflow-hidden"
                    style={{ background: 'var(--gradient-hero-bg)', border: '1px solid var(--color-surface-border)' }}>
                    <Sparkles className="absolute top-4 right-4 w-16 h-16 opacity-20"
                        style={{ color: 'var(--color-accent)' }} />
                    <h1 className="text-2xl lg:text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        {getGreeting()}, {userName}
                    </h1>
                    <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('userPortal.subtitle')}
                    </p>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {statCards.map((card) => (
                        <Link
                            key={card.label}
                            to={card.link}
                            className="rounded-xl p-5 transition-shadow hover:shadow-lg group"
                            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-surface-border)' }}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                                    {card.label}
                                </span>
                                {card.badge && (
                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                                        style={{ backgroundColor: card.accent + '15', color: card.accent, border: `1px solid ${card.accent}30` }}>
                                        {card.badge}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-end gap-3">
                                <p className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                    {card.value}
                                </p>
                                <div className="p-2 rounded-lg mb-1" style={{ backgroundColor: card.accent + '15', color: card.accent }}>
                                    {card.icon}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Main Content: Needs Attention + Today's Schedule */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Needs Your Attention */}
                    <div className="lg:col-span-2 rounded-xl overflow-hidden"
                        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-surface-border)' }}>
                        <div className="px-6 py-4 flex items-center gap-2"
                            style={{ borderBottom: '1px solid var(--color-surface-border)' }}>
                            <AlertCircle className="w-5 h-5" style={{ color: 'var(--color-warning)' }} />
                            <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                {t('userPortal.needsAttention')}
                            </h3>
                        </div>
                        <div className="px-3 py-2">
                            {(data?.needsAttention || []).length > 0 ? (
                                data!.needsAttention.map((item, idx) => renderAttentionItem(item, idx))
                            ) : (
                                <div className="flex items-center gap-3 p-6 justify-center">
                                    <CheckCircle className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
                                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                                        {t('userPortal.allCaughtUp')}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Today's Schedule + AI Insights */}
                    <div className="space-y-6">
                        {/* Today's Schedule */}
                        <div className="rounded-xl overflow-hidden"
                            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-surface-border)' }}>
                            <div className="px-5 py-4 flex items-center justify-between"
                                style={{ borderBottom: '1px solid var(--color-surface-border)' }}>
                                <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                    {t('userPortal.todaySchedule')}
                                </h3>
                                <Link to="/portal/calendar" className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-bg-secondary)]"
                                    style={{ color: 'var(--color-text-secondary)' }}>
                                    <Calendar className="w-4 h-4" />
                                </Link>
                            </div>
                            <div className="px-5 py-3 space-y-3">
                                {todayEvents.length > 0 ? todayEvents.map((event) => (
                                    <div key={event._id} className="flex items-start gap-3 p-2 rounded-lg">
                                        <div className="text-xs font-bold whitespace-nowrap mt-0.5 min-w-[60px]"
                                            style={{ color: 'var(--color-accent)' }}>
                                            {event.startTime ? formatEventTime({ ...event, endTime: undefined } as DashboardEvent) : 'All day'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                                                {event.title}
                                            </p>
                                            {event.isOnlineMeeting && event.meetingLink && (
                                                <a
                                                    href={event.meetingLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs font-medium mt-1"
                                                    style={{ color: 'var(--color-accent)' }}
                                                >
                                                    <Video className="w-3 h-3" /> Join Meeting
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-6">
                                        <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--color-text-secondary)', opacity: 0.4 }} />
                                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                            {t('userPortal.noEventsToday')}
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="px-5 pb-4">
                                <Link to="/portal/calendar"
                                    className="inline-flex items-center gap-1 text-sm font-semibold transition-colors"
                                    style={{ color: 'var(--color-accent)' }}>
                                    {t('userPortal.viewAll')} <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        </div>

                        {/* AI Insights */}
                        <div className="rounded-xl overflow-hidden"
                            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-surface-border)' }}>
                            <div className="px-5 py-4 flex items-center gap-2"
                                style={{ borderBottom: '1px solid var(--color-surface-border)' }}>
                                <Sparkles className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                                <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                    AI Insights
                                </h3>
                            </div>
                            <div className="px-5 py-3 space-y-3">
                                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--color-warning)' }} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                                Potential Conflict Detected
                                            </p>
                                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                                                Two of your cases may have overlapping parties. Review recommended.
                                            </p>
                                            <button className="text-xs font-semibold mt-2 transition-colors"
                                                style={{ color: 'var(--color-accent)' }}>
                                                Review Cases
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                                    <div className="flex items-start gap-2">
                                        <FileText className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--color-info)' }} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                                Drafting Assistant Ready
                                            </p>
                                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                                                3 documents are pending review. AI can help draft responses.
                                            </p>
                                            <button className="text-xs font-semibold mt-2 transition-colors"
                                                style={{ color: 'var(--color-accent)' }}>
                                                Open Assistant
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                                    <div className="flex items-start gap-2">
                                        <Calendar className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--color-success)' }} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                                Calendar Optimization
                                            </p>
                                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                                                You have 2 back-to-back meetings tomorrow. Consider adding buffer time.
                                            </p>
                                            <button className="text-xs font-semibold mt-2 transition-colors"
                                                style={{ color: 'var(--color-accent)' }}>
                                                View Calendar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="rounded-xl overflow-hidden"
                    style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-surface-border)' }}>
                    <div className="px-6 py-4 flex items-center gap-2"
                        style={{ borderBottom: '1px solid var(--color-surface-border)' }}>
                        <Activity className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                        <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                            {t('userPortal.recentActivity')}
                        </h3>
                    </div>
                    <div className="px-6 py-3">
                        {(data?.recentActivity || []).length > 0 ? (
                            <div className="divide-y" style={{ borderColor: 'var(--color-surface-border)' }}>
                                {data!.recentActivity.slice(0, 8).map((activity, idx) => (
                                    <Link
                                        key={idx}
                                        to={`/portal/cases/${activity.caseId}`}
                                        className="flex items-start gap-3 py-3 hover:bg-[var(--color-bg-secondary)] rounded-lg px-2 -mx-2 transition-colors"
                                    >
                                        <div className="mt-0.5 p-1.5 rounded-lg"
                                            style={{ backgroundColor: 'var(--color-accent)' + '15', color: 'var(--color-accent)' }}>
                                            {getActivityIcon(activity.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                                                {activity.description}
                                            </p>
                                            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                                                {activity.caseTitle}
                                            </p>
                                        </div>
                                        <span className="text-xs whitespace-nowrap shrink-0 mt-0.5"
                                            style={{ color: 'var(--color-text-secondary)' }}>
                                            {getRelativeTime(activity.createdAt)}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Activity className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--color-text-secondary)', opacity: 0.4 }} />
                                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                    {t('userPortal.noRecentActivity')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PortalLayout>
    );
};

export default UserPortal;
