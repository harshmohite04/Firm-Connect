import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { dummyCases, dummyMessages, dummyCalendarEvents } from '../data/dummyData';
import { messageService } from '../services/messageService';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import Logo from "../assets/logo.svg"
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
    id: string;
    type: 'case' | 'message' | 'calendar' | 'billing' | 'system';
    title: string;
    description: string;
    time: string;
    read: boolean;
    link?: string;
}

const PortalLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const [user, setUser] = React.useState<any>(null);
    const [initials, setInitials] = React.useState('U');

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any>({ cases: [], messages: [], events: [], documents: [] });
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Notification State
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([
        {
            id: '1',
            type: 'case',
            title: 'Case Update',
            description: 'New document uploaded to "Property Dispute - Mumbai"',
            time: '5 min ago',
            read: false,
            link: '/portal/cases'
        },
        {
            id: '2',
            type: 'message',
            title: 'New Message',
            description: 'Marcus Thorne sent you a message',
            time: '15 min ago',
            read: false,
            link: '/portal/messages'
        },
        {
            id: '3',
            type: 'calendar',
            title: 'Upcoming Hearing',
            description: 'Court hearing tomorrow at 10:30 AM',
            time: '1 hour ago',
            read: false,
            link: '/portal/calendar'
        },
        {
            id: '4',
            type: 'billing',
            title: 'Payment Received',
            description: 'Invoice #INV-2024-001 has been paid',
            time: '2 hours ago',
            read: true,
            link: '/portal/billing'
        },
        {
            id: '5',
            type: 'system',
            title: 'Welcome!',
            description: 'Your portal account is now active',
            time: 'Yesterday',
            read: true,
        }
    ]);
    const notificationRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    // Unread messages count for Messages tab
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
    const socketRef = useRef<Socket | null>(null);

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

    // Search Logic
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults({ cases: [], messages: [], events: [], documents: [] });
            return;
        }

        const query = searchQuery.toLowerCase();

        const cases = dummyCases.filter((c: any) =>
            c.title.toLowerCase().includes(query) ||
            c.description.toLowerCase().includes(query) ||
            (c.clientName && c.clientName.toLowerCase().includes(query))
        ).slice(0, 3);

        const messages = dummyMessages.filter((m: any) =>
            m.content.toLowerCase().includes(query) ||
            m.sender.toLowerCase().includes(query)
        ).slice(0, 3);

        const events = dummyCalendarEvents.filter((e: any) =>
            e.title.toLowerCase().includes(query)
        ).slice(0, 3);

        const docs: any[] = [];
        dummyCases.forEach((c: any) => {
            if (c.documents) {
                c.documents.forEach((d: any) => {
                    if (d.name.toLowerCase().includes(query)) {
                        docs.push({ ...d, caseId: c._id, caseTitle: c.title });
                    }
                });
            }
        });

        setSearchResults({ cases, messages, events, documents: docs.slice(0, 3) });
    }, [searchQuery]);

    const isActive = (path: string) => {
        return location.pathname === path || (path !== '/portal' && location.pathname.startsWith(path));
    };

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev =>
            prev.map(n => ({ ...n, read: true }))
        );
    };

    const handleNotificationClick = (notification: Notification) => {
        markAsRead(notification.id);
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
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">

            <aside className="w-64 bg-white border-r border-slate-200 fixed inset-y-0 left-0 flex flex-col z-10 transition-transform">
                {/* Logo */}
                <div className="h-20 flex items-center px-6 gap-3 cursor-pointer" onClick={() => window.location.href = '/'}>
                    {/* <div className="bg-amber-900/10 p-2 rounded-lg">
                        <svg className="w-6 h-6 text-amber-900" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L1 21h22L12 2zm0 3.516L20.297 19H3.703L12 5.516z M11 16h2v2h-2v-2zm0-6h2v4h-2v-4z" />
                        </svg>
                    </div> */}
                    <img src={Logo} alt="" style={{width:"5rem" , height:"5rem"}}/>
                    <div>
                        <h1 className="font-bold text-slate-900 leading-none">LawfirmAI</h1>
                        <span className="text-xs text-blue-600 font-medium">Legal Portal</span>
                    </div>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 px-3 py-6 space-y-1">
                    <Link to="/portal" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${isActive('/portal') && location.pathname === '/portal' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <HomeIcon /> {t('portal.sidebar.home')}
                    </Link>
                    <Link to="/portal/cases" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${isActive('/portal/cases') ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <CaseIcon /> {t('portal.sidebar.myCases')}
                    </Link>

                    <Link to="/portal/billing" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${isActive('/portal/billing') ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <BillingIcon /> {t('portal.sidebar.billing')}
                    </Link>
                    <Link to="/portal/calendar" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${isActive('/portal/calendar') ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <CalendarIcon /> {t('portal.sidebar.calendar')}
                    </Link>
                    <Link to="/portal/messages" className={`flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${isActive('/portal/messages') ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <div className="flex items-center gap-3">
                            <MessageIcon /> {t('portal.sidebar.messages')}
                        </div>
                        {unreadMessagesCount > 0 && (
                            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                                {unreadMessagesCount}
                            </span>
                        )}
                    </Link>

                    {/* Firm Management Section */}
                    <div className="pt-4 mt-4 border-t border-slate-100">
                        <div className="px-3 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Firm</div>
                        <Link to="/portal/firm-connect" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${isActive('/portal/firm-connect') ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Firm Connect
                        </Link>
                        {user?.role === 'ADMIN' && (
                            <Link to="/portal/organization" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${isActive('/portal/organization') ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Organization
                            </Link>
                        )}
                    </div>
                </nav>

                {/* User Profile */}
                <div className="p-4 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm ring-2 ring-white shadow-sm">
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate('/portal/profile')}>
                            <p className="text-sm font-bold text-slate-900 truncate hover:text-blue-600 transition-colors">{user ? `${user.firstName} ${user.lastName}` : 'Loading...'}</p>
                            <p className="text-xs text-slate-500 truncate">{user?.role === 'ADMIN' ? 'Admin' : 'Attorney'}</p>
                        </div>

                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 min-w-0">

                {/* Top Header */}
                <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center sticky top-0 z-20">
                    <div className="flex-1 flex justify-center">
                        <div className="w-full max-w-2xl relative" ref={searchRef}>
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
                                    className="block w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                />
                            </div>

                            {/* Search Results Dropdown */}
                            {showResults && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 max-h-[80vh] overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">

                                    {!searchQuery.trim() ? (
                                        // Default View (Suggestions)
                                        <div className="p-4">

                                            {/* People Section */}
                                            <div className="mb-6">
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t('portal.header.people')}</div>
                                                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                                                    {['Marcus Thorne', 'Sarah Jenkins', 'Jane Doe', 'Legal Team', 'Robert Johnson'].map((name, i) => (
                                                        <div
                                                            key={i}
                                                            className="flex flex-col items-center gap-1 min-w-[70px] cursor-pointer group"
                                                            onClick={() => {
                                                                navigate(`/portal/messages?contact=${name}`);
                                                                setShowResults(false);
                                                            }}
                                                        >
                                                            <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-blue-100 text-slate-600 group-hover:text-blue-600 flex items-center justify-center font-bold text-lg transition-colors ring-2 ring-white shadow-sm">
                                                                {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                            </div>
                                                            <span className="text-[10px] font-medium text-slate-600 text-center leading-tight group-hover:text-blue-600">
                                                                {name.split(' ')[0]}<br />{name.split(' ')[1]}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Recent/Suggested Files */}
                                            <div>
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('portal.header.suggestions')}</div>
                                                <div className="space-y-1">
                                                    {dummyCases[0].documents?.slice(0, 2).map((doc: any, i: number) => (
                                                        <div
                                                            key={i}
                                                            onClick={() => { navigate(`/portal/cases/${dummyCases[0]._id}?tab=documents`); setShowResults(false); }}
                                                            className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer group"
                                                        >
                                                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.414.586l5.414 5.414a1 1 0 01.586 1.414V19a2 2 0 01-2 2z" /></svg>
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-medium text-slate-900 group-hover:text-blue-700">{doc.name}</div>
                                                                <div className="text-xs text-slate-500">{t('portal.header.recentlyModified')}</div>
                                                            </div>
                                                        </div>
                                                    ))}
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
                                                            {searchResults.messages.map((m: any) => (
                                                                <div
                                                                    key={m.id}
                                                                    onClick={() => { navigate(`/portal/messages?contact=${m.sender}`); setShowResults(false); }}
                                                                    className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer group"
                                                                >
                                                                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                                                        {m.sender[0]}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex justify-between">
                                                                            <div className="text-sm font-bold text-slate-900 truncate">{m.sender}</div>
                                                                            <div className="text-xs text-slate-400">{m.time}</div>
                                                                        </div>
                                                                        <div className="text-xs text-slate-500 truncate">{m.content}</div>
                                                                    </div>
                                                                </div>
                                                            ))}
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
                                                            {searchResults.events.map((e: any) => (
                                                                <div
                                                                    key={e.id}
                                                                    onClick={() => { navigate(`/portal/calendar`); setShowResults(false); }}
                                                                    className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer group"
                                                                >
                                                                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                                                        <CalendarIcon />
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-sm font-bold text-slate-900">{e.title}</div>
                                                                        <div className="text-xs text-slate-500">{e.date} • {e.time}</div>
                                                                    </div>
                                                                </div>
                                                            ))}
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
                    <div className="flex items-center gap-4 flex-none ml-2" ref={notificationRef}>
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
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
                            <div className="absolute top-16 right-8 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                                {/* Header */}
                                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                    <h3 className="font-bold text-slate-900">{t('portal.notifications.title')}</h3>
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={markAllAsRead}
                                            className="text-xs font-medium text-blue-600 hover:text-blue-700"
                                        >
                                            {t('portal.notifications.markAllRead')}
                                        </button>
                                    )}
                                </div>

                                {/* Notification List */}
                                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            onClick={() => handleNotificationClick(notification)}
                                            className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${!notification.read ? 'bg-blue-50/50' : ''
                                                }`}
                                        >
                                            <div className="flex gap-3">
                                                {getNotificationIcon(notification.type)}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className={`text-sm ${!notification.read ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                                                            {notification.title}
                                                        </p>
                                                        {!notification.read && (
                                                            <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5"></span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                                        {notification.description}
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-1">
                                                        {notification.time}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Footer */}
                                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
                                    <button
                                        onClick={() => {
                                            setShowNotifications(false);
                                            // Could navigate to a full notifications page
                                        }}
                                        className="w-full text-center text-sm font-medium text-slate-600 hover:text-slate-900"
                                    >
                                        {t('portal.notifications.viewAll')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                <div className="p-8 space-y-8">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default PortalLayout;
