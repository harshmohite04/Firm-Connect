import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import PortalLayout from '../components/PortalLayout';
import {
    Search as SearchIcon,
    Send as SendIcon,
    UserPlus as UserPlusIcon,
    Paperclip as PaperClipIcon
} from 'lucide-react';
import { contactService } from '../services/contactService';
import { messageService } from '../services/messageService';
import { io, Socket } from 'socket.io-client';
import TransliterateInput from '../components/TransliterateInput';

interface Message {
    _id: string; 
    content: string;
    sender: string; 
    timestamp: string;
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

const PortalMessages: React.FC = () => {
    const { t } = useTranslation();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'chats' | 'requests'>('chats');
    const [activeMessages, setActiveMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [userId, setUserId] = useState<string>(''); 
    
    // Search & Add Friend State
    const [showAddFriendModal, setShowAddFriendModal] = useState(false);
    const [searchEmail, setSearchEmail] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [foundUser, setFoundUser] = useState<PortalUser | null>(null);
    const [searchError, setSearchError] = useState('');
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                setUserId(user._id || user.id);
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

        return () => {
            socketRef.current?.disconnect();
        };
    }, [userId]);

    const selectedContactIdRef = useRef<string | null>(null);
    useEffect(() => {
        selectedContactIdRef.current = selectedContactId;
    }, [selectedContactId]);

