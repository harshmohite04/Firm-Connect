import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { messageService } from '../services/messageService';
import { notificationService } from '../services/notificationService';
import caseService from '../services/caseService';
import scheduleService from '../services/scheduleService';
import organizationService from '../services/organizationService';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import Logo from "../assets/logo.svg"

const SunIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

const MoonIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
);
// Icons
const HomeIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
)
const CaseIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
)

const BillingIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
)
const CalendarIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
)
const MessageIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
)
const SearchIcon = () => (
    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
)
const BellIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
)

// Notification type
interface Notification {
    _id: string;
    type: 'case' | 'message' | 'calendar' | 'billing' | 'system';
    title: string;
    description: string;
    createdAt: string;
    read: boolean;
    link?: string;
    metadata?: any;
}

// Format relative time from ISO date string
const formatRelativeTime = (dateStr: string): string => {
    const now = Date.now();
    const diff = now - new Date(dateStr).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(dateStr).toLocaleDateString();
};

const PortalLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { t } = useTranslation();
    const { isDark, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const [user, setUser] = React.useState<any>(null);
    const [initials, setInitials] = React.useState('U');

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any>({ cases: [], messages: [], events: [], documents: [] });
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Real data for search
    const [realCases, setRealCases] = useState<any[]>([]);
    const [realConversations, setRealConversations] = useState<any[]>([]);
    const [realEvents, setRealEvents] = useState<any[]>([]);
    const [realMembers, setRealMembers] = useState<any[]>([]);

    // Notification State
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const notificationRef = useRef<HTMLDivElement>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [, setTimeTick] = useState(0);

    // Fetch notifications from API on mount
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const data = await notificationService.getNotifications();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            } catch (error) {
                console.error('Failed to fetch notifications', error);
            }
        };
        fetchNotifications();
    }, []);

    // Periodic tick to refresh relative time strings
    useEffect(() => {
        const interval = setInterval(() => {
            setTimeTick(prev => prev + 1);
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const dismissNotification = useCallback((e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setNotifications(prev => prev.filter(n => n._id !== id));
        setUnreadCount(prev => {
            const dismissed = notifications.find(n => n._id === id);
            return dismissed && !dismissed.read ? Math.max(0, prev - 1) : prev;
        });
        notificationService.dismiss(id).catch(console.error);
    }, [notifications]);

    const clearAllNotifications = useCallback(() => {
        setNotifications([]);
        setUnreadCount(0);
        notificationService.clearAll().catch(console.error);
    }, []);

    // Unread messages count for Messages tab
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
    const socketRef = useRef<Socket | null>(null);

    // Mobile responsiveness state
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Sidebar open/close state - persisted in localStorage (desktop only)
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        const saved = localStorage.getItem('sidebarOpen');
        return saved !== null ? JSON.parse(saved) : true;
    });

    // Persist sidebar state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen));
    }, [sidebarOpen]);

    // Handle responsive breakpoint
    useEffect(() => {
        const handleResize = () => {
            const newIsMobile = window.innerWidth < 768;
            setIsMobile(newIsMobile);
            // Close mobile menu when switching to desktop
            if (!newIsMobile) {
                setMobileMenuOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Socket.IO for real-time unread count updates
    useEffect(() => {
        // Initial fetch
        const fetchUnreadCount = async () => {
            try {
                const data = await messageService.getUnreadCount();
                setUnreadMessagesCount(data.count || 0);
            } catch (error) {
                console.error('Failed to fetch unread messages count', error);
            }
        };
        fetchUnreadCount();

        // Get user ID for socket room
        const storedUser = localStorage.getItem('user');
        if (!storedUser) return;
        const parsedUser = JSON.parse(storedUser);
        const currentUserId = parsedUser._id || parsedUser.id;

        // Connect to socket
        const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        socketRef.current = io(BACKEND_URL, {
            transports: ['websocket', 'polling']
        });

        socketRef.current.emit('join', currentUserId);

        // When new message arrives for me, increment count
        socketRef.current.on('newMessage', (msg: any) => {
            if (msg.recipient === currentUserId) {
                setUnreadMessagesCount(prev => prev + 1);
            }
        });

        // When I read messages, refetch the count
        socketRef.current.on('messagesRead', () => {
            fetchUnreadCount();
        });

        // Listen for real-time notifications
        socketRef.current.on('newNotification', (notification: Notification) => {
            setNotifications(prev => [notification, ...prev].slice(0, 50));
            setUnreadCount(prev => prev + 1);
            toast(notification.title + ': ' + notification.description, {
                duration: 3000,
                style: { fontSize: '13px', maxWidth: '360px' },
            });
        });

        // Single-device session enforcement: kicked out by another login
        socketRef.current.on('session_expired', () => {
            toast.error("You've been logged out because your account was signed in on another device.");
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/signin';
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    // Fetch real data for search on mount
    useEffect(() => {
        const fetchSearchData = async () => {
            try {
                const [cases, conversations, events, membersData] = await Promise.allSettled([
                    caseService.getCases(),
                    messageService.getConversations(),
                    scheduleService.getEvents(),
                    organizationService.getMembers(),
                ]);
                if (cases.status === 'fulfilled' && Array.isArray(cases.value)) setRealCases(cases.value);
                if (conversations.status === 'fulfilled' && Array.isArray(conversations.value)) setRealConversations(conversations.value);
                if (events.status === 'fulfilled' && Array.isArray(events.value)) setRealEvents(events.value);
                if (membersData.status === 'fulfilled' && membersData.value?.members) setRealMembers(membersData.value.members);
            } catch (err) {
                console.error('Failed to fetch search data', err);
            }
        };
        fetchSearchData();
    }, []);

    // Debounce search query (300ms)
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    React.useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            if (parsedUser.firstName && parsedUser.lastName) {
                setInitials(`${parsedUser.firstName[0]}${parsedUser.lastName[0]}`.toUpperCase());
            } else if (parsedUser.firstName) {
                setInitials(parsedUser.firstName[0].toUpperCase());
            }
        }

        // Click outside to close search & notifications
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        };
        // Keyboard: ESC to close search & notifications
        const handleEscKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setShowResults(false);
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscKey);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscKey);
        };
    }, []);

    // Search Logic (uses debounced query and real data)
    useEffect(() => {
        if (!debouncedQuery.trim()) {
            setSearchResults({ cases: [], messages: [], events: [], documents: [] });
            return;
        }

        const query = debouncedQuery.toLowerCase();

        const cases = realCases.filter((c: any) =>
            (c.title && c.title.toLowerCase().includes(query)) ||
            (c.description && c.description.toLowerCase().includes(query)) ||
            (c.clientName && c.clientName.toLowerCase().includes(query))
        ).slice(0, 3);

        const messages = realConversations.filter((m: any) => {
            const name = m.contactName || m.sender || '';
            const content = m.lastMessage || m.content || '';
            return name.toLowerCase().includes(query) || content.toLowerCase().includes(query);
        }).slice(0, 3);

        const events = realEvents.filter((e: any) =>
            e.title && e.title.toLowerCase().includes(query)
        ).slice(0, 3);

        const docs: any[] = [];
        realCases.forEach((c: any) => {
            if (c.documents) {
                c.documents.forEach((d: any) => {
                    if (d.name && d.name.toLowerCase().includes(query)) {
                        docs.push({ ...d, caseId: c._id, caseTitle: c.title });
                    }
                });
            }
        });

        setSearchResults({ cases, messages, events, documents: docs.slice(0, 3) });
    }, [debouncedQuery, realCases, realConversations, realEvents]);

    const isActive = (path: string) => {
        return location.pathname === path || (path !== '/portal' && location.pathname.startsWith(path));
    };

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n._id === id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        notificationService.markAsRead(id).catch(console.error);
    };

    const markAllAsRead = () => {
        setNotifications(prev =>
            prev.map(n => ({ ...n, read: true }))
        );
        setUnreadCount(0);
        notificationService.markAllAsRead().catch(console.error);
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read) {
            markAsRead(notification._id);
        }
        setShowNotifications(false);
        if (notification.link) {
            navigate(notification.link);
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'case':
                return (
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <CaseIcon />
                    </div>
                );
            case 'message':
                return (
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                        <MessageIcon />
                    </div>
                );
            case 'calendar':
                return (
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                        <CalendarIcon />
                    </div>
                );
            case 'billing':
                return (
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                        <BillingIcon />
                    </div>
                );
            default:
                return (
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
                        <BellIcon />
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen flex font-sans transition-colors duration-200" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>

            {/* Mobile Menu Backdrop */}
            {isMobile && mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-40 md:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            <aside className={`${isMobile ? (mobileMenuOpen ? 'translate-x-0' : '-translate-x-full') : (sidebarOpen ? 'w-64' : 'w-16')} ${isMobile ? 'fixed inset-y-0 left-0 w-64' : 'relative'} flex flex-col z-50 transition-all duration-300 ease-in-out md:z-10 md:relative md:translate-x-0`} style={{ backgroundColor: 'var(--color-surface)', borderRight: '1px solid var(--color-surface-border)' }}>
                {/* Logo */}
                <div className={`h-16 md:h-16 flex items-center ${isMobile ? 'px-4 gap-3' : (sidebarOpen ? 'px-6 gap-3' : 'justify-center')} cursor-pointer relative`} onClick={() => window.location.href = '/'}>
                    <img src={Logo} alt="LawFirmAI" style={{width:"2.5rem" , height:"2.5rem"}}/>
                    {(isMobile || sidebarOpen) && (
                        <div>
                            <h1 className="font-bold leading-none text-sm md:text-base" style={{ color: 'var(--color-text-primary)' }}>LawFirmAI</h1>
                            <span className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>Legal Portal</span>
                        </div>
                    )}
                </div>

                {/* Toggle Button - Desktop only */}
                {!isMobile && (
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="absolute -right-4 top-6 w-10 h-10 rounded-full flex items-center justify-center shadow-md hover:shadow-lg focus:outline-none transition-all duration-200 z-20 hidden md:flex"
                        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-surface-border)', color: 'var(--color-text-secondary)' }}
                        title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                    >
                        <svg className={`w-4 h-4 transition-transform duration-300 ease-in-out ${sidebarOpen ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                )}

                {/* Nav Links */}
                <nav className={`flex-1 ${isMobile ? 'px-4' : 'px-3'} py-6 space-y-1`}>
                    <Link to="/portal" className={`flex items-center ${isMobile || sidebarOpen ? 'gap-3 px-3' : 'justify-center px-0'} py-2.5 rounded-lg font-medium text-sm transition-colors ${isActive('/portal') && location.pathname === '/portal' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`} title={(!isMobile && !sidebarOpen) ? t('portal.sidebar.home') : undefined}>
                        <HomeIcon /> {sidebarOpen && <span>{t('portal.sidebar.home')}</span>}
                    </Link>
                    <Link to="/portal/cases" className={`flex items-center ${isMobile || sidebarOpen ? 'gap-3 px-3' : 'justify-center px-0'} py-2.5 rounded-lg font-medium text-sm transition-colors ${isActive('/portal/cases') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`} title={(!isMobile && !sidebarOpen) ? t('portal.sidebar.myCases') : undefined}>
                        <CaseIcon /> {sidebarOpen && <span>{t('portal.sidebar.myCases')}</span>}
                    </Link>
                    <Link to="/portal/case-law" className={`flex items-center ${isMobile || sidebarOpen ? 'gap-3 px-3' : 'justify-center px-0'} py-2.5 rounded-lg font-medium text-sm transition-colors ${isActive('/portal/case-law') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`} title={(!isMobile && !sidebarOpen) ? t('portal.sidebar.caseLaw') : undefined}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                        {sidebarOpen && <span>{t('portal.sidebar.caseLaw')}</span>}
                    </Link>

                    <Link to="/portal/calendar" className={`flex items-center ${isMobile || sidebarOpen ? 'gap-3 px-3' : 'justify-center px-0'} py-2.5 rounded-lg font-medium text-sm transition-colors ${isActive('/portal/calendar') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`} title={(!isMobile && !sidebarOpen) ? t('portal.sidebar.calendar') : undefined}>
                        <CalendarIcon /> {sidebarOpen && <span>{t('portal.sidebar.calendar')}</span>}
                    </Link>
                    <Link to="/portal/messages" className={`flex items-center ${isMobile || sidebarOpen ? 'justify-between px-3' : 'justify-center px-0'} relative py-2.5 rounded-lg font-medium text-sm transition-colors ${isActive('/portal/messages') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`} title={(!isMobile && !sidebarOpen) ? t('portal.sidebar.messages') : undefined}>
                        <div className="flex items-center gap-3">
                            <MessageIcon /> {sidebarOpen && <span>{t('portal.sidebar.messages')}</span>}
                        </div>
                        {unreadMessagesCount > 0 && (
                            sidebarOpen ? (
                                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                                    {unreadMessagesCount}
                                </span>
                            ) : (
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                            )
                        )}
                    </Link>

                    {/* Firm Management Section */}
                    <div className="pt-4 mt-4" style={{ borderTop: '1px solid var(--color-surface-border)' }}>
                        {(isMobile || sidebarOpen) && <div className="px-3 mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Firm</div>}
                        <Link to="/portal/firm-connect" className={`flex items-center ${isMobile || sidebarOpen ? 'gap-3 px-3' : 'justify-center px-0'} py-2.5 rounded-lg font-medium text-sm transition-colors ${isActive('/portal/firm-connect') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`} title={(!isMobile && !sidebarOpen) ? 'Firm Connect' : undefined}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            {sidebarOpen && <span>Firm Connect</span>}
                        </Link>
                        {user?.role === 'ADMIN' && (
                            <Link to="/portal/organization" className={`flex items-center ${isMobile || sidebarOpen ? 'gap-3 px-3' : 'justify-center px-0'} py-2.5 rounded-lg font-medium text-sm transition-colors ${isActive('/portal/organization') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`} title={(!isMobile && !sidebarOpen) ? 'Organization' : undefined}>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                {sidebarOpen && <span>Organization</span>}
                            </Link>
                        )}
                    </div>
                </nav>

                {/* User Profile */}
                <div className={`p-4 ${!sidebarOpen ? 'flex justify-center' : ''}`} style={{ borderTop: '1px solid var(--color-surface-border)' }}>
                    <div className={`flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'}`}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm cursor-pointer" style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }} onClick={() => navigate('/portal/profile')} title={!sidebarOpen ? `${user?.firstName} ${user?.lastName}` : undefined}>
                            {initials}
                        </div>
                        {sidebarOpen && (
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate('/portal/profile')}>
                                <p className="text-sm font-bold truncate transition-colors" style={{ color: 'var(--color-text-primary)' }}>{user ? `${user.firstName} ${user.lastName}` : 'Loading...'}</p>
                                <p className="text-xs truncate" style={{ color: 'var(--color-text-tertiary)' }}>{user?.role === 'ADMIN' ? 'Admin' : 'Attorney'}</p>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 min-w-0 h-screen flex flex-col overflow-hidden transition-all duration-300 ease-in-out`}>

                {/* Top Header */}
                <header className="h-16 shrink-0 px-4 md:px-6 flex items-center gap-4 z-20" style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-surface-border)' }}>
                    {/* Hamburger Menu - Mobile Only */}
                    {isMobile && (
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="p-2 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0 md:hidden"
                            title="Toggle menu"
                            aria-label="Toggle menu"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    )}

                    <div className="flex-1 flex justify-center min-w-0">
                        <div className={`${isMobile ? 'w-full' : 'w-full max-w-2xl'} relative`} ref={searchRef}>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <SearchIcon />
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setShowResults(true);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') {
                                            setSearchQuery('');
                                            setShowResults(false);
                                            (e.target as HTMLInputElement).blur();
                                        }
                                    }}
                                    onFocus={() => setShowResults(true)}
                                    placeholder={t('portal.header.searchPlaceholder')}
                                    className="block w-full pl-11 pr-4 py-2.5 rounded-xl leading-5 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all shadow-sm"
                                    style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-surface-border)', color: 'var(--color-text-primary)' }}
                                />
                            </div>

                            {/* Search Results Dropdown */}
                            {showResults && (
                                <div className="absolute top-full left-0 right-0 mt-2 rounded-xl shadow-2xl max-h-[80vh] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-surface-border)' }}>

                                    {!searchQuery.trim() ? (
                                        // Default View (Suggestions)
                                        <div className="p-4">

                                            {/* People Section */}
                                            {realMembers.length > 0 && (
                                            <div className="mb-6">
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t('portal.header.people')}</div>
                                                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                                                    {realMembers.slice(0, 5).map((member: any, i: number) => {
                                                        const name = `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email || 'User';
                                                        const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                                                        return (
                                                            <div
                                                                key={member._id || i}
                                                                className="flex flex-col items-center gap-1 min-w-[70px] cursor-pointer group"
                                                                onClick={() => {
                                                                    navigate(`/portal/messages?contact=${name}`);
                                                                    setShowResults(false);
                                                                }}
                                                            >
                                                                <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-blue-100 text-slate-600 group-hover:text-blue-600 flex items-center justify-center font-bold text-lg transition-colors ring-2 ring-white shadow-sm">
                                                                    {initials}
                                                                </div>
                                                                <span className="text-[10px] font-medium text-slate-600 text-center leading-tight group-hover:text-blue-600">
                                                                    {name.split(' ')[0]}<br />{name.split(' ')[1] || ''}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            )}

                                            {/* Recent/Suggested Files */}
                                            <div>
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('portal.header.suggestions')}</div>
                                                <div className="space-y-1">
                                                    {realCases.slice(0, 2).flatMap((c: any) =>
                                                        (c.documents || []).slice(0, 1).map((doc: any, i: number) => (
                                                            <div
                                                                key={`${c._id}-${i}`}
                                                                onClick={() => { navigate(`/portal/cases/${c._id}?tab=documents`); setShowResults(false); }}
                                                                className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer group"
                                                            >
                                                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.414.586l5.414 5.414a1 1 0 01.586 1.414V19a2 2 0 01-2 2z" /></svg>
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-medium text-slate-900 group-hover:text-blue-700">{doc.name}</div>
                                                                    <div className="text-xs text-slate-500">{c.title}</div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                    <div
                                                        onClick={() => { navigate(`/portal/calendar`); setShowResults(false); }}
                                                        className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer group"
                                                    >
                                                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                                            <CalendarIcon />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-slate-900 group-hover:text-purple-700">{t('portal.header.upcomingHearings')}</div>
                                                            <div className="text-xs text-slate-500">{t('portal.header.checkCalendar')}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    ) : (
                                        // Results View
                                        <>
                                            {Object.values(searchResults).every((arr: any) => arr.length === 0) ? (
                                                <div className="p-8 text-center text-slate-500">
                                                    {t('portal.header.noResults')} "{searchQuery}"
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Cases */}
                                                    {searchResults.cases.length > 0 && (
                                                        <div className="p-2">
                                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 py-2">{t('portal.header.cases')}</div>
                                                            {searchResults.cases.map((c: any) => (
                                                                <div
                                                                    key={c._id}
                                                                    onClick={() => { navigate(`/portal/cases/${c._id}`); setShowResults(false); }}
                                                                    className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer group"
                                                                >
                                                                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                                        <CaseIcon />
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-sm font-bold text-slate-900">{c.title}</div>
                                                                        <div className="text-xs text-slate-500">{c.status} • {c.clientName}</div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Messages */}
                                                    {searchResults.messages.length > 0 && (
                                                        <div className="p-2">
                                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3   py-2">{t('portal.header.messagesLabel')}</div>
                                                            {searchResults.messages.map((m: any, idx: number) => {
                                                                const name = m.contactName || m.sender || 'Unknown';
                                                                const content = m.lastMessage || m.content || '';
                                                                return (
                                                                    <div
                                                                        key={m._id || m.id || idx}
                                                                        onClick={() => { navigate(`/portal/messages?contact=${name}`); setShowResults(false); }}
                                                                        className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer group"
                                                                    >
                                                                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                                                            {name[0]}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex justify-between">
                                                                                <div className="text-sm font-bold text-slate-900 truncate">{name}</div>
                                                                                <div className="text-xs text-slate-400">{m.time || ''}</div>
                                                                            </div>
                                                                            <div className="text-xs text-slate-500 truncate">{content}</div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {/* Documents */}
                                                    {searchResults.documents.length > 0 && (
                                                        <div className="p-2">
                                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 py-2">{t('portal.header.files')}</div>
                                                            {searchResults.documents.map((d: any, idx: number) => (
                                                                <div
                                                                    key={idx}
                                                                    onClick={() => { navigate(`/portal/cases/${d.caseId}?tab=documents`); setShowResults(false); }}
                                                                    className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer group"
                                                                >
                                                                    <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-colors">
                                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-sm font-bold text-slate-900">{d.name}</div>
                                                                        <div className="text-xs text-slate-500">In {d.caseTitle}</div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Events */}
                                                    {searchResults.events.length > 0 && (
                                                        <div className="p-2">
                                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 py-2">{t('portal.header.calendarLabel')}</div>
                                                            {searchResults.events.map((e: any, idx: number) => {
                                                                const dateStr = e.startDate ? new Date(e.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : (e.date || '');
                                                                const timeStr = e.startTime || e.time || '';
                                                                return (
                                                                    <div
                                                                        key={e._id || e.id || idx}
                                                                        onClick={() => { navigate(`/portal/calendar`); setShowResults(false); }}
                                                                        className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer group"
                                                                    >
                                                                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                                                            <CalendarIcon />
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-sm font-bold text-slate-900">{e.title}</div>
                                                                            <div className="text-xs text-slate-500">{dateStr}{timeStr ? ` • ${timeStr}` : ''}</div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notification Bell */}
                    <div className="flex items-center gap-3 flex-none ml-2" ref={notificationRef}>
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg transition-colors cursor-pointer"
                            style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-accent-soft)' }}
                            aria-label="Toggle theme"
                        >
                            {isDark ? <SunIcon /> : <MoonIcon />}
                        </button>

                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="relative p-2 rounded-lg transition-colors"
                            style={{ color: 'var(--color-text-secondary)' }}
                        >
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                    {unreadCount}
                                </span>
                            )}
                            <BellIcon />
                        </button>

                        {/* Notification Dropdown */}
                        {showNotifications && (
                            <div className={`absolute top-16 ${isMobile ? 'inset-x-4 sm:right-4' : 'right-8'} ${isMobile ? 'max-w-full' : 'w-96'} rounded-xl shadow-2xl overflow-hidden z-50`} style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-surface-border)' }}>
                                {/* Header */}
                                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-900">{t('portal.notifications.title')}</h3>
                                        {unreadCount > 0 && (
                                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={markAllAsRead}
                                                className="text-xs font-medium text-blue-600 hover:text-blue-700"
                                            >
                                                {t('portal.notifications.markAllRead')}
                                            </button>
                                        )}
                                        {notifications.length > 0 && (
                                            <button
                                                onClick={clearAllNotifications}
                                                className="text-xs font-medium text-red-500 hover:text-red-600"
                                            >
                                                Clear all
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Notification List */}
                                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                                    {notifications.length === 0 ? (
                                        <div className="px-4 py-12 text-center">
                                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <BellIcon />
                                            </div>
                                            <p className="text-sm font-medium text-slate-500">No notifications</p>
                                            <p className="text-xs text-slate-400 mt-1">You're all caught up!</p>
                                        </div>
                                    ) : (
                                        notifications.map((notification) => (
                                            <div
                                                key={notification._id}
                                                onClick={() => handleNotificationClick(notification)}
                                                className={`p-4 hover:bg-slate-50 cursor-pointer transition-all group ${!notification.read ? 'bg-blue-50/50' : ''}`}
                                            >
                                                <div className="flex gap-3">
                                                    {getNotificationIcon(notification.type)}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <p className={`text-sm ${!notification.read ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                                                                {notification.title}
                                                            </p>
                                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                {!notification.read && (
                                                                    <span className="w-2 h-2 bg-blue-600 rounded-full mt-1.5"></span>
                                                                )}
                                                                <button
                                                                    onClick={(e) => dismissNotification(e, notification._id)}
                                                                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500 transition-all rounded"
                                                                    title="Dismiss"
                                                                >
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                                            {notification.description}
                                                        </p>
                                                        <p className="text-xs text-slate-400 mt-1">
                                                            {formatRelativeTime(notification.createdAt)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Footer */}
                                {notifications.length > 0 && (
                                    <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
                                        <button
                                            onClick={() => {
                                                setShowNotifications(false);
                                            }}
                                            className="w-full text-center text-sm font-medium text-slate-600 hover:text-slate-900"
                                        >
                                            {t('portal.notifications.viewAll')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </header>

                <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8 overflow-y-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default PortalLayout;
