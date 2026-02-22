import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import PortalLayout from '../components/PortalLayout';
import {
    Search as SearchIcon,
    Send as SendIcon,
    UserPlus as UserPlusIcon,
    Paperclip as PaperClipIcon,
    Smile as SmileIcon,
    MessageSquare as MessageSquareIcon
} from 'lucide-react';
import { contactService } from '../services/contactService';
import { messageService } from '../services/messageService';
import { io, Socket } from 'socket.io-client';
import TransliterateInput from '../components/TransliterateInput';

// --- Types ---

interface Message {
    _id: string;
    content: string;
    sender: string;
    timestamp: string;
    createdAt: string;
    read?: boolean;
    senderModel?: any;
}

interface Conversation {
    contactId: string;
    name: string;
    lastMessage: {
        content: string;
        timestamp: string;
        senderId?: string;
    } | null;
    avatar?: string;
    unreadCount?: number;
}

interface PortalUser {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
}

// --- Constants ---

const COMMON_EMOJIS = [
    '😀', '😂', '😊', '😍', '🤔', '👍', '👎', '❤️', '🔥', '🎉',
    '✅', '⭐', '💼', '📎', '📄', '⚖️', '🏛️', '📝', '🤝', '💡'
];

// --- Helpers ---

const isSameDay = (d1: string, d2: string): boolean => {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate();
};

