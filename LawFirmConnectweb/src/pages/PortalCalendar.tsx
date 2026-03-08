import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Clock,
    MapPin,
    Users,
    Video,
    Trash2,
    X,
    Copy,
    Calendar as CalendarIcon,
    List
} from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import scheduleService from '../services/scheduleService';
import type { AttendeeUser } from '../services/scheduleService';
import ConfirmationModal from '../components/ConfirmationModal';

// Event category colors using CSS variables where possible, but keeping distinct category hues
const eventColorMap: Record<string, { accent: string; bg: string; text: string }> = {
    'Meeting':     { accent: '#8B5CF6', bg: 'rgba(139,92,246,0.1)',  text: '#7C3AED' },
    'Court':       { accent: '#EF4444', bg: 'rgba(239,68,68,0.1)',   text: '#DC2626' },
    'Appointment': { accent: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  text: '#2563EB' },
    'Deadline':    { accent: '#F97316', bg: 'rgba(249,115,22,0.1)',  text: '#EA580C' },
    'Personal':    { accent: '#10B981', bg: 'rgba(16,185,129,0.1)',  text: '#059669' },
    'default':     { accent: '#6366F1', bg: 'rgba(99,102,241,0.1)',  text: '#4F46E5' },
};

type ViewMode = 'Day' | 'WorkWeek' | 'Week' | 'Month' | 'Agenda';