    // Listen for new messages
    useEffect(() => {
        if (!socketRef.current) return;

        const listener = (message: any) => {
            console.log('socket: newMessage received:', message);
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
                        timestamp: new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                        read: message.read
                    };
                    return [...prev, formattedMsg];
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
                timestamp: new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                senderId: msgSender
            };

            if (existingIndex >= 0) {
                const newConvos = [...prev];
                newConvos[existingIndex] = {
                    ...newConvos[existingIndex],
                    lastMessage: newLastMsg
                };
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
            console.log('fetched conversations:', conversationsData);
            
            const mappedConversations: Conversation[] = conversationsData.map((convo: any) => ({
                contactId: convo.contactId,
                name: convo.name,
                avatar: undefined,
                lastMessage: convo.lastMessage ? {
                    content: convo.lastMessage.content,
                    timestamp: new Date(convo.lastMessage.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
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
        console.log('selecting contact:', contactId);
        setSelectedContactId(contactId);
        setActiveMessages([]); 
        
        setConversations(prev => prev.map(convo => 
            convo.contactId === contactId 
                ? { ...convo, unreadCount: 0 } 
                : convo
        ));
        
        try {
            await messageService.markAsRead(contactId);
            const msgs = await messageService.getMessages(contactId);
            console.log('fetched messages:', msgs);
            const formatted: Message[] = msgs.map((m: any) => ({
                _id: m._id,
                content: m.content,
                sender: m.sender,
                timestamp: new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
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

        try {
            const sentMsg = await messageService.sendMessage(selectedContactId, inputMessage);
            console.log('message sent response:', sentMsg);
            
            const formattedMsg: Message = {
                _id: sentMsg._id,
                content: sentMsg.content,
                sender: sentMsg.sender._id || sentMsg.sender || userId,
                timestamp: new Date(sentMsg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
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

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeMessages]);

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
                 setSearchError('User not found');
            }
        } catch (err) {
            console.error(err);
            setSearchError('Error searching for user');
        } finally {
            setIsSearching(false);
        }
    }, []);

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
        if (searchEmail.trim()) {
            performSearch(searchEmail);
        }
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
    }

    // Keyboard: ESC to close Add Friend modal
    useEffect(() => {
        if (!showAddFriendModal) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeModal();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showAddFriendModal]);

    const selectedConversation = conversations.find(c => c.contactId === selectedContactId);

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

                        {activeTab === 'chats' && (
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <SearchIcon className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
                                </div>
                                <input 
                                    type="text" 
                                    placeholder={t('messages.searchChats')}
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
                                    <div className="p-4 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t('messages.noChats')}</div>
                                )}

                                {conversations.map((convo) => {
                                    const hasUnread = (convo.unreadCount || 0) > 0;
                                    const isSelected = selectedContactId === convo.contactId;
                                    
                                    return (
                                        <div 
                                            key={convo.contactId}
                                            onClick={() => handleSelectContact(convo.contactId)}
                                            className="p-4 cursor-pointer transition-colors relative"
                                            style={{
                                                backgroundColor: isSelected
                                                    ? 'var(--color-accent-soft)'
                                                    : hasUnread
                                                        ? 'rgba(79, 70, 229, 0.03)'
                                                        : 'transparent',
                                                borderBottom: '1px solid var(--color-surface-border)',
                                            }}
                                        >
                                            {/* Left accent border for selected or unread */}
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
                                                            {convo.name.substring(0,2).toUpperCase()}
                                                        </div>
                                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 rounded-full"
                                                             style={{ backgroundColor: '#10B981', borderColor: 'var(--color-surface)' }}></div>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm" style={{ color: 'var(--color-text-primary)', fontWeight: hasUnread ? 700 : 500 }}>
                                                            {convo.name}
                                                        </h4>
                                                        {!hasUnread && (
                                                            <p className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wide w-fit"
                                                               style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}>
                                                                {t('messages.activeStatus')}
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
                                                {convo.lastMessage ? convo.lastMessage.content : t('messages.noMessages')}
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
                                                {(req.sender.firstName || 'U').substring(0,2).toUpperCase()}
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
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>{selectedConversation.name}</h3>
                                        <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                                              style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#10B981' }}></span>
                                            {t('messages.available')}
                                        </span>
                                    </div>
                                    <div className="flex gap-6 text-sm">
                                        <button className="font-bold pb-2 px-1" style={{ color: 'var(--color-text-primary)', borderBottom: '2px solid var(--color-accent)' }}>{t('messages.chat')}</button>
                                        <button className="font-medium pb-2 px-1 transition-colors hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }}>{t('messages.shared')}</button>
                                    </div>
                                </div>
                            ) : (
                                <h3 className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{t('messages.selectChat')}</h3>
                            )}
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                        {activeMessages.map((msg) => {
                            const senderId = typeof msg.sender === 'object' && msg.sender !== null 
                                ? (msg.sender as any)._id 
                                : msg.sender;
                            
                            const isMe = senderId === userId;

                            const getInitials = (name: string) => {
                                if (!name) return '??';
                                const parts = name.split(' ');
                                if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
                                return name.substring(0, 2).toUpperCase();
                            };
                            
                            let avatarText = '??';
                            if (isMe) {
                                try {
                                    const userStr = localStorage.getItem('user');
                                    if (userStr) {
                                        const user = JSON.parse(userStr);
                                        const fname = user.firstName || '';
                                        const lname = user.lastName || '';
                                        avatarText = (fname[0] || '') + (lname[0] || '');
                                        if (!avatarText) avatarText = 'ME';
                                    } else {
                                        avatarText = 'ME';
                                    }
                                } catch (e) {
                                    avatarText = 'ME'; 
                                }
                            } else {
                                const convo = conversations.find(c => c.contactId === senderId);
                                avatarText = convo ? getInitials(convo.name) : 'OT';
                            }
                            
                            return (
                                <div key={msg._id} className={`flex gap-4 max-w-2xl ${isMe ? 'flex-row-reverse ml-auto' : ''}`}>
                                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                                         style={isMe
                                             ? { background: 'var(--gradient-accent)', color: '#fff' }
                                             : { backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }
                                         }>
                                        {avatarText.toUpperCase()}
                                    </div>
                                    <div className={`${isMe ? 'items-end' : ''} flex flex-col`}>
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                                                {msg.timestamp}
                                            </span>
                                        </div>
                                        <div className="p-4 rounded-2xl shadow-sm text-sm leading-relaxed"
                                             style={isMe
                                                 ? { background: 'var(--gradient-accent)', color: '#fff', borderTopRightRadius: 0 }
                                                 : { backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-surface-border)', color: 'var(--color-text-primary)', borderTopLeftRadius: 0 }
                                             }>
                                            <p>{msg.content}</p>
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
                            )
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="p-4" style={{ backgroundColor: 'var(--color-surface)', borderTop: '1px solid var(--color-surface-border)' }}>
                        <form onSubmit={handleSendMessage} className="flex items-center gap-3 rounded-xl p-2 shadow-sm transition-all border focus-within:ring-2"
                              style={{
                                  backgroundColor: 'var(--color-surface)',
                                  borderColor: 'var(--color-surface-border)',
                                  '--tw-ring-color': 'var(--color-accent-glow)',
                              } as React.CSSProperties}>
                            <button type="button" className="p-2 rounded-lg transition-colors hover:opacity-70" style={{ color: 'var(--color-text-tertiary)' }}>
                                <PaperClipIcon className="w-5 h-5" />
                            </button>
                            <TransliterateInput
                                value={inputMessage}
                                onChangeText={setInputMessage}
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