const formatDateSeparator = (isoStr: string): string => {
    const date = new Date(isoStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (isSameDay(isoStr, today.toISOString())) return 'Today';
    if (isSameDay(isoStr, yesterday.toISOString())) return 'Yesterday';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatFullDateTime = (isoStr: string): string => {
    return new Date(isoStr).toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

const getSenderId = (sender: any): string => {
    if (typeof sender === 'object' && sender !== null) return (sender as any)._id || String(sender);
    return String(sender);
};

const linkifyContent = (text: string, isMe: boolean): React.ReactNode => {
    const urlRegex = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }
        parts.push(
            <a key={match.index} href={match[0]} target="_blank" rel="noopener noreferrer"
                className={`underline break-all ${isMe ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:text-blue-800'}`}>
                {match[0]}
            </a>
        );
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }
    return parts.length > 0 ? <>{parts}</> : text;
};

const getBubbleRounding = (isMe: boolean, isFirst: boolean, isLast: boolean): string => {
    if (isFirst && isLast) return 'rounded-2xl';
    if (isFirst) return isMe ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-bl-md';
    if (isLast) return isMe ? 'rounded-2xl rounded-tr-md' : 'rounded-2xl rounded-tl-md';
    return isMe ? 'rounded-xl rounded-r-md' : 'rounded-xl rounded-l-md';
};

// --- Typing Indicator ---

const TypingIndicator: React.FC = () => (
    <div className="flex items-center gap-3 max-w-2xl pl-12">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-md shadow-sm">
            <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
        </div>
    </div>
);

// --- Main Component ---

const PortalMessages: React.FC = () => {
    const { t } = useTranslation();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'chats' | 'requests'>('chats');
    const [activeMessages, setActiveMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [userId, setUserId] = useState<string>('');

    // Online & Typing state
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Emoji picker
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

    // Search & Add Friend State
    const [showAddFriendModal, setShowAddFriendModal] = useState(false);
    const [searchEmail, setSearchEmail] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [foundUser, setFoundUser] = useState<PortalUser | null>(null);
    const [searchError, setSearchError] = useState('');
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<Socket | null>(null);

    // Cached user info for avatar
    const currentUserInitials = useRef<string>('ME');
    useEffect(() => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                setUserId(user._id || user.id);
                const fname = user.firstName || '';
                const lname = user.lastName || '';
                currentUserInitials.current = ((fname[0] || '') + (lname[0] || '')).toUpperCase() || 'ME';
            }
        } catch (e) {
            console.error(e);
        }
        const loadData = async () => {
            await fetchMessagesAndContacts();
            await fetchPendingRequests();
        };
        loadData();
    }, []);

    // Socket initialization
    useEffect(() => {
        if (!userId) return;

        socketRef.current = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');

        socketRef.current.on('connect', () => {
            console.log('Socket connected');
            socketRef.current?.emit('join', userId);
        });

        // Online status listeners
        socketRef.current.on('userOnline', (onlineUserId: string) => {
            setOnlineUsers(prev => new Set(prev).add(onlineUserId));
        });
        socketRef.current.on('userOffline', (offlineUserId: string) => {
            setOnlineUsers(prev => {
                const next = new Set(prev);
                next.delete(offlineUserId);
                return next;
            });
        });
        socketRef.current.on('onlineUsersList', (userIds: string[]) => {
            setOnlineUsers(new Set(userIds));
        });

        // Typing listeners
        socketRef.current.on('typing', ({ userId: typerId }: { userId: string }) => {
            setTypingUsers(prev => new Set(prev).add(typerId));
        });
        socketRef.current.on('stopTyping', ({ userId: typerId }: { userId: string }) => {
            setTypingUsers(prev => {
                const next = new Set(prev);
                next.delete(typerId);
                return next;
            });
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, [userId]);

    // Ref to track selected contact for socket callbacks
    const selectedContactIdRef = useRef<string | null>(null);
    useEffect(() => {
        selectedContactIdRef.current = selectedContactId;
        setTypingUsers(new Set());
    }, [selectedContactId]);

    // Listen for new messages
    useEffect(() => {
        if (!socketRef.current) return;

        const listener = (message: any) => {
            const currentContactId = selectedContactIdRef.current;
            const msgSender = message.sender?._id || message.sender;
            const msgRecipient = message.recipient?._id || message.recipient;
            const isRelated = (msgSender === currentContactId) || (msgRecipient === currentContactId);

            if (isRelated) {
                if (currentContactId && msgSender === currentContactId) {
                    messageService.markAsRead(currentContactId);
                }
                setActiveMessages(prev => {
                    if (prev.some(m => m._id === message._id)) return prev;
                    const formattedMsg: Message = {
                        _id: message._id,
                        content: message.content,
                        sender: typeof msgSender === 'object' ? msgSender.toString() : msgSender,
                        timestamp: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        createdAt: message.createdAt,
                        read: message.read
                    };
                    return [...prev, formattedMsg];
                });
                // Clear typing indicator when message arrives from contact
                if (msgSender === currentContactId) {
                    setTypingUsers(prev => {
                        const next = new Set(prev);
                        next.delete(msgSender);
                        return next;
                    });
                }
            }
            updateConversationsList(message);
        };

        const readListener = ({ recipientId }: any) => {
            if (selectedContactIdRef.current === recipientId) {
                setActiveMessages(prev => prev.map(msg =>
                    (msg.sender === userId && !msg.read) ? { ...msg, read: true } : msg
                ));
            }
        };

        socketRef.current.off('newMessage');
        socketRef.current.on('newMessage', listener);
        socketRef.current.on('messagesRead', readListener);

        return () => {
            socketRef.current?.off('newMessage', listener);
            socketRef.current?.off('messagesRead', readListener);
        };
    }, [userId]);

    const updateConversationsList = (message: any) => {
        setConversations(prev => {
            const msgSender = message.sender?._id || message.sender;
            const msgRecipient = message.recipient?._id || message.recipient;
            const otherId = msgSender === userId ? msgRecipient : msgSender;
            const existingIndex = prev.findIndex(c => c.contactId === otherId);
            const newLastMsg = {
                content: message.content,
                timestamp: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                senderId: msgSender
            };
            if (existingIndex >= 0) {
                const newConvos = [...prev];
                newConvos[existingIndex] = { ...newConvos[existingIndex], lastMessage: newLastMsg };
                const [moved] = newConvos.splice(existingIndex, 1);
                return [moved, ...newConvos];
            } else {
                fetchMessagesAndContacts();
                return prev;
            }
        });
    };

    const fetchPendingRequests = async () => {
        try {
            const requests = await contactService.getRequests();
            setPendingRequests(requests);
        } catch (error) {
            console.error("Failed to fetch pending requests", error);
        }
    };

    const fetchMessagesAndContacts = async () => {
        try {
            const conversationsData = await messageService.getConversations();
            const mappedConversations: Conversation[] = conversationsData.map((convo: any) => ({
                contactId: convo.contactId,
                name: convo.name,
                avatar: undefined,
                lastMessage: convo.lastMessage ? {
                    content: convo.lastMessage.content,
                    timestamp: new Date(convo.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    senderId: convo.lastMessage.senderId
                } : null,
                unreadCount: convo.unreadCount || 0
            }));
            setConversations(mappedConversations);
        } catch (error) {
            console.error("Failed to fetch conversations", error);
        }
    };

    const handleSelectContact = async (contactId: string) => {
        setSelectedContactId(contactId);
        setActiveMessages([]);
        setShowEmojiPicker(false);

        setConversations(prev => prev.map(convo =>
            convo.contactId === contactId
                ? { ...convo, unreadCount: 0 }
                : convo
        ));

        try {
            await messageService.markAsRead(contactId);
            const msgs = await messageService.getMessages(contactId);
            const formatted: Message[] = msgs.map((m: any) => ({
                _id: m._id,
                content: m.content,
                sender: m.sender,
                timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                createdAt: m.createdAt,
                read: m.read
            }));
            setActiveMessages(formatted);
        } catch (error) {
            console.error("Failed to fetch messages", error);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMessage.trim() || !selectedContactId) return;

        // Stop typing indicator on send
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        socketRef.current?.emit('stopTyping', { targetUserId: selectedContactId });

        try {
            const sentMsg = await messageService.sendMessage(selectedContactId, inputMessage);
            const now = new Date().toISOString();
            const formattedMsg: Message = {
                _id: sentMsg._id,
                content: sentMsg.content,
                sender: sentMsg.sender._id || sentMsg.sender || userId,
                timestamp: new Date(sentMsg.createdAt || now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                createdAt: sentMsg.createdAt || now,
                read: sentMsg.read
            };
            setActiveMessages(prev => {
                if (prev.some(m => m._id === sentMsg._id)) return prev;
                return [...prev, formattedMsg];
            });
            setInputMessage('');
        } catch (error) {
            console.error("Failed to send message", error);
        }
    };

    // Typing emission handler
    const handleInputChange = (value: string) => {
        setInputMessage(value);
        if (selectedContactId && socketRef.current) {
            socketRef.current.emit('typing', { targetUserId: selectedContactId });
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                socketRef.current?.emit('stopTyping', { targetUserId: selectedContactId });
            }, 2000);
        }
    };

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeMessages]);

    // Emoji picker click-outside
    useEffect(() => {
        if (!showEmojiPicker) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showEmojiPicker]);

    const handleEmojiSelect = (emoji: string) => {
        setInputMessage(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    // Search Logic
    const performSearch = useCallback(async (email: string) => {
        setIsSearching(true);
        setFoundUser(null);
        setSearchError('');
        try {
            const users = await contactService.searchUsers(email);
            if (users && users.length > 0) {
                const match = users.find((u: any) => u.email === email) || users[0];
                setFoundUser({
                    id: match._id,
                    name: `${match.firstName} ${match.lastName || ''}`.trim(),
                    email: match.email,
                    avatar: (match.firstName || 'U').substring(0, 2).toUpperCase(),
                    role: match.role
                });
            } else {
                setFoundUser(null);
                setSearchError(t('messages.userNotFound'));
            }
        } catch (err) {
            console.error(err);
            setSearchError(t('messages.searchError'));
        } finally {
            setIsSearching(false);
        }
    }, [t]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchEmail.trim()) {
                performSearch(searchEmail);
            } else {
                setFoundUser(null);
                setSearchError('');
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [searchEmail, performSearch]);

    const handleSearchUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchEmail.trim()) performSearch(searchEmail);
    };

    const handleAddFoundUser = async () => {
        if (!foundUser) return;
        try {
            await contactService.sendRequest(foundUser.id);
            setSearchError(t('messages.friendRequestSent'));
            setTimeout(() => {
                setShowAddFriendModal(false);
                setSearchEmail('');
                setFoundUser(null);
                setSearchError('');
            }, 1000);
        } catch (err: any) {
            console.error(err);
            setSearchError(err.response?.data?.message || 'Failed to send request');
        }
    };

    const handleRespondToRequest = async (requestId: string, action: 'accept' | 'reject') => {
        try {
            await contactService.respondToRequest(requestId, action);
            if (action === 'accept') {
                await fetchMessagesAndContacts();
                setActiveTab('chats');
            }
            await fetchPendingRequests();
        } catch (error) {
            console.error("Failed to respond to request", error);
        }
    };

    const closeModal = () => {
        setShowAddFriendModal(false);
        setSearchEmail('');
        setFoundUser(null);
        setIsSearching(false);
    };

    // ESC to close modals
    useEffect(() => {
        if (!showAddFriendModal) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeModal();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showAddFriendModal]);

    const selectedConversation = conversations.find(c => c.contactId === selectedContactId);
    const isContactTyping = selectedContactId ? typingUsers.has(selectedContactId) : false;
    const isContactOnline = selectedContactId ? onlineUsers.has(selectedContactId) : false;

    // --- Avatar helper ---
    const getAvatarText = (senderId: string): string => {
        if (senderId === userId) return currentUserInitials.current;
        const convo = conversations.find(c => c.contactId === senderId);
        if (!convo) return 'OT';
        const parts = convo.name.split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return convo.name.substring(0, 2).toUpperCase();
    };

    // --- Render messages with date separators and grouping ---
    const renderMessages = () => {
        const elements: React.ReactNode[] = [];

        for (let i = 0; i < activeMessages.length; i++) {
            const msg = activeMessages[i];
            const prevMsg = i > 0 ? activeMessages[i - 1] : null;
            const nextMsg = i < activeMessages.length - 1 ? activeMessages[i + 1] : null;

            const senderId = getSenderId(msg.sender);
            const isMe = senderId === userId;

            // Date separator
            const showDateSep = !prevMsg || (msg.createdAt && prevMsg.createdAt && !isSameDay(prevMsg.createdAt, msg.createdAt));
            if (showDateSep && msg.createdAt) {
                elements.push(
                    <div key={`date-${i}`} className="flex items-center gap-3 my-5">
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-[11px] font-medium text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
                            {formatDateSeparator(msg.createdAt)}
                        </span>
                        <div className="flex-1 h-px bg-slate-200" />
                    </div>
                );
            }

            // Grouping
            const prevSenderId = prevMsg ? getSenderId(prevMsg.sender) : null;
            const nextSenderId = nextMsg ? getSenderId(nextMsg.sender) : null;
            const prevSameDay = prevMsg?.createdAt && msg.createdAt ? isSameDay(prevMsg.createdAt, msg.createdAt) : false;
            const nextSameDay = nextMsg?.createdAt && msg.createdAt ? isSameDay(nextMsg.createdAt, msg.createdAt) : false;

            const isFirstInGroup = senderId !== prevSenderId || !prevSameDay;
            const isLastInGroup = senderId !== nextSenderId || !nextSameDay;

            const bubbleRounding = getBubbleRounding(isMe, isFirstInGroup, isLastInGroup);
            const avatarText = getAvatarText(senderId);

            elements.push(
                <div
                    key={msg._id}
                    className={`flex gap-2.5 max-w-2xl group ${isMe ? 'flex-row-reverse ml-auto' : ''} ${isFirstInGroup ? 'mt-4' : 'mt-0.5'}`}
                    title={msg.createdAt ? formatFullDateTime(msg.createdAt) : ''}
                >
                    {/* Avatar - only show on first message in group */}
                    <div className="w-8 flex-shrink-0">
                        {isFirstInGroup ? (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${isMe ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                                {avatarText}
                            </div>
                        ) : null}
                    </div>

                    {/* Bubble */}
                    <div className={`flex flex-col ${isMe ? 'items-end' : ''}`}>
                        <div className={`${isMe
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                            : 'bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 text-slate-700'
                            } px-4 py-2.5 ${bubbleRounding} shadow-sm text-sm leading-relaxed`}>
                            <p>{linkifyContent(msg.content, isMe)}</p>
                        </div>

                        {/* Timestamp on hover + read receipt */}
                        <div className={`flex items-center gap-1.5 mt-0.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${isMe ? 'flex-row-reverse' : ''}`}>
                            <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                            {isMe && (
                                <span className={`text-[10px] ${msg.read ? 'text-blue-500' : 'text-slate-300'}`}>
                                    {msg.read ? '✓✓' : '✓'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return elements;
    };

    return (
        <PortalLayout>
            <div className="flex h-[calc(100vh-140px)] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">

                {/* Left Sidebar */}
                <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50/50">

                    {/* Header */}
                    <div className="p-4 border-b border-slate-200 bg-white">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-900">{t('messages.chat')}</h2>
                            <button
                                onClick={() => setShowAddFriendModal(true)}
                                className="p-2 hover:bg-blue-50 rounded-full transition-colors duration-200 flex items-center gap-2 group"
                                title="Add friend via email"
                            >
                                <span className="text-xs font-bold text-blue-600 hidden group-hover:inline-block">{t('messages.addFriend')}</span>
                                <UserPlusIcon className="w-5 h-5 text-blue-600" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 mb-3">
                            <button
                                onClick={() => setActiveTab('chats')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors duration-200 ${activeTab === 'chats' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                {t('messages.chats')}
                            </button>
                            <button
                                onClick={() => setActiveTab('requests')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors duration-200 relative ${activeTab === 'requests' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                {t('messages.requests')}
                                {pendingRequests.length > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] text-white ring-2 ring-white">
                                        {pendingRequests.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {activeTab === 'chats' && (
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <SearchIcon className="w-5 h-5 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder={t('messages.searchChats')}
                                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
                                />
                            </div>
                        )}
                    </div>

                    {/* Content List */}
                    <div className="flex-1 overflow-y-auto">
                        {activeTab === 'chats' ? (
                            <div className="divide-y divide-slate-100">
                                {conversations.length === 0 && (
                                    <div className="p-4 text-center text-slate-500 text-sm">{t('messages.noChats')}</div>
                                )}

                                {conversations.map((convo) => {
                                    const hasUnread = (convo.unreadCount || 0) > 0;
                                    const isSelected = selectedContactId === convo.contactId;
                                    const isOnline = onlineUsers.has(convo.contactId);
                                    const isSentByMe = convo.lastMessage?.senderId === userId;

                                    return (
                                        <div
                                            key={convo.contactId}
                                            onClick={() => handleSelectContact(convo.contactId)}
                                            className={`p-4 cursor-pointer transition-all duration-200 relative ${isSelected
                                                ? 'bg-blue-50/70'
                                                : hasUnread
                                                    ? 'bg-blue-50/30 hover:bg-blue-50/50'
                                                    : 'hover:bg-slate-100/70'
                                                }`}
                                        >
                                            {(isSelected || hasUnread) && (
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${isSelected ? 'bg-blue-600' : 'bg-blue-400'}`} />
                                            )}

                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="relative">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${hasUnread ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'
                                                            }`}>
                                                            {convo.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        {/* Dynamic online/offline indicator */}
                                                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full transition-colors duration-300 ${isOnline ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                                                    </div>
                                                    <div>
                                                        <h4 className={`text-sm ${hasUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                                            {convo.name}
                                                        </h4>
                                                        {!hasUnread && (
                                                            <p className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wide w-fit ${isOnline ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                                                                {isOnline ? t('messages.activeStatus') : 'Offline'}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className={`text-xs ${hasUnread ? 'font-bold text-blue-600' : 'font-medium text-slate-400'}`}>
                                                        {convo.lastMessage ? convo.lastMessage.timestamp : ''}
                                                    </span>
                                                    {hasUnread && (
                                                        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                                                            {convo.unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className={`text-sm line-clamp-1 pl-12 ${hasUnread ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
                                                {convo.lastMessage
                                                    ? (isSentByMe ? `You: ${convo.lastMessage.content}` : convo.lastMessage.content)
                                                    : t('messages.noMessages')}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {pendingRequests.length === 0 && (
                                    <div className="p-8 text-center flex flex-col items-center">
                                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 text-slate-400">
                                            <UserPlusIcon className="w-6 h-6" />
                                        </div>
                                        <p className="text-slate-500 text-sm font-medium">{t('messages.noPendingRequests')}</p>
                                        <button
                                            onClick={() => setShowAddFriendModal(true)}
                                            className="mt-2 text-xs text-blue-600 font-bold hover:underline"
                                        >
                                            {t('messages.findPeople')}
                                        </button>
                                    </div>
                                )}

                                {pendingRequests.map(req => (
                                    <div key={req._id} className="p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                                                {(req.sender.firstName || 'U').substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-900">{req.sender.firstName} {req.sender.lastName}</h4>
                                                <p className="text-xs text-slate-500">{req.sender.email}</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{t('messages.sentFriendRequest')}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pl-13">
                                            <button
                                                onClick={() => handleRespondToRequest(req._id, 'accept')}
                                                className="flex-1 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                            >
                                                {t('messages.accept')}
                                            </button>
                                            <button
                                                onClick={() => handleRespondToRequest(req._id, 'reject')}
                                                className="flex-1 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors"
                                            >
                                                {t('messages.reject')}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Area: Chat Interface */}
                <div className="flex-1 flex flex-col bg-white">
                    {selectedConversation ? (
                        <>
                            {/* Chat Header */}
                            <div className="h-20 px-6 border-b border-slate-200 flex justify-between items-center bg-white">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-sm">
                                            {selectedConversation.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full transition-colors duration-300 ${isContactOnline ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-slate-900 text-lg">{selectedConversation.name}</h3>
                                            <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${isContactOnline
                                                ? 'text-green-600 bg-green-50 border-green-100'
                                                : 'text-slate-500 bg-slate-50 border-slate-200'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${isContactOnline ? 'bg-green-500' : 'bg-slate-400'}`} />
                                                {isContactOnline ? t('messages.available') : 'Offline'}
                                            </span>
                                        </div>
                                        <div className="flex gap-6 text-sm">
                                            <button className="font-bold text-slate-900 border-b-2 border-blue-600 pb-1 px-1">{t('messages.chat')}</button>
                                            <button className="font-medium text-slate-500 hover:text-slate-700 pb-1 px-1 transition-colors">{t('messages.shared')}</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Chat Messages */}
                            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                                {activeMessages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                        <MessageSquareIcon className="w-10 h-10 mb-2 opacity-40" />
                                        <p className="text-sm">{t('messages.noMessages')}</p>
                                    </div>
                                )}
                                {renderMessages()}
                                {isContactTyping && <TypingIndicator />}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Chat Input */}
                            <div className="p-4 bg-white border-t border-slate-200">
                                <form onSubmit={handleSendMessage} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all relative">
                                    <button type="button" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                                        <PaperClipIcon className="w-5 h-5" />
                                    </button>

                                    {/* Emoji Picker */}
                                    <div className="relative" ref={emojiPickerRef}>
                                        <button
                                            type="button"
                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                            className={`p-2 rounded-lg transition-colors ${showEmojiPicker ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            <SmileIcon className="w-5 h-5" />
                                        </button>
                                        {showEmojiPicker && (
                                            <div className="absolute bottom-12 left-0 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-50 w-64 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                                <div className="grid grid-cols-5 gap-1">
                                                    {COMMON_EMOJIS.map(emoji => (
                                                        <button
                                                            key={emoji}
                                                            type="button"
                                                            onClick={() => handleEmojiSelect(emoji)}
                                                            className="w-10 h-10 flex items-center justify-center text-xl hover:bg-slate-100 rounded-lg transition-colors"
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <TransliterateInput
                                        value={inputMessage}
                                        onChangeText={handleInputChange}
                                        placeholder={t('messages.typePlaceholder')}
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
                                    />
                                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg shadow-sm transition-colors">
                                        <SendIcon className="w-5 h-5" />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        /* Empty State - No conversation selected */
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-slate-100 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
                                <MessageSquareIcon className="w-10 h-10 text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Your Messages</h3>
                            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                                Select a conversation from the sidebar to start chatting, or add a new contact to begin.
                            </p>
                        </div>
                    )}
                </div>

                {/* Add Friend Modal */}
                {showAddFriendModal && (
                    <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 transform transition-all animate-in fade-in zoom-in-95 duration-200">
                            <h3 className="text-lg font-bold text-slate-900 mb-2">{t('messages.findPeople')}</h3>
                            <p className="text-sm text-slate-500 mb-6">{t('messages.searchByEmail')}</p>

                            <form onSubmit={handleSearchUser}>
                                <div className="mb-4 relative">
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">{t('messages.emailAddress')}</label>
                                    <input
                                        type="email"
                                        required
                                        value={searchEmail}
                                        onChange={(e) => setSearchEmail(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                                        placeholder="user@example.com"
                                        autoFocus
                                    />
                                    <button
                                        type="submit"
                                        disabled={isSearching || !searchEmail}
                                        className="absolute right-2 top-0 bottom-0 my-auto h-fit mt-7 p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Search"
                                    >
                                        {isSearching ? (
                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : (
                                            <SearchIcon className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </form>

                            {searchError && (
                                <div className={`mb-4 p-3 text-sm rounded-lg border animate-in fade-in slide-in-from-top-1 ${searchError.includes('sent') || searchError.includes('भेजा') || searchError.includes('पाठवली')
                                    ? 'bg-green-50 text-green-600 border-green-100'
                                    : 'bg-red-50 text-red-600 border-red-100'
                                    }`}>
                                    {searchError}
                                </div>
                            )}

                            {foundUser && (
                                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between mb-4 animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 text-sm">
                                            {foundUser.avatar}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900">{foundUser.name}</h4>
                                            <p className="text-xs text-slate-500">{foundUser.email}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleAddFoundUser}
                                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-xs font-bold px-3"
                                        title="Send Request"
                                    >
                                        {t('messages.sendRequest')}
                                    </button>
                                </div>
                            )}

                            <div className="flex justify-end pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                                >
                                    {t('messages.close')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PortalLayout>
    );
};

export default PortalMessages;