const PortalCalendar: React.FC = () => {
    const { t } = useTranslation();
    const [viewDate, setViewDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('WorkWeek');
    const [bookings, setBookings] = useState<any[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [showSidePanel, setShowSidePanel] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Form State
    const [eventTitle, setEventTitle] = useState('');
    const [selectedAttendees, setSelectedAttendees] = useState<AttendeeUser[]>([]);
    const [attendeeSearch, setAttendeeSearch] = useState('');
    const [attendeeSuggestions, setAttendeeSuggestions] = useState<AttendeeUser[]>([]);
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('10:00');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [eventType, setEventType] = useState('Meeting');
    const [isOnlineMeeting, setIsOnlineMeeting] = useState(false);
    const [createdMeetingLink, setCreatedMeetingLink] = useState<string | null>(null);

    // Current time indicator
    const [currentTimePosition, setCurrentTimePosition] = useState(0);
    const attendeeSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const calculateTimePosition = useCallback(() => {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        const position = ((hour - 6) + (minute / 60)) * 60;
        return Math.max(0, Math.min(position, 17 * 60));
    }, []);

    useEffect(() => {
        fetchEvents();
        setCurrentTimePosition(calculateTimePosition());
        const interval = setInterval(() => {
            setCurrentTimePosition(calculateTimePosition());
        }, 60000);
        return () => clearInterval(interval);
    }, [calculateTimePosition]);

    const fetchEvents = async () => {
        try {
            const data = await scheduleService.getEvents();
            const adapted = data.map(evt => ({
                id: evt._id,
                title: evt.title,
                date: evt.startDate,
                time: evt.startTime,
                endTime: evt.endTime,
                allDay: evt.allDay,
                type: evt.type || 'Meeting',
                status: evt.status || 'Scheduled',
                location: evt.location,
                description: evt.description,
                attendees: evt.attendees || [],
                isOnlineMeeting: evt.isOnlineMeeting,
                meetingLink: evt.meetingLink
            }));
            setBookings(adapted);
        } catch {
            console.error("Failed to fetch events");
        }
    };

    const resetForm = () => {
        const todayStr = new Date().toISOString().split('T')[0];
        setEventTitle('');
        setSelectedAttendees([]);
        setAttendeeSearch('');
        setAttendeeSuggestions([]);
        setStartDate(todayStr);
        setStartTime('09:00');
        setEndDate(todayStr);
        setEndTime('10:00');
        setLocation('');
        setDescription('');
        setEventType('Meeting');
        setIsOnlineMeeting(false);
        setSelectedEvent(null);
        setCreatedMeetingLink(null);
    };

    const handleTimeSlotClick = (day: Date, hour: number) => {
        resetForm();
        const dateStr = day.toISOString().split('T')[0];
        setStartDate(dateStr);
        setEndDate(dateStr);
        setStartTime(`${hour.toString().padStart(2, '0')}:00`);
        setEndTime(`${(hour + 1).toString().padStart(2, '0')}:00`);
        setIsCreating(true);
        setShowSidePanel(true);
    };

    const openNewEventPanel = () => {
        resetForm();
        const todayStr = new Date().toISOString().split('T')[0];
        setStartDate(todayStr);
        setEndDate(todayStr);
        setIsCreating(true);
        setShowSidePanel(true);
    };

    const openEditEventPanel = (event: any) => {
        setSelectedEvent(event);
        setEventTitle(event.title || '');

        // Populate attendees from populated objects
        if (Array.isArray(event.attendees)) {
            const attendeeObjects = event.attendees.filter((a: any) => a && a._id);
            setSelectedAttendees(attendeeObjects);
        } else {
            setSelectedAttendees([]);
        }

        const eventDate = new Date(event.date);
        setStartDate(eventDate.toISOString().split('T')[0]);
        setStartTime(event.time || '09:00');
        setEndDate(eventDate.toISOString().split('T')[0]);
        setEndTime(event.endTime || '10:00');
        setLocation(event.location || '');
        setDescription(event.description || '');
        setEventType(event.type || 'Meeting');
        setIsOnlineMeeting(event.isOnlineMeeting || false);
        setCreatedMeetingLink(event.meetingLink || null);
        setIsCreating(false);
        setShowSidePanel(true);
    };

    const closeSidePanel = () => {
        setShowSidePanel(false);
        setSelectedEvent(null);
        setIsCreating(false);
        resetForm();
    };

    const handleSaveEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const startDateTime = new Date(`${startDate}T${startTime}`);
            const endDateTime = new Date(`${endDate}T${endTime}`);

            const eventData: any = {
                title: eventTitle || t('calendar.noTitle'),
                startDate: startDateTime.toISOString(),
                startTime,
                endDate: endDateTime.toISOString(),
                endTime,
                allDay: false,
                location,
                description,
                attendees: selectedAttendees.map(a => a._id),
                type: eventType,
                status: 'Scheduled',
                isOnlineMeeting
            };

            if (selectedEvent && !isCreating) {
                const updated = await scheduleService.updateEvent(selectedEvent.id, eventData);
                if (updated.meetingLink) setCreatedMeetingLink(updated.meetingLink);
                toast.success(t('calendar.eventUpdated'));
            } else {
                const created = await scheduleService.createEvent(eventData);
                if (created.meetingLink) setCreatedMeetingLink(created.meetingLink);
                toast.success(t('calendar.eventCreated'));
            }

            await fetchEvents();
            closeSidePanel();
        } catch {
            toast.error(t('calendar.eventSaveFailed'));
        }
    };

    const confirmDeleteEvent = async () => {
        if (!selectedEvent) return;
        try {
            await scheduleService.deleteEvent(selectedEvent.id);
            toast.success(t('calendar.eventDeleted'));
            await fetchEvents();
            closeSidePanel();
            setIsDeleteModalOpen(false);
        } catch {
            toast.error(t('calendar.eventDeleteFailed'));
            setIsDeleteModalOpen(false);
        }
    };

    // Attendee autocomplete
    useEffect(() => {
        if (attendeeSearchRef.current) clearTimeout(attendeeSearchRef.current);
        if (!attendeeSearch.trim()) {
            setAttendeeSuggestions([]);
            return;
        }
        attendeeSearchRef.current = setTimeout(async () => {
            try {
                const results = await scheduleService.searchUsers(attendeeSearch);
                // Filter out already-selected attendees
                const filtered = results.filter(
                    u => !selectedAttendees.some(a => a._id === u._id)
                );
                setAttendeeSuggestions(filtered);
            } catch {
                setAttendeeSuggestions([]);
            }
        }, 300);
    }, [attendeeSearch, selectedAttendees]);

    const addAttendee = (user: AttendeeUser) => {
        setSelectedAttendees(prev => [...prev, user]);
        setAttendeeSearch('');
        setAttendeeSuggestions([]);
    };

    const removeAttendee = (userId: string) => {
        setSelectedAttendees(prev => prev.filter(a => a._id !== userId));
    };

    // Helper functions
    const isSameDate = (d1: Date, d2: Date) => d1.toDateString() === d2.toDateString();

    const getWeekDays = (curr: Date) => {
        const week: Date[] = [];
        const current = new Date(curr);
        const day = current.getDay();
        const diff = current.getDate() - day;
        const startOfWeek = new Date(current.setDate(diff));
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            week.push(d);
        }
        return week;
    };

    const hours = Array.from({ length: 17 }, (_, i) => i + 6);
    const weekDays = getWeekDays(viewDate);

    const displayDays = viewMode === 'Day'
        ? [viewDate]
        : viewMode === 'WorkWeek'
            ? weekDays.filter(d => d.getDay() !== 0 && d.getDay() !== 6)
            : weekDays;

    const handlePrev = () => {
        const d = new Date(viewDate);
        if (viewMode === 'Month') {
            d.setMonth(d.getMonth() - 1);
        } else {
            d.setDate(d.getDate() - (viewMode === 'Day' ? 1 : 7));
        }
        setViewDate(d);
    };

    const handleNext = () => {
        const d = new Date(viewDate);
        if (viewMode === 'Month') {
            d.setMonth(d.getMonth() + 1);
        } else {
            d.setDate(d.getDate() + (viewMode === 'Day' ? 1 : 7));
        }
        setViewDate(d);
    };

    const formatDateRange = () => {
        if (viewMode === 'Day') {
            return viewDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        }
        if (viewMode === 'Month') {
            return viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }
        if (viewMode === 'Agenda') {
            return 'Upcoming Events';
        }
        const first = displayDays[0];
        const last = displayDays[displayDays.length - 1];
        if (first.getMonth() === last.getMonth()) {
            return `${first.toLocaleDateString('en-US', { month: 'long' })} ${first.getDate()} - ${last.getDate()}, ${first.getFullYear()}`;
        }
        return `${first.toLocaleDateString('en-US', { month: 'short' })} ${first.getDate()} - ${last.toLocaleDateString('en-US', { month: 'short' })} ${last.getDate()}, ${first.getFullYear()}`;
    };

    const getEventColor = (type: string) => eventColorMap[type] || eventColorMap['default'];

    const copyMeetingLink = (link: string) => {
        navigator.clipboard.writeText(link);
        toast.success('Meeting link copied!');
    };

    // Month view helpers
    const getMonthDays = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay();
        const days: (Date | null)[] = [];

        // Pad the start
        for (let i = 0; i < startDay; i++) days.push(null);
        for (let d = 1; d <= lastDay.getDate(); d++) {
            days.push(new Date(year, month, d));
        }
        return days;
    };

    // Agenda view: events for next 30 days
    const getAgendaEvents = () => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setDate(end.getDate() + 30);

        return bookings
            .filter(evt => {
                const evtDate = new Date(evt.date);
                return evtDate >= now && evtDate <= end;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    };

    const groupEventsByDate = (events: any[]) => {
        const groups: Record<string, any[]> = {};
        events.forEach(evt => {
            const key = new Date(evt.date).toDateString();
            if (!groups[key]) groups[key] = [];
            groups[key].push(evt);
        });
        return groups;
    };

    const categoryTypes = Object.keys(eventColorMap).filter(k => k !== 'default');

    return (
        <PortalLayout>
            <div className="flex h-[calc(100vh-100px)] overflow-hidden" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>

                {/* Main Calendar Area */}
                <div className={`flex-1 flex flex-col transition-all duration-300 ${showSidePanel ? 'mr-96' : ''}`}>

                    {/* Header */}
                    <div className="px-6 py-3 flex items-center justify-between" style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-surface-border)' }}>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={openNewEventPanel}
                                className="btn-gradient px-4 py-2 text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors"
                            >
                                <Plus className="w-5 h-5" /> {t('calendar.newMeeting')}
                            </button>

                            <div className="h-6 w-px" style={{ backgroundColor: 'var(--color-surface-border)' }} />

                            <button
                                onClick={() => setViewDate(new Date())}
                                className="px-3 py-1.5 text-sm font-medium rounded transition-colors hover:opacity-80"
                                style={{ color: 'var(--color-text-secondary)' }}
                            >
                                {t('calendar.today')}
                            </button>

                            <div className="flex items-center">
                                <button onClick={handlePrev} className="p-1.5 rounded-full transition-colors hover:opacity-70" style={{ color: 'var(--color-text-secondary)' }}>
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button onClick={handleNext} className="p-1.5 rounded-full transition-colors hover:opacity-70" style={{ color: 'var(--color-text-secondary)' }}>
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>

                            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                {formatDateRange()}
                            </h2>
                        </div>

                        {/* View Switcher */}
                        <div className="flex items-center gap-1 rounded-lg p-1" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                            {(['Day', 'WorkWeek', 'Week', 'Month', 'Agenda'] as const).map(mode => (
                                <button
                                    key={mode}
                                    className="px-3 py-1.5 text-sm font-medium rounded-md transition-all"
                                    style={viewMode === mode
                                        ? { backgroundColor: 'var(--color-surface)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', color: 'var(--color-text-primary)' }
                                        : { color: 'var(--color-text-secondary)' }
                                    }
                                    onClick={() => setViewMode(mode)}
                                >
                                    {mode === 'Day' ? t('calendar.day')
                                        : mode === 'WorkWeek' ? t('calendar.workWeek')
                                        : mode === 'Week' ? t('calendar.week')
                                        : mode === 'Month' ? (t('calendar.monthView') || 'Month')
                                        : (t('calendar.agendaView') || 'Agenda')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Calendar Content */}
                    {viewMode === 'Month' ? (
                        /* ===== MONTH VIEW ===== */
                        <div className="flex-1 overflow-auto p-4" style={{ backgroundColor: 'var(--color-surface)' }}>
                            <div className="grid grid-cols-7 gap-px" style={{ backgroundColor: 'var(--color-surface-border)' }}>
                                {/* Day headers */}
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div key={day} className="text-center text-xs font-semibold py-2"
                                         style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}>
                                        {day}
                                    </div>
                                ))}

                                {/* Day cells */}
                                {getMonthDays().map((day, idx) => {
                                    if (!day) {
                                        return <div key={`empty-${idx}`} className="min-h-[100px]" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />;
                                    }
                                    const isToday = isSameDate(day, new Date());
                                    const dayEvents = bookings.filter(b => isSameDate(new Date(b.date), day));

                                    return (
                                        <div
                                            key={idx}
                                            className="min-h-[100px] p-1 cursor-pointer transition-colors hover:opacity-80"
                                            style={{ backgroundColor: isToday ? 'var(--color-accent-soft)' : 'var(--color-surface)' }}
                                            onClick={() => { setViewDate(day); setViewMode('Day'); }}
                                        >
                                            <span className={`text-sm font-medium inline-flex items-center justify-center w-7 h-7 rounded-full ${isToday ? 'text-white' : ''}`}
                                                  style={isToday ? { backgroundColor: 'var(--color-accent)' } : { color: 'var(--color-text-primary)' }}>
                                                {day.getDate()}
                                            </span>
                                            <div className="mt-1 space-y-0.5">
                                                {dayEvents.slice(0, 3).map(evt => {
                                                    const colors = getEventColor(evt.type);
                                                    return (
                                                        <div key={evt.id} className="text-[10px] truncate px-1 py-0.5 rounded"
                                                             style={{ backgroundColor: colors.bg, color: colors.text }}
                                                             onClick={(e) => { e.stopPropagation(); openEditEventPanel(evt); }}>
                                                            {evt.title}
                                                        </div>
                                                    );
                                                })}
                                                {dayEvents.length > 3 && (
                                                    <div className="text-[10px] px-1" style={{ color: 'var(--color-text-tertiary)' }}>
                                                        +{dayEvents.length - 3} more
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : viewMode === 'Agenda' ? (
                        /* ===== AGENDA VIEW ===== */
                        <div className="flex-1 overflow-auto p-6" style={{ backgroundColor: 'var(--color-surface)' }}>
                            {(() => {
                                const agendaEvents = getAgendaEvents();
                                if (agendaEvents.length === 0) {
                                    return (
                                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                                            <List className="w-10 h-10" style={{ color: 'var(--color-text-tertiary)' }} />
                                            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                                {t('calendar.noUpcoming') || 'No upcoming events'}
                                            </p>
                                        </div>
                                    );
                                }

                                const grouped = groupEventsByDate(agendaEvents);
                                return Object.entries(grouped).map(([dateKey, events]) => (
                                    <div key={dateKey} className="mb-6">
                                        <h3 className="text-sm font-semibold mb-3 pb-2" style={{ color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-surface-border)' }}>
                                            {new Date(dateKey).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                        </h3>
                                        <div className="space-y-2">
                                            {events.map((evt: any) => {
                                                const colors = getEventColor(evt.type);
                                                return (
                                                    <div
                                                        key={evt.id}
                                                        className="flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-colors hover:opacity-80"
                                                        style={{ backgroundColor: 'var(--color-bg-tertiary)', borderLeft: `4px solid ${colors.accent}` }}
                                                        onClick={() => openEditEventPanel(evt)}
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{evt.title}</h4>
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                                                      style={{ backgroundColor: colors.bg, color: colors.text }}>
                                                                    {evt.type}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                                                                <span className="flex items-center gap-1">
                                                                    <Clock className="w-3 h-3" /> {evt.time} - {evt.endTime}
                                                                </span>
                                                                {evt.location && (
                                                                    <span className="flex items-center gap-1">
                                                                        <MapPin className="w-3 h-3" /> {evt.location}
                                                                    </span>
                                                                )}
                                                                {evt.attendees && evt.attendees.length > 0 && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Users className="w-3 h-3" /> {evt.attendees.length}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {evt.meetingLink && (
                                                            <a
                                                                href={evt.meetingLink}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                                                                style={{ backgroundColor: 'var(--color-accent)' }}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <Video className="w-3 h-3" /> {t('calendar.joinMeeting') || 'Join'}
                                                            </a>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    ) : (
                        /* ===== DAY / WORKWEEK / WEEK TIME GRID ===== */
                        <div className="flex-1 overflow-auto" style={{ backgroundColor: 'var(--color-surface)' }}>
                            <div className="flex min-h-full">
                                {/* Time Column */}
                                <div className="w-16 flex-shrink-0" style={{ borderRight: '1px solid var(--color-surface-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                                    <div className="h-12" />
                                    {hours.map(hour => (
                                        <div key={hour} className="h-[60px] text-right pr-2 text-xs -mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
                                            {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                                        </div>
                                    ))}
                                </div>

                                {/* Days Grid */}
                                <div className="flex-1 flex">
                                    {displayDays.map((day, colIdx) => {
                                        const isToday = isSameDate(day, new Date());
                                        const dayEvents = bookings.filter(b => isSameDate(new Date(b.date), day));

                                        return (
                                            <div key={colIdx} className="flex-1 relative" style={{ borderRight: '1px solid var(--color-surface-border)' }}>
                                                {/* Day Header */}
                                                <div className="h-12 flex flex-col items-center justify-center sticky top-0 z-10"
                                                     style={{
                                                         borderBottom: '1px solid var(--color-surface-border)',
                                                         backgroundColor: isToday ? 'var(--color-accent-soft)' : 'var(--color-surface)'
                                                     }}>
                                                    <span className="text-xs uppercase font-medium" style={{ color: isToday ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }}>
                                                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                                                    </span>
                                                    <span className={`text-lg font-semibold ${isToday ? 'text-white w-8 h-8 rounded-full flex items-center justify-center' : ''}`}
                                                          style={isToday
                                                              ? { backgroundColor: 'var(--color-accent)' }
                                                              : { color: 'var(--color-text-primary)' }
                                                          }>
                                                        {day.getDate()}
                                                    </span>
                                                </div>

                                                {/* Time Slots */}
                                                <div className="relative">
                                                    {hours.map((hour, i) => (
                                                        <div
                                                            key={i}
                                                            className="h-[60px] cursor-pointer transition-colors"
                                                            style={{ borderBottom: '1px solid var(--color-surface-border)' }}
                                                            onClick={() => handleTimeSlotClick(day, hour)}
                                                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-accent-soft)')}
                                                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                                        />
                                                    ))}

                                                    {/* Current Time Indicator */}
                                                    {isToday && currentTimePosition > 0 && (
                                                        <div
                                                            className="absolute left-0 right-0 z-20 pointer-events-none"
                                                            style={{ top: `${currentTimePosition}px` }}
                                                        >
                                                            <div className="flex items-center">
                                                                <div className="w-3 h-3 rounded-full -ml-1.5" style={{ backgroundColor: '#EF4444' }} />
                                                                <div className="flex-1 h-0.5" style={{ backgroundColor: '#EF4444' }} />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Events */}
                                                    {dayEvents.map(evt => {
                                                        const timeParts = evt.time ? evt.time.split(':') : ['09', '00'];
                                                        const endTimeParts = evt.endTime ? evt.endTime.split(':') : [String(parseInt(timeParts[0]) + 1), '00'];
                                                        const startHour = parseInt(timeParts[0]);
                                                        const startMinute = parseInt(timeParts[1]);
                                                        const endHour = parseInt(endTimeParts[0]);
                                                        const endMinute = parseInt(endTimeParts[1]);

                                                        const topOffset = ((startHour - 6) + (startMinute / 60)) * 60;
                                                        const duration = (endHour - startHour) + ((endMinute - startMinute) / 60);
                                                        const height = Math.max(30, duration * 60 - 4);
                                                        const colors = getEventColor(evt.type);

                                                        return (
                                                            <div
                                                                key={evt.id}
                                                                onClick={(e) => { e.stopPropagation(); openEditEventPanel(evt); }}
                                                                className="absolute left-1 right-1 p-2 rounded-md cursor-pointer hover:shadow-lg transition-shadow z-10 overflow-hidden"
                                                                style={{
                                                                    top: `${Math.max(0, topOffset)}px`,
                                                                    height: `${height}px`,
                                                                    backgroundColor: colors.bg,
                                                                    borderLeft: `4px solid ${colors.accent}`
                                                                }}
                                                            >
                                                                <div className="font-semibold text-xs truncate" style={{ color: colors.text }}>{evt.title}</div>
                                                                <div className="text-xs truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                                                                    {evt.time} - {evt.endTime || ''}
                                                                </div>
                                                                {evt.location && (
                                                                    <div className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{evt.location}</div>
                                                                )}
                                                                {evt.meetingLink && (
                                                                    <div className="flex items-center gap-1 mt-0.5">
                                                                        <Video className="w-3 h-3" style={{ color: colors.text }} />
                                                                        <span className="text-[10px]" style={{ color: colors.text }}>Online</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ===== SIDE PANEL ===== */}
                <div className={`fixed right-0 top-0 h-full w-96 shadow-xl transform transition-transform duration-300 z-30 ${showSidePanel ? 'translate-x-0' : 'translate-x-full'}`}
                     style={{ backgroundColor: 'var(--color-surface)', borderLeft: '1px solid var(--color-surface-border)' }}>
                    <div className="flex flex-col h-full">
                        {/* Panel Header */}
                        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-surface-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                            <h3 className="font-semibold text-lg" style={{ color: 'var(--color-text-primary)' }}>
                                {isCreating ? t('calendar.newMeeting') : t('calendar.editMeeting')}
                            </h3>
                            <button onClick={closeSidePanel} className="p-1 rounded-full transition-colors hover:opacity-70" style={{ color: 'var(--color-text-tertiary)' }}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Panel Content */}
                        <form onSubmit={handleSaveEvent} className="flex-1 overflow-y-auto p-6 space-y-5">
                            {/* Title */}
                            <div>
                                <input
                                    type="text"
                                    placeholder={t('calendar.addTitle')}
                                    value={eventTitle}
                                    onChange={(e) => setEventTitle(e.target.value)}
                                    className="w-full text-xl font-semibold border-0 border-b-2 pb-2 outline-none transition-colors"
                                    style={{
                                        borderColor: 'var(--color-surface-border)',
                                        color: 'var(--color-text-primary)',
                                        backgroundColor: 'transparent'
                                    }}
                                    onFocus={(e) => (e.target.style.borderColor = 'var(--color-accent)')}
                                    onBlur={(e) => (e.target.style.borderColor = 'var(--color-surface-border)')}
                                    autoFocus
                                />
                            </div>

                            {/* Date & Time */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3" style={{ color: 'var(--color-text-secondary)' }}>
                                    <Clock className="w-5 h-5" />
                                    <span className="font-medium">{t('calendar.dateTime')}</span>
                                </div>
                                <div className="ml-8 space-y-2">
                                    <div className="flex gap-2">
                                        <input type="date" value={startDate}
                                               onChange={(e) => { setStartDate(e.target.value); setEndDate(e.target.value); }}
                                               className="flex-1 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 border"
                                               style={{ borderColor: 'var(--color-surface-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)', '--tw-ring-color': 'var(--color-accent-glow)' } as React.CSSProperties}
                                        />
                                        <input type="time" value={startTime}
                                               onChange={(e) => setStartTime(e.target.value)}
                                               className="w-28 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 border"
                                               style={{ borderColor: 'var(--color-surface-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)', '--tw-ring-color': 'var(--color-accent-glow)' } as React.CSSProperties}
                                        />
                                    </div>
                                    <div className="text-center text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{t('calendar.to')}</div>
                                    <div className="flex gap-2">
                                        <input type="date" value={endDate}
                                               onChange={(e) => setEndDate(e.target.value)}
                                               className="flex-1 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 border"
                                               style={{ borderColor: 'var(--color-surface-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)', '--tw-ring-color': 'var(--color-accent-glow)' } as React.CSSProperties}
                                        />
                                        <input type="time" value={endTime}
                                               onChange={(e) => setEndTime(e.target.value)}
                                               className="w-28 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 border"
                                               style={{ borderColor: 'var(--color-surface-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)', '--tw-ring-color': 'var(--color-accent-glow)' } as React.CSSProperties}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Online Meeting Toggle */}
                            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                                <Video className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
                                <div className="flex-1">
                                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{t('calendar.addOnlineMeeting')}</span>
                                    {isOnlineMeeting && !createdMeetingLink && (
                                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                                            {t('calendar.meetingLinkGenerated') || 'A Jitsi Meet link will be generated automatically'}
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsOnlineMeeting(!isOnlineMeeting)}
                                    className="relative w-11 h-6 rounded-full transition-colors"
                                    style={{ backgroundColor: isOnlineMeeting ? 'var(--color-accent)' : 'var(--color-surface-border)' }}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isOnlineMeeting ? 'translate-x-5' : ''}`} />
                                </button>
                            </div>

                            {/* Meeting link display */}
                            {createdMeetingLink && (
                                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-accent-soft)' }}>
                                    <Video className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
                                    <a href={createdMeetingLink} target="_blank" rel="noopener noreferrer"
                                       className="text-xs truncate flex-1 hover:underline" style={{ color: 'var(--color-accent)' }}>
                                        {createdMeetingLink}
                                    </a>
                                    <button type="button" onClick={() => copyMeetingLink(createdMeetingLink)}
                                            className="p-1 rounded hover:opacity-70" style={{ color: 'var(--color-accent)' }}>
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {/* Attendees — autocomplete picker */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3" style={{ color: 'var(--color-text-secondary)' }}>
                                    <Users className="w-5 h-5" />
                                    <span className="font-medium">{t('calendar.attendees')}</span>
                                </div>
                                <div className="ml-8">
                                    {/* Selected attendees as chips */}
                                    {selectedAttendees.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {selectedAttendees.map(att => (
                                                <span key={att._id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                                                      style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
                                                    {att.firstName} {att.lastName}
                                                    <button type="button" onClick={() => removeAttendee(att._id)} className="hover:opacity-70">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder={t('calendar.addAttendees') || 'Add attendees...'}
                                            value={attendeeSearch}
                                            onChange={(e) => setAttendeeSearch(e.target.value)}
                                            className="w-full px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 border"
                                            style={{ borderColor: 'var(--color-surface-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)', '--tw-ring-color': 'var(--color-accent-glow)' } as React.CSSProperties}
                                        />
                                        {attendeeSuggestions.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 rounded-lg shadow-lg border max-h-40 overflow-y-auto"
                                                 style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface-border)' }}>
                                                {attendeeSuggestions.map(user => (
                                                    <button
                                                        key={user._id}
                                                        type="button"
                                                        onClick={() => addAttendee(user)}
                                                        className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors hover:opacity-80"
                                                        style={{ borderBottom: '1px solid var(--color-surface-border)' }}
                                                    >
                                                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                                                             style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
                                                            {(user.firstName?.[0] || '') + (user.lastName?.[0] || '')}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                                                {user.firstName} {user.lastName}
                                                            </p>
                                                            <p className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>{user.email}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Location */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3" style={{ color: 'var(--color-text-secondary)' }}>
                                    <MapPin className="w-5 h-5" />
                                    <span className="font-medium">{t('calendar.location')}</span>
                                </div>
                                <input
                                    type="text"
                                    placeholder={t('calendar.locationPlaceholder')}
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="w-full ml-8 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 border"
                                    style={{ borderColor: 'var(--color-surface-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)', '--tw-ring-color': 'var(--color-accent-glow)' } as React.CSSProperties}
                                />
                            </div>

                            {/* Category */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3" style={{ color: 'var(--color-text-secondary)' }}>
                                    <CalendarIcon className="w-5 h-5" />
                                    <span className="font-medium">{t('calendar.category')}</span>
                                </div>
                                <select
                                    value={eventType}
                                    onChange={(e) => setEventType(e.target.value)}
                                    className="w-full ml-8 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 border"
                                    style={{ borderColor: 'var(--color-surface-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)', '--tw-ring-color': 'var(--color-accent-glow)' } as React.CSSProperties}
                                >
                                    {categoryTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Description */}
                            <div>
                                <textarea
                                    placeholder={t('calendar.descriptionPlaceholder')}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 border"
                                    style={{ borderColor: 'var(--color-surface-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)', '--tw-ring-color': 'var(--color-accent-glow)' } as React.CSSProperties}
                                />
                            </div>
                        </form>

                        {/* Panel Footer */}
                        <div className="px-6 py-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--color-surface-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                            {!isCreating && selectedEvent && (
                                <button
                                    type="button"
                                    onClick={() => setIsDeleteModalOpen(true)}
                                    className="px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 hover:opacity-80"
                                    style={{ color: '#DC2626', backgroundColor: 'rgba(239,68,68,0.08)' }}
                                >
                                    <Trash2 className="w-4 h-4" /> {t('calendar.deleteLabel')}
                                </button>
                            )}
                            <div className="flex-1" />
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={closeSidePanel}
                                    className="btn-ghost px-4 py-2 rounded-lg text-sm font-medium"
                                >
                                    {t('calendar.cancel')}
                                </button>
                                <button
                                    onClick={handleSaveEvent}
                                    className="btn-gradient px-6 py-2 rounded-lg text-sm font-semibold"
                                >
                                    {t('calendar.save')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Overlay when side panel is open */}
                {showSidePanel && (
                    <div
                        className="fixed inset-0 bg-black/20 z-20 lg:hidden"
                        onClick={closeSidePanel}
                    />
                )}

                {/* Confirmation Modal */}
                <ConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={confirmDeleteEvent}
                    title={t('calendar.deleteEvent')}
                    message={t('calendar.deleteConfirm')}
                    confirmText={t('calendar.deleteLabel')}
                    isDanger={true}
                />
            </div>
        </PortalLayout>
    );
};

export default PortalCalendar;
