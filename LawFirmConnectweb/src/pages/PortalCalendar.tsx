import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import PortalLayout from '../components/PortalLayout';
import scheduleService from '../services/scheduleService';
import ConfirmationModal from '../components/ConfirmationModal';

// Icons
const PlusIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
)
const ChevronLeftIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
)
const ChevronRightIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
)
const XIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
)
const TrashIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
)
const UserGroupIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
)
const ClockIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
)
const LocationIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
)
const CalendarIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
)
const VideoIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
)

// Event category colors (Teams-style)
const eventColors: Record<string, { bg: string; border: string; text: string; light: string }> = {
    'Meeting': { bg: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-700', light: 'bg-purple-50' },
    'Court': { bg: 'bg-red-500', border: 'border-red-500', text: 'text-red-700', light: 'bg-red-50' },
    'Appointment': { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-700', light: 'bg-blue-50' },
    'Deadline': { bg: 'bg-orange-500', border: 'border-orange-500', text: 'text-orange-700', light: 'bg-orange-50' },
    'Personal': { bg: 'bg-green-500', border: 'border-green-500', text: 'text-green-700', light: 'bg-green-50' },
    'default': { bg: 'bg-indigo-500', border: 'border-indigo-500', text: 'text-indigo-700', light: 'bg-indigo-50' },
};

const PortalCalendar: React.FC = () => {
    const [viewDate, setViewDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'WorkWeek'>('WorkWeek');
    const [bookings, setBookings] = useState<any[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [showSidePanel, setShowSidePanel] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Form State
    const [eventTitle, setEventTitle] = useState('');
    const [attendees, setAttendees] = useState('');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('10:00');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [eventType, setEventType] = useState('Meeting');
    const [isOnlineMeeting, setIsOnlineMeeting] = useState(false);

    // Current time indicator
    const [currentTimePosition, setCurrentTimePosition] = useState(0);

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
                attendees: evt.attendees,
                isOnlineMeeting: evt.isOnlineMeeting
            }));
            setBookings(adapted);
        } catch (e) {
            console.error("Failed to fetch events", e);
        }
    };

    const resetForm = () => {
        const todayStr = new Date().toISOString().split('T')[0];
        setEventTitle('');
        setAttendees('');
        setStartDate(todayStr);
        setStartTime('09:00');
        setEndDate(todayStr);
        setEndTime('10:00');
        setLocation('');
        setDescription('');
        setEventType('Meeting');
        setIsOnlineMeeting(false);
        setSelectedEvent(null);
    };

    // Click on time slot to create event
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
        setAttendees(event.attendees || '');
        const eventDate = new Date(event.date);
        setStartDate(eventDate.toISOString().split('T')[0]);
        setStartTime(event.time || '09:00');
        setEndDate(eventDate.toISOString().split('T')[0]);
        setEndTime(event.endTime || '10:00');
        setLocation(event.location || '');
        setDescription(event.description || '');
        setEventType(event.type || 'Meeting');
        setIsOnlineMeeting(event.isOnlineMeeting || false);
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
                title: eventTitle || '(No Title)',
                startDate: startDateTime.toISOString(),
                startTime,
                endDate: endDateTime.toISOString(),
                endTime,
                allDay: false,
                location,
                description,
                attendees,
                type: eventType,
                status: 'Scheduled',
                isOnlineMeeting
            };

            if (selectedEvent && !isCreating) {
                await scheduleService.updateEvent(selectedEvent.id, eventData);
                toast.success("Event updated successfully");
            } else {
                await scheduleService.createEvent(eventData);
                toast.success("Event created successfully");
            }

            await fetchEvents();
            closeSidePanel();
        } catch (error) {
            console.error("Failed to save event", error);
            toast.error("Failed to save event");
        }
    };

    const confirmDeleteEvent = async () => {
        if (!selectedEvent) return;

        try {
            await scheduleService.deleteEvent(selectedEvent.id);
            toast.success("Event deleted successfully");
            await fetchEvents();
            closeSidePanel();
            setIsDeleteModalOpen(false);
        } catch (error) {
            console.error("Failed to delete event", error);
            toast.error("Failed to delete event");
            setIsDeleteModalOpen(false);
        }
    };

    const handleDeleteClick = () => {
        setIsDeleteModalOpen(true);
    };

    // Helper functions
    const isSameDate = (d1: Date, d2: Date) => d1.toDateString() === d2.toDateString();

    const getWeekDays = (curr: Date) => {
        const week = [];
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
        d.setDate(d.getDate() - (viewMode === 'Day' ? 1 : 7));
        setViewDate(d);
    };

    const handleNext = () => {
        const d = new Date(viewDate);
        d.setDate(d.getDate() + (viewMode === 'Day' ? 1 : 7));
        setViewDate(d);
    };

    const formatDateRange = () => {
        if (viewMode === 'Day') {
            return viewDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        }
        const first = displayDays[0];
        const last = displayDays[displayDays.length - 1];
        if (first.getMonth() === last.getMonth()) {
            return `${first.toLocaleDateString('en-US', { month: 'long' })} ${first.getDate()} - ${last.getDate()}, ${first.getFullYear()}`;
        }
        return `${first.toLocaleDateString('en-US', { month: 'short' })} ${first.getDate()} - ${last.toLocaleDateString('en-US', { month: 'short' })} ${last.getDate()}, ${first.getFullYear()}`;
    };

    const getEventColor = (type: string) => eventColors[type] || eventColors['default'];

    return (
        <PortalLayout>
            <div className="flex h-[calc(100vh-100px)] overflow-hidden bg-slate-50">
                
                {/* Main Calendar Area */}
                <div className={`flex-1 flex flex-col transition-all duration-300 ${showSidePanel ? 'mr-96' : ''}`}>
                    
                    {/* Header - Teams Style */}
                    <div className="px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={openNewEventPanel}
                                className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-md hover:bg-indigo-700 shadow-sm flex items-center gap-2 transition-colors"
                            >
                                <PlusIcon /> New meeting
                            </button>
                            
                            <div className="h-6 w-px bg-slate-300" />
                            
                            <button 
                                onClick={() => setViewDate(new Date())}
                                className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded transition-colors"
                            >
                                Today
                            </button>
                            
                            <div className="flex items-center">
                                <button onClick={handlePrev} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
                                    <ChevronLeftIcon />
                                </button>
                                <button onClick={handleNext} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
                                    <ChevronRightIcon />
                                </button>
                            </div>
                            
                            <h2 className="text-lg font-semibold text-slate-800">
                                {formatDateRange()}
                            </h2>
                        </div>

                        {/* View Switcher - Teams Style */}
                        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                            {(['Day', 'WorkWeek', 'Week'] as const).map(mode => (
                                <button
                                    key={mode}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                                        viewMode === mode 
                                            ? 'bg-white shadow-sm text-slate-900' 
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                    onClick={() => setViewMode(mode)}
                                >
                                    {mode === 'WorkWeek' ? 'Work week' : mode}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="flex-1 overflow-auto bg-white">
                        <div className="flex min-h-full">
                            {/* Time Column */}
                            <div className="w-16 flex-shrink-0 border-r border-slate-200 bg-slate-50">
                                <div className="h-12" /> {/* Header spacer */}
                                {hours.map(hour => (
                                    <div key={hour} className="h-[60px] text-right pr-2 text-xs text-slate-500 -mt-2">
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
                                        <div key={colIdx} className="flex-1 border-r border-slate-100 last:border-r-0 relative">
                                            {/* Day Header */}
                                            <div className={`h-12 flex flex-col items-center justify-center border-b border-slate-200 sticky top-0 bg-white z-10 ${isToday ? 'bg-indigo-50' : ''}`}>
                                                <span className={`text-xs uppercase font-medium ${isToday ? 'text-indigo-600' : 'text-slate-500'}`}>
                                                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                                                </span>
                                                <span className={`text-lg font-semibold ${isToday ? 'text-indigo-600 bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center' : 'text-slate-800'}`}>
                                                    {day.getDate()}
                                                </span>
                                            </div>

                                            {/* Time Slots */}
                                            <div className="relative">
                                                {hours.map((hour, i) => (
                                                    <div 
                                                        key={i} 
                                                        className="h-[60px] border-b border-slate-50 hover:bg-indigo-50/30 cursor-pointer transition-colors"
                                                        onClick={() => handleTimeSlotClick(day, hour)}
                                                    />
                                                ))}

                                                {/* Current Time Indicator */}
                                                {isToday && currentTimePosition > 0 && (
                                                    <div 
                                                        className="absolute left-0 right-0 z-20 pointer-events-none"
                                                        style={{ top: `${currentTimePosition}px` }}
                                                    >
                                                        <div className="flex items-center">
                                                            <div className="w-3 h-3 bg-red-500 rounded-full -ml-1.5" />
                                                            <div className="flex-1 h-0.5 bg-red-500" />
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
                                                            className={`absolute left-1 right-1 p-2 rounded-md border-l-4 ${colors.border} ${colors.light} cursor-pointer hover:shadow-lg transition-shadow z-10 overflow-hidden`}
                                                            style={{ top: `${Math.max(0, topOffset)}px`, height: `${height}px` }}
                                                        >
                                                            <div className={`font-semibold text-xs truncate ${colors.text}`}>{evt.title}</div>
                                                            <div className="text-xs text-slate-500 truncate">
                                                                {evt.time} - {evt.endTime || ''}
                                                            </div>
                                                            {evt.location && (
                                                                <div className="text-xs text-slate-400 truncate mt-0.5">{evt.location}</div>
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
                </div>

                {/* Side Panel - Teams Style */}
                <div className={`fixed right-0 top-0 h-full w-96 bg-white border-l border-slate-200 shadow-xl transform transition-transform duration-300 z-30 ${showSidePanel ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="flex flex-col h-full">
                        {/* Panel Header */}
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                            <h3 className="font-semibold text-slate-800 text-lg">
                                {isCreating ? 'New meeting' : 'Edit meeting'}
                            </h3>
                            <button onClick={closeSidePanel} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                                <XIcon />
                            </button>
                        </div>

                        {/* Panel Content */}
                        <form onSubmit={handleSaveEvent} className="flex-1 overflow-y-auto p-6 space-y-5">
                            {/* Title */}
                            <div>
                                <input
                                    type="text"
                                    placeholder="Add a title"
                                    value={eventTitle}
                                    onChange={(e) => setEventTitle(e.target.value)}
                                    className="w-full text-xl font-semibold border-0 border-b-2 border-slate-200 focus:border-indigo-500 pb-2 outline-none transition-colors placeholder-slate-400"
                                    autoFocus
                                />
                            </div>

                            {/* Date & Time */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-slate-600">
                                    <ClockIcon />
                                    <span className="font-medium">Date & time</span>
                                </div>
                                <div className="ml-8 space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => { setStartDate(e.target.value); setEndDate(e.target.value); }}
                                            className="flex-1 px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <input
                                            type="time"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="w-28 px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <span className="flex-1 text-center text-slate-400">to</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="flex-1 px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <input
                                            type="time"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            className="w-28 px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Online Meeting Toggle */}
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                <VideoIcon />
                                <span className="flex-1 text-sm font-medium text-slate-700">Add online meeting</span>
                                <button
                                    type="button"
                                    onClick={() => setIsOnlineMeeting(!isOnlineMeeting)}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${isOnlineMeeting ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isOnlineMeeting ? 'translate-x-5' : ''}`} />
                                </button>
                            </div>

                            {/* Attendees */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-slate-600">
                                    <UserGroupIcon />
                                    <span className="font-medium">Attendees</span>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Add attendees (comma separated)"
                                    value={attendees}
                                    onChange={(e) => setAttendees(e.target.value)}
                                    className="w-full ml-8 px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            {/* Location */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-slate-600">
                                    <LocationIcon />
                                    <span className="font-medium">Location</span>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Add a location"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="w-full ml-8 px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            {/* Category */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-slate-600">
                                    <CalendarIcon />
                                    <span className="font-medium">Category</span>
                                </div>
                                <select
                                    value={eventType}
                                    onChange={(e) => setEventType(e.target.value)}
                                    className="w-full ml-8 px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    {Object.keys(eventColors).filter(k => k !== 'default').map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Description */}
                            <div className="space-y-3">
                                <textarea
                                    placeholder="Add a description or attach documents"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </form>

                        {/* Panel Footer */}
                        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                            {!isCreating && selectedEvent && (
                                <button
                                    type="button"
                                    onClick={handleDeleteClick}
                                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <TrashIcon /> Delete
                                </button>
                            )}
                            <div className="flex-1" />
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={closeSidePanel}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-md text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveEvent}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700 transition-colors"
                                >
                                    Save
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
                    title="Delete Event"
                    message="Are you sure you want to delete this event? This action cannot be undone."
                    confirmText="Delete"
                    isDanger={true}
                />
            </div>
        </PortalLayout>
    );
};

export default PortalCalendar;
