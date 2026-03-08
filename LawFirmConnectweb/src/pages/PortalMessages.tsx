import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import PortalLayout from '../components/PortalLayout';
import {
    Search as SearchIcon,
    Send as SendIcon,
    UserPlus as UserPlusIcon,
    Paperclip as PaperClipIcon,
    FileText,
    Download,
    X as XIcon,
    MessageSquare
} from 'lucide-react';
import { contactService } from '../services/contactService';
import { messageService } from '../services/messageService';
import type { Attachment } from '../services/messageService';
import { useSocket } from '../contexts/SocketContext';
import TransliterateInput from '../components/TransliterateInput';

interface Message {
    _id: string;
    content: string;
    sender: string;
    createdAt: string;
    timestamp: string;
    read?: boolean;
    attachment?: Attachment | null;
}

interface Conversation {
    contactId: string;
    name: string;
    lastMessage: {
        content: string;
        timestamp: string;
        senderId?: string;
        attachment?: Attachment | null;
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

// Get user data from storage once
function getStoredUser(): { _id: string; firstName: string; lastName: string } | null {
    try {
        const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (raw) return JSON.parse(raw);
    } catch {}
    return null;
}

const PortalMessages: React.FC = () => {
    const { t } = useTranslation();
    const { socket, onlineUsers } = useSocket();

    // Initialize userId from storage once (not in render body)
    const storedUser = useMemo(() => getStoredUser(), []);
    const userId = storedUser?._id || '';
    const myInitials = useMemo(() => {
        if (!storedUser) return 'ME';
        const f = storedUser.firstName?.[0] || '';
        const l = storedUser.lastName?.[0] || '';
        return (f + l).toUpperCase() || 'ME';
    }, [storedUser]);

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'chats' | 'requests'>('chats');
    const [activeMessages, setActiveMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

    // Attachment state
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Search & Add Friend State
    const [showAddFriendModal, setShowAddFriendModal] = useState(false);
    const [searchEmail, setSearchEmail] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [foundUser, setFoundUser] = useState<PortalUser | null>(null);
    const [searchError, setSearchError] = useState('');
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const selectedContactIdRef = useRef<string | null>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        selectedContactIdRef.current = selectedContactId;
    }, [selectedContactId]);

    // Load initial data
    useEffect(() => {
        fetchMessagesAndContacts();
        fetchPendingRequests();
    }, []);

    // Socket: new message listener
    useEffect(() => {
        if (!socket) return;

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
                    return [...prev, {
                        _id: message._id,
                        content: message.content,
                        sender: typeof msgSender === 'object' ? msgSender.toString() : msgSender,
                        createdAt: message.createdAt,
                        timestamp: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        read: message.read,
                        attachment: message.attachment || null
                    }];
                });
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

        socket.on('newMessage', listener);
        socket.on('messagesRead', readListener);

        return () => {
            socket.off('newMessage', listener);
            socket.off('messagesRead', readListener);
        };
    }, [socket, userId]);

    // Socket: typing indicators
    useEffect(() => {
        if (!socket) return;

        const onTyping = ({ senderId }: { senderId: string }) => {
            setTypingUsers(prev => {
                const next = new Set(prev);
                next.add(senderId);
                return next;
            });
        };

        const onStopTyping = ({ senderId }: { senderId: string }) => {
            setTypingUsers(prev => {
                const next = new Set(prev);
                next.delete(senderId);
                return next;
            });
        };

        socket.on('typing', onTyping);
        socket.on('stopTyping', onStopTyping);

        return () => {
            socket.off('typing', onTyping);
            socket.off('stopTyping', onStopTyping);
        };
    }, [socket]);

    const emitTyping = useCallback(() => {
        if (!socket || !selectedContactId) return;
        socket.emit('typing', { senderId: userId, recipientId: selectedContactId });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stopTyping', { senderId: userId, recipientId: selectedContactId });
        }, 2000);
    }, [socket, selectedContactId, userId]);

    const updateConversationsList = (message: any) => {
        setConversations(prev => {
            const msgSender = message.sender?._id || message.sender;
            const msgRecipient = message.recipient?._id || message.recipient;
            const otherId = msgSender === userId ? msgRecipient : msgSender;

            const existingIndex = prev.findIndex(c => c.contactId === otherId);
            const newLastMsg = {
                content: message.content,
                timestamp: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                senderId: msgSender,
                attachment: message.attachment || null
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
        } catch {}
    };

    const fetchMessagesAndContacts = async () => {
        try {
            const conversationsData = await messageService.getConversations();
            const mapped: Conversation[] = conversationsData.map((convo: any) => ({
                contactId: convo.contactId,
                name: convo.name,
                avatar: undefined,
                lastMessage: convo.lastMessage ? {
                    content: convo.lastMessage.content,
                    timestamp: new Date(convo.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    senderId: convo.lastMessage.senderId,
                    attachment: convo.lastMessage.attachment || null
                } : null,
                unreadCount: convo.unreadCount || 0
            }));
            setConversations(mapped);
        } catch {}
    };

    const handleSelectContact = async (contactId: string) => {
        setSelectedContactId(contactId);
        setActiveMessages([]);

        setConversations(prev => prev.map(convo =>
            convo.contactId === contactId ? { ...convo, unreadCount: 0 } : convo
        ));

        try {
            await messageService.markAsRead(contactId);
            const msgs = await messageService.getMessages(contactId);
            const formatted: Message[] = msgs.map((m: any) => ({
                _id: m._id,
                content: m.content,
                sender: m.sender,
                createdAt: m.createdAt,
                timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                read: m.read,
                attachment: m.attachment || null
            }));
            setActiveMessages(formatted);
        } catch {}
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!inputMessage.trim() && !pendingFile) || !selectedContactId) return;

        try {
            const sentMsg = await messageService.sendMessage(selectedContactId, inputMessage, pendingFile || undefined);
            const formattedMsg: Message = {
                _id: sentMsg._id,
                content: sentMsg.content,
                sender: sentMsg.sender._id || sentMsg.sender || userId,
                createdAt: sentMsg.createdAt,
                timestamp: new Date(sentMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                read: sentMsg.read,
                attachment: sentMsg.attachment || null
            };

            setActiveMessages(prev => {
                if (prev.some(m => m._id === sentMsg._id)) return prev;
                return [...prev, formattedMsg];
            });

            setInputMessage('');
            setPendingFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

            // Stop typing indicator
            if (socket) {
                socket.emit('stopTyping', { senderId: userId, recipientId: selectedContactId });
            }
        } catch {}
    };

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeMessages]);

    // Conversation search (client-side filter)
    const filteredConversations = useMemo(() => {
        if (!searchQuery.trim()) return conversations;
        const q = searchQuery.toLowerCase();
        return conversations.filter(c => c.name.toLowerCase().includes(q));
    }, [conversations, searchQuery]);

    // Search user by email for Add Friend
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
                setSearchError('User not found');
            }
        } catch {
            setSearchError('Error searching for user');
        } finally {
            setIsSearching(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchEmail.trim()) performSearch(searchEmail);
            else { setFoundUser(null); setSearchError(''); }
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
            setSearchError('Friend request sent!');
            setTimeout(() => {
                setShowAddFriendModal(false);
                setSearchEmail('');
                setFoundUser(null);
                setSearchError('');
            }, 1000);
        } catch (err: any) {
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
        } catch {}
    };

    const closeModal = () => {
        setShowAddFriendModal(false);
        setSearchEmail('');
        setFoundUser(null);
        setIsSearching(false);
    };

    // ESC to close modal
    useEffect(() => {
        if (!showAddFriendModal) return;
        const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showAddFriendModal]);

    // File attachment handler
    const handleAttachmentClick = () => fileInputRef.current?.click();
    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setPendingFile(file);
    };

    const selectedConversation = conversations.find(c => c.contactId === selectedContactId);
    const isContactTyping = selectedContactId ? typingUsers.has(selectedContactId) : false;

    // Date separator logic
    const getDateLabel = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const getInitials = (name: string) => {
        if (!name) return '??';
        const parts = name.split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const isImageMime = (mime?: string) => mime?.startsWith('image/');

    return (
        <PortalLayout>
            <div className="flex h-[calc(100vh-140px)] card-surface overflow-hidden relative">

                {/* Left Sidebar */}
                <div className="w-80 flex flex-col" style={{ borderRight: '1px solid var(--color-surface-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>

                    {/* Header */}
                    <div className="p-4" style={{ borderBottom: '1px solid var(--color-surface-border)', backgroundColor: 'var(--color-surface)' }}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{t('messages.chat')}</h2>
                            <button
                                onClick={() => setShowAddFriendModal(true)}
                                className="p-2 rounded-full transition-colors flex items-center gap-2 group hover:opacity-80"
                                title="Add friend via email"
                                style={{ color: 'var(--color-accent)' }}
                            >
                                <span className="text-xs font-bold hidden group-hover:inline-block" style={{ color: 'var(--color-accent)' }}>{t('messages.addFriend')}</span>
                                <UserPlusIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 mb-3">
                            <button
                                onClick={() => setActiveTab('chats')}
                                className="flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors"
                                style={activeTab === 'chats'
                                    ? { background: 'var(--gradient-accent)', color: '#fff' }
                                    : { backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }
                                }
                            >
                                {t('messages.chats')}
                            </button>
                            <button
                                onClick={() => setActiveTab('requests')}
                                className="flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors relative"
                                style={activeTab === 'requests'
                                    ? { background: 'var(--gradient-accent)', color: '#fff' }
                                    : { backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }
                                }
                            >
                                {t('messages.requests')}
                                {pendingRequests.length > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] text-white ring-2"
                                          style={{ backgroundColor: '#EF4444' }}>
                                        {pendingRequests.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Working search bar */}
                        {activeTab === 'chats' && (
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <SearchIcon className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
                                </div>
                                <input
                                    type="text"
                                    placeholder={t('messages.searchPlaceholder') || t('messages.searchChats')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 rounded-lg leading-5 text-sm transition-colors border focus:outline-none focus:ring-2"
                                    style={{
                                        backgroundColor: 'var(--color-bg-tertiary)',
                                        borderColor: 'var(--color-surface-border)',
                                        color: 'var(--color-text-primary)',
                                        '--tw-ring-color': 'var(--color-accent-glow)',
                                    } as React.CSSProperties}
                                />
                            </div>
                        )}
                    </div>

                    {/* Content List */}
                    <div className="flex-1 overflow-y-auto">
                        {activeTab === 'chats' ? (
                            <div>
                                {conversations.length === 0 && (
                                    <div className="p-8 text-center flex flex-col items-center gap-3">
                                        <div className="w-14 h-14 rounded-full flex items-center justify-center"
                                             style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}>
                                            <MessageSquare className="w-7 h-7" />
                                        </div>
                                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                                            {t('messages.noConversations') || 'No conversations yet'}
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                                            Add a contact from Firm Connect to start messaging.
                                        </p>
                                        <button
                                            onClick={() => setShowAddFriendModal(true)}
                                            className="mt-1 text-xs font-bold hover:underline"
                                            style={{ color: 'var(--color-accent)' }}
                                        >
                                            {t('messages.findPeople')}
                                        </button>
                                    </div>
                                )}

                                {filteredConversations.length === 0 && conversations.length > 0 && searchQuery && (
                                    <div className="p-4 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                        No conversations matching "{searchQuery}"
                                    </div>
                                )}

                                {filteredConversations.map((convo) => {
                                    const hasUnread = (convo.unreadCount || 0) > 0;
                                    const isSelected = selectedContactId === convo.contactId;
                                    const isOnline = onlineUsers.has(convo.contactId);

                                    return (
                                        <div
                                            key={convo.contactId}
                                            onClick={() => handleSelectContact(convo.contactId)}
                                            className="p-4 cursor-pointer transition-colors relative"
                                            style={{
                                                backgroundColor: isSelected
                                                    ? 'var(--color-accent-soft)'
                                                    : hasUnread ? 'rgba(79, 70, 229, 0.03)' : 'transparent',
                                                borderBottom: '1px solid var(--color-surface-border)',
                                            }}
                                        >
                                            {(isSelected || hasUnread) && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: 'var(--color-accent)' }}></div>
                                            )}

                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="relative">
                                                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                                                             style={hasUnread
                                                                 ? { backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }
                                                                 : { backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }
                                                             }>
                                                            {convo.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        {/* Real online status */}
                                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 rounded-full"
                                                             style={{
                                                                 backgroundColor: isOnline ? '#10B981' : '#9CA3AF',
                                                                 borderColor: 'var(--color-surface)'
                                                             }}></div>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm" style={{ color: 'var(--color-text-primary)', fontWeight: hasUnread ? 700 : 500 }}>
                                                            {convo.name}
                                                        </h4>
                                                        {typingUsers.has(convo.contactId) ? (
                                                            <p className="text-[10px] italic" style={{ color: 'var(--color-accent)' }}>
                                                                {t('messages.typing') || 'typing...'}
                                                            </p>
                                                        ) : !hasUnread && (
                                                            <p className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wide w-fit"
                                                               style={{ backgroundColor: 'var(--color-bg-tertiary)', color: isOnline ? '#059669' : 'var(--color-text-tertiary)' }}>
                                                                {isOnline ? t('messages.activeStatus') : 'Offline'}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="text-xs" style={{ color: hasUnread ? 'var(--color-accent)' : 'var(--color-text-tertiary)', fontWeight: hasUnread ? 700 : 500 }}>
                                                        {convo.lastMessage ? convo.lastMessage.timestamp : ''}
                                                    </span>
                                                    {hasUnread && (
                                                        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-white text-[10px] font-bold rounded-full"
                                                              style={{ background: 'var(--gradient-accent)' }}>
                                                            {convo.unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-sm line-clamp-1 pl-12"
                                               style={{ color: hasUnread ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontWeight: hasUnread ? 600 : 400 }}>
                                                {convo.lastMessage?.attachment
                                                    ? `📎 ${convo.lastMessage.attachment.originalName}`
                                                    : convo.lastMessage ? convo.lastMessage.content : t('messages.noMessages')
                                                }
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div>
                                {pendingRequests.length === 0 && (
                                    <div className="p-8 text-center flex flex-col items-center">
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                                             style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}>
                                            <UserPlusIcon className="w-6 h-6" />
                                        </div>
                                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('messages.noPendingRequests')}</p>
                                        <button
                                            onClick={() => setShowAddFriendModal(true)}
                                            className="mt-2 text-xs font-bold hover:underline"
                                            style={{ color: 'var(--color-accent)' }}
                                        >
                                            {t('messages.findPeople')}
                                        </button>
                                    </div>
                                )}

                                {pendingRequests.map(req => (
                                    <div key={req._id} className="p-4 transition-colors hover:opacity-90"
                                         style={{ borderBottom: '1px solid var(--color-surface-border)' }}>
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                                                 style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
                                                {(req.sender.firstName || 'U').substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{req.sender.firstName} {req.sender.lastName}</h4>
                                                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{req.sender.email}</p>
                                                <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{t('messages.sentFriendRequest')}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pl-13">
                                            <button
                                                onClick={() => handleRespondToRequest(req._id, 'accept')}
                                                className="btn-gradient flex-1 py-1.5 text-xs font-bold rounded-lg"
                                            >
                                                {t('messages.accept')}
                                            </button>
                                            <button
                                                onClick={() => handleRespondToRequest(req._id, 'reject')}
                                                className="btn-ghost flex-1 py-1.5 text-xs font-bold rounded-lg"
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
                <div className="flex-1 flex flex-col" style={{ backgroundColor: 'var(--color-surface)' }}>
                    {/* Chat Header */}
                    <div className="h-20 px-6 flex justify-between items-center"
                         style={{ borderBottom: '1px solid var(--color-surface-border)', backgroundColor: 'var(--color-surface)' }}>
                        <div className="flex items-center gap-3">
                            {selectedConversation ? (
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>{selectedConversation.name}</h3>
                                        {onlineUsers.has(selectedConversation.contactId) ? (
                                            <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                                                  style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#10B981' }}></span>
                                                {t('messages.available')}
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                                                  style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}>
                                                Offline
                                            </span>
                                        )}
                                    </div>
                                    {isContactTyping && (
                                        <p className="text-xs italic" style={{ color: 'var(--color-accent)' }}>
                                            {t('messages.typing') || 'typing...'}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <h3 className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{t('messages.selectChat')}</h3>
                            )}
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                        {!selectedContactId && (
                            <div className="flex flex-col items-center justify-center h-full gap-3">
                                <div className="w-16 h-16 rounded-full flex items-center justify-center"
                                     style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}>
                                    <MessageSquare className="w-8 h-8" />
                                </div>
                                <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                                    {t('messages.selectConversation') || 'Select a conversation to start messaging'}
                                </p>
                            </div>
                        )}

                        {selectedContactId && activeMessages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full gap-2">
                                <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                                    {t('messages.noMessages')}
                                </p>
                            </div>
                        )}

                        {activeMessages.map((msg, idx) => {
                            const senderId = typeof msg.sender === 'object' && msg.sender !== null
                                ? (msg.sender as any)._id : msg.sender;
                            const isMe = senderId === userId;

                            // Date separator
                            let showDateSeparator = false;
                            if (idx === 0) {
                                showDateSeparator = true;
                            } else {
                                const prevDate = new Date(activeMessages[idx - 1].createdAt).toDateString();
                                const curDate = new Date(msg.createdAt).toDateString();
                                if (prevDate !== curDate) showDateSeparator = true;
                            }

                            const avatarText = isMe ? myInitials : (() => {
                                const convo = conversations.find(c => c.contactId === senderId);
                                return convo ? getInitials(convo.name) : 'OT';
                            })();

                            return (
                                <React.Fragment key={msg._id}>
                                    {showDateSeparator && (
                                        <div className="flex items-center gap-3 my-4">
                                            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-surface-border)' }} />
                                            <span className="text-[11px] font-medium px-3 py-1 rounded-full"
                                                  style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}>
                                                {getDateLabel(msg.createdAt)}
                                            </span>
                                            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-surface-border)' }} />
                                        </div>
                                    )}

                                    <div className={`flex gap-4 max-w-2xl ${isMe ? 'flex-row-reverse ml-auto' : ''}`}>
                                        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                                             style={isMe
                                                 ? { background: 'var(--gradient-accent)', color: '#fff' }
                                                 : { backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }
                                             }>
                                            {avatarText.toUpperCase()}
                                        </div>
                                        <div className={`${isMe ? 'items-end' : ''} flex flex-col`}>
                                            <div className="flex items-baseline gap-2 mb-1">
                                                <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{msg.timestamp}</span>
                                            </div>
                                            <div className="p-4 rounded-2xl shadow-sm text-sm leading-relaxed"
                                                 style={isMe
                                                     ? { background: 'var(--gradient-accent)', color: '#fff', borderTopRightRadius: 0 }
                                                     : { backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-surface-border)', color: 'var(--color-text-primary)', borderTopLeftRadius: 0 }
                                                 }>
                                                {msg.content && <p>{msg.content}</p>}

                                                {/* Attachment render */}
                                                {msg.attachment && msg.attachment.url && (
                                                    <div className="mt-2">
                                                        {isImageMime(msg.attachment.mimeType) ? (
                                                            <img
                                                                src={msg.attachment.url.startsWith('http') ? msg.attachment.url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${msg.attachment.url}`}
                                                                alt={msg.attachment.originalName}
                                                                className="max-w-[240px] rounded-lg cursor-pointer"
                                                                onClick={() => window.open(msg.attachment!.url.startsWith('http') ? msg.attachment!.url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${msg.attachment!.url}`, '_blank')}
                                                            />
                                                        ) : (
                                                            <a
                                                                href={msg.attachment.url.startsWith('http') ? msg.attachment.url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${msg.attachment.url}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-2 p-2 rounded-lg"
                                                                style={{ backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : 'var(--color-bg-tertiary)' }}
                                                            >
                                                                <FileText className="w-5 h-5 flex-shrink-0" />
                                                                <span className="text-xs truncate max-w-[180px]">{msg.attachment.originalName}</span>
                                                                <Download className="w-4 h-4 flex-shrink-0 ml-auto" />
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className={`flex items-center gap-1 mt-1 ${isMe ? 'flex-row-reverse' : ''} px-1`}>
                                                {isMe && (
                                                    <span className="text-[10px]" style={{ color: msg.read ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }}>
                                                        {msg.read ? '✓✓' : '✓'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Pending file preview */}
                    {pendingFile && (
                        <div className="px-4 py-2 flex items-center gap-3" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderTop: '1px solid var(--color-surface-border)' }}>
                            {pendingFile.type.startsWith('image/') ? (
                                <img src={URL.createObjectURL(pendingFile)} alt="preview" className="w-10 h-10 rounded object-cover" />
                            ) : (
                                <FileText className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
                            )}
                            <span className="text-xs truncate flex-1" style={{ color: 'var(--color-text-secondary)' }}>{pendingFile.name}</span>
                            <button onClick={() => { setPendingFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                    className="p-1 rounded-full hover:opacity-70" style={{ color: 'var(--color-text-tertiary)' }}>
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Chat Input */}
                    <div className="p-4" style={{ backgroundColor: 'var(--color-surface)', borderTop: '1px solid var(--color-surface-border)' }}>
                        <form onSubmit={handleSendMessage} className="flex items-center gap-3 rounded-xl p-2 shadow-sm transition-all border focus-within:ring-2"
                              style={{
                                  backgroundColor: 'var(--color-surface)',
                                  borderColor: 'var(--color-surface-border)',
                                  '--tw-ring-color': 'var(--color-accent-glow)',
                              } as React.CSSProperties}>
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                onChange={handleFileSelected}
                                accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                            />
                            <button type="button" onClick={handleAttachmentClick} className="p-2 rounded-lg transition-colors hover:opacity-70" style={{ color: 'var(--color-text-tertiary)' }}>
                                <PaperClipIcon className="w-5 h-5" />
                            </button>
                            <TransliterateInput
                                value={inputMessage}
                                onChangeText={(val: string) => { setInputMessage(val); emitTyping(); }}
                                placeholder={t('messages.typePlaceholder')}
                                className="flex-1 bg-transparent border-none focus:ring-0 text-sm placeholder-opacity-60 focus:outline-none"
                                style={{ color: 'var(--color-text-primary)' }}
                            />
                            <button type="submit" className="p-2 rounded-lg shadow-sm transition-colors text-white"
                                    style={{ background: 'var(--gradient-accent)' }}>
                                <SendIcon className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                </div>

                {/* Add Friend Modal */}
                {showAddFriendModal && (
                    <div className="absolute inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                         style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                        <div className="card-surface w-full max-w-sm p-6 transform transition-all animate-in fade-in zoom-in-95 duration-200 shadow-xl">
                            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>{t('messages.findPeople')}</h3>
                            <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>{t('messages.searchByEmail')}</p>

                            <form onSubmit={handleSearchUser}>
                                <div className="mb-4 relative">
                                    <label className="block text-xs font-bold uppercase mb-1" style={{ color: 'var(--color-text-tertiary)' }}>{t('messages.emailAddress')}</label>
                                    <input
                                        type="email"
                                        required
                                        value={searchEmail}
                                        onChange={(e) => setSearchEmail(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg outline-none transition-all text-sm border focus:ring-2"
                                        style={{
                                            backgroundColor: 'var(--color-bg-tertiary)',
                                            borderColor: 'var(--color-surface-border)',
                                            color: 'var(--color-text-primary)',
                                            '--tw-ring-color': 'var(--color-accent-glow)',
                                        } as React.CSSProperties}
                                        placeholder="user@example.com"
                                        autoFocus
                                    />
                                    <button
                                        type="submit"
                                        disabled={isSearching || !searchEmail}
                                        className="absolute right-2 top-0 bottom-0 my-auto h-fit mt-7 p-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Search"
                                        style={{ color: 'var(--color-accent)' }}
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
                                <div className="mb-4 p-3 text-sm rounded-lg border animate-in fade-in slide-in-from-top-1"
                                     style={searchError.includes('sent')
                                         ? { backgroundColor: 'rgba(16, 185, 129, 0.08)', color: '#059669', borderColor: 'rgba(16, 185, 129, 0.2)' }
                                         : { backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#DC2626', borderColor: 'rgba(239, 68, 68, 0.2)' }
                                     }>
                                    {searchError}
                                </div>
                            )}

                            {foundUser && (
                                <div className="mt-4 p-3 rounded-xl border flex items-center justify-between mb-4 animate-in slide-in-from-top-2 duration-300"
                                     style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-surface-border)' }}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                                             style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
                                            {foundUser.avatar}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{foundUser.name}</h4>
                                            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{foundUser.email}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleAddFoundUser}
                                        className="btn-gradient rounded-lg text-xs font-bold px-3 py-2"
                                        title="Send Request"
                                    >
                                        {t('messages.sendRequest')}
                                    </button>
                                </div>
                            )}

                            <div className="flex justify-end pt-2" style={{ borderTop: '1px solid var(--color-surface-border)' }}>
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-sm font-medium transition-colors hover:opacity-80"
                                    style={{ color: 'var(--color-text-secondary)' }}
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
