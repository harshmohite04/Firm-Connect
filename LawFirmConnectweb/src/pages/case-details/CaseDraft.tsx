import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useOutletContext, useNavigate } from 'react-router-dom';
import caseService from '../../services/caseService';

import TransliterateInput from '../../components/TransliterateInput';
import LineNumberedEditor from '../../components/LineNumberedEditor';

// Icons
const SparklesIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);

const SaveIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
);

const SendIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
);

const PlusIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);

const FileTextIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const ClockIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const HistoryIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0zM3.05 11a9 9 0 010-2M5.64 5.64l1.42 1.42M3.05 13a9 9 0 002.59 4.36" />
    </svg>
);

const RestoreIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const XIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const BookmarkIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
);



interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface Template {
    id: string;
    name: string;
    description: string;
    category: string;
}

interface DraftSession {
    session_id: string;
    title: string;
    template: string;
    created_at: string;
}

interface DraftVersion {
    version_number: number;
    label: string | null;
    type: 'auto' | 'manual';
    created_at: string;
}

const CaseDraft: React.FC = () => {
    // @ts-ignore
    const { caseData } = useOutletContext<{ caseData: any }>();
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [templates, setTemplates] = useState<Template[]>([]);
    const [draftSessions, setDraftSessions] = useState<DraftSession[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [documentTitle, setDocumentTitle] = useState<string>('');
    const [sessionId, setSessionId] = useState<string | null>(null);
    
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [documentContent, setDocumentContent] = useState('');
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [filename, setFilename] = useState('');
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showAddDocumentModal, setShowAddDocumentModal] = useState(false);
    const [isCustomDocument, setIsCustomDocument] = useState(false);
    const [customDocumentName, setCustomDocumentName] = useState('');
    const [templateSearch, setTemplateSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('All');

    // Version history state
    const [showVersionHistory, setShowVersionHistory] = useState(false);
    const [versions, setVersions] = useState<DraftVersion[]>([]);
    const [isLoadingVersions, setIsLoadingVersions] = useState(false);
    const [showSaveVersionModal, setShowSaveVersionModal] = useState(false);
    const [versionLabel, setVersionLabel] = useState('');
    const [isRestoringVersion, setIsRestoringVersion] = useState<number | null>(null);


    const messagesEndRef = useRef<HTMLDivElement>(null);

    const categories = useMemo(() => ['All', ...Array.from(new Set(templates.map(t => t.category)))], [templates]);
    const filteredTemplates = useMemo(() => {
        return templates.filter(t => t.id !== 'blank')
            .filter(t => activeCategory === 'All' || t.category === activeCategory)
            .filter(t => !templateSearch ||
                t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
                t.description.toLowerCase().includes(templateSearch.toLowerCase()));
    }, [templates, activeCategory, templateSearch]);

    // Load templates and draft sessions on mount
    useEffect(() => {
        loadTemplates();
        loadDraftSessions();
    }, [caseData._id]);

    // ESC key to close modals
    useEffect(() => {
        if (!showAddDocumentModal && !showSaveModal) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (showSaveModal) setShowSaveModal(false);
                if (showAddDocumentModal) {
                    setShowAddDocumentModal(false);
                    setIsCustomDocument(false);
                    setCustomDocumentName('');
                    setSelectedTemplate('');
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showAddDocumentModal, showSaveModal]);

    // Auto-scroll messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadTemplates = async () => {
        try {
            const data = await caseService.getTemplates();
            setTemplates(data);
        } catch (error) {
            console.error('Failed to load templates', error);
        }
    };

    const loadDraftSessions = async () => {
        try {
            const sessions = await caseService.getDraftSessions(caseData._id);
            setDraftSessions(sessions);
        } catch (error) {
            console.error('Failed to load draft sessions', error);
        }
    };

    const handleCreateDocument = async () => {
        let templateId = selectedTemplate;
        let title = documentTitle;

        if (isCustomDocument) {
            if (!customDocumentName.trim()) {
                toast.error('Please enter a document name');
                return;
            }
            templateId = 'blank';
            title = customDocumentName;
        } else {
            if (!selectedTemplate) {
                toast.error('Please select a document type');
                return;
            }
            const template = templates.find(t => t.id === selectedTemplate);
            title = template?.name || 'New Document';
        }

        setShowAddDocumentModal(false);
        setDocumentTitle(title);
        
        // Create a new draft session
        try {
            const session = await caseService.createDraftSession(
                caseData._id,
                templateId,
                title
            );
            setSessionId(session.session_id);
            setSelectedTemplate(templateId);

            if (!isCustomDocument) {
                // Auto-generate: immediately send a generation request
                const tmpl = templates.find(t => t.id === templateId);
                const autoMessage = `Generate a complete ${tmpl?.name} using the case documents and context.`;

                setMessages([{
                    role: 'assistant',
                    content: `Generating your ${tmpl?.name}...`
                }]);
                setIsGenerating(true);

                try {
                    const response = await caseService.sendDraftMessage(
                        caseData._id,
                        session.session_id,
                        autoMessage,
                        '',
                        templateId
                    );
                    setMessages([
                        { role: 'assistant', content: response.ai_message }
                    ]);
                    setDocumentContent(response.document_content);
                } catch (error) {
                    setMessages([{
                        role: 'assistant',
                        content: 'Failed to auto-generate. Please describe what you need.'
                    }]);
                } finally {
                    setIsGenerating(false);
                }
            } else {
                // Custom document: keep the conversational approach
                setMessages([{
                    role: 'assistant',
                    content: `I'll help you create "${title}". I have access to all the documents you've uploaded for this case. Tell me what you'd like to include.`
                }]);
            }

            // Reset modal state
            setIsCustomDocument(false);
            setCustomDocumentName('');
            setSelectedTemplate('');
            setTemplateSearch('');
            setActiveCategory('All');
            
            // Reload sessions
            loadDraftSessions();
        } catch (error) {
            console.error('Failed to create draft session', error);
            toast.error('Failed to start draft session');
        }
    };

    const handleResumeSession = async (session: DraftSession) => {
        try {
            // Load full session data from backend
            const sessionData = await caseService.getDraftSession(session.session_id);
            
            setSessionId(sessionData.session_id);
            setDocumentTitle(sessionData.title);
            setSelectedTemplate(sessionData.template);
            
            // Restore messages and document content
            setMessages(sessionData.messages || []);
            setDocumentContent(sessionData.current_document || '');
            
            // Add a system message if this is first resume
            if (sessionData.messages && sessionData.messages.length > 0) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `Welcome back! I've loaded your "${sessionData.title}". How can I help you refine it?`
                }]);
            }
        } catch (error) {
            console.error('Failed to load session', error);
            toast.error('Failed to load draft session');
        }
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !sessionId) return;

        const userMessage: Message = {
            role: 'user',
            content: inputMessage
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsGenerating(true);

        try {
            const response = await caseService.sendDraftMessage(
                caseData._id,
                sessionId,
                inputMessage,
                documentContent,
                selectedTemplate
            );

            // Add AI response to messages
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: response.ai_message
            }]);

            // Update document
            setDocumentContent(response.document_content);

            // Refresh versions if panel is open
            if (showVersionHistory) loadVersions();

        } catch (error) {
            console.error('Generation failed', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.'
            }]);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleSave = async () => {
        if (!filename.trim()) {
            toast.error('Please enter a filename');
            return;
        }
        setIsSaving(true);
        try {
            await caseService.saveGeneratedDocument(caseData._id, filename, documentContent);
            setShowSaveModal(false);
            toast.success('Document saved! AI processing will complete shortly in the background.');
            navigate('../documents');
        } catch (error) {
            console.error('Save failed', error);
            toast.error('Failed to save document.');
        } finally {
            setIsSaving(false);
        }
    };

    const loadVersions = async () => {
        if (!sessionId) return;
        setIsLoadingVersions(true);
        try {
            const data = await caseService.getDraftVersions(sessionId);
            setVersions(data);
        } catch (error) {
            console.error('Failed to load versions', error);
            toast.error('Failed to load version history');
        } finally {
            setIsLoadingVersions(false);
        }
    };

    const handleOpenVersionHistory = () => {
        setShowVersionHistory(true);
        loadVersions();
    };

    const handleSaveVersion = async () => {
        if (!versionLabel.trim() || !sessionId) return;
        try {
            await caseService.createDraftVersion(sessionId, versionLabel, documentContent);
            toast.success('Version saved!');
            setShowSaveVersionModal(false);
            setVersionLabel('');
            loadVersions();
        } catch (error) {
            console.error('Failed to save version', error);
            toast.error('Failed to save version');
        }
    };

    const handleRestoreVersion = async (versionNumber: number) => {
        if (!sessionId) return;
        setIsRestoringVersion(versionNumber);
        try {
            const result = await caseService.restoreDraftVersion(sessionId, versionNumber);
            setDocumentContent(result.document_content);
            toast.success(`Restored to version ${versionNumber}`);
            loadVersions();
        } catch (error) {
            console.error('Failed to restore version', error);
            toast.error('Failed to restore version');
        } finally {
            setIsRestoringVersion(null);
        }
    };

    const formatVersionTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const quickActions = [
        'Make it more formal',
        'Add legal citations',
        'Simplify language',
        'Add contact details section'
    ];

    const handleQuickAction = (action: string) => {
        setInputMessage(action);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Empty State - No document created yet
    if (!sessionId) {
        return (
            <div className="flex-1 bg-slate-50 p-6 overflow-y-auto">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">{t('portal.drafting.title')}</h2>
                            <p className="text-slate-600 mt-1">{t('portal.drafting.subtitle')}</p>
                        </div>
                        <button
                            onClick={() => setShowAddDocumentModal(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all"
                        >
                            <PlusIcon />
                            {t('portal.drafting.addDocument')}
                        </button>
                    </div>

                    {/* Draft Sessions List */}
                    {draftSessions.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {draftSessions.map(session => (
                                <button
                                    key={session.session_id}
                                    onClick={() => handleResumeSession(session)}
                                    className="bg-white p-5 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all text-left group"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                            <FileTextIcon />
                                        </div>
                                        <div className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-slate-900 mb-2">{session.title}</h3>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <ClockIcon />
                                        <span>{formatDate(session.created_at)}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full border-2 border-slate-200 shadow-sm mb-6">
                                <FileTextIcon />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">{t('portal.drafting.noDrafts')}</h3>
                            <p className="text-slate-600 mb-6">{t('portal.drafting.startCreating')}</p>
                        </div>
                    )}

                    {/* Info Card */}
                    <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-5">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="font-bold text-blue-900 mb-1">{t('portal.drafting.aiTitle')}</h4>
                                <p className="text-sm text-blue-800">
                                    {t('portal.drafting.aiDesc')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Add Document Modal */}
                {showAddDocumentModal && (
                    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => { setShowAddDocumentModal(false); setIsCustomDocument(false); setCustomDocumentName(''); setSelectedTemplate(''); setTemplateSearch(''); setActiveCategory('All'); }}>
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 border-b border-slate-200">
                                <h3 className="text-2xl font-bold text-slate-900">{t('portal.drafting.modalTitle')}</h3>
                                <p className="text-sm text-slate-600 mt-1">{t('portal.drafting.modalSubtitle')}</p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {/* Custom Document Option */}
                                <div className="mb-6 p-4 border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg">
                                    <div className="flex items-center gap-3 mb-3">
                                        <input
                                            type="checkbox"
                                            id="customDoc"
                                            checked={isCustomDocument}
                                            onChange={(e) => {
                                                setIsCustomDocument(e.target.checked);
                                                if (e.target.checked) setSelectedTemplate('');
                                            }}
                                            className="w-4 h-4 text-blue-600"
                                        />
                                        <label htmlFor="customDoc" className="font-bold text-slate-900 cursor-pointer">
                                            {t('portal.drafting.customDoc')}
                                        </label>
                                    </div>
                                    {isCustomDocument && (
                                        <input
                                            value={customDocumentName}
                                            onChange={(e) => setCustomDocumentName(e.target.value)}
                                            placeholder={t('portal.drafting.docNamePlaceholder')}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    )}
                                </div>

                                {/* Search and Category Filters */}
                                {!isCustomDocument && (
                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            value={templateSearch}
                                            onChange={(e) => setTemplateSearch(e.target.value)}
                                            placeholder="Search templates..."
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                                        />
                                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                                            {categories.map(cat => (
                                                <button
                                                    key={cat}
                                                    onClick={() => setActiveCategory(cat)}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                                                        activeCategory === cat
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Template Grid */}
                                <div className="mb-4">
                                    <h4 className="font-bold text-slate-700 mb-3">{t('portal.drafting.chooseTemplate')}</h4>
                                    {activeCategory === 'All' && !templateSearch ? (
                                        // Grouped by category
                                        <>
                                            {categories.filter(c => c !== 'All').map(cat => {
                                                const catTemplates = templates.filter(t => t.id !== 'blank' && t.category === cat);
                                                if (catTemplates.length === 0) return null;
                                                return (
                                                    <div key={cat} className="mb-5">
                                                        <h5 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">{cat}</h5>
                                                        <div className="grid grid-cols-3 gap-3">
                                                            {catTemplates.map(template => (
                                                                <button
                                                                    key={template.id}
                                                                    onClick={() => {
                                                                        setSelectedTemplate(template.id);
                                                                        setIsCustomDocument(false);
                                                                    }}
                                                                    className={`p-3 border-2 rounded-lg text-left transition-all ${
                                                                        selectedTemplate === template.id
                                                                            ? 'border-blue-500 bg-blue-50'
                                                                            : 'border-slate-200 hover:border-blue-300 bg-white'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-start justify-between mb-1">
                                                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded">
                                                                            {template.category}
                                                                        </span>
                                                                        {selectedTemplate === template.id && (
                                                                            <div className="text-blue-500">
                                                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                                </svg>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <h4 className="font-bold text-slate-900 text-sm mb-1">{template.name}</h4>
                                                                    <p className="text-xs text-slate-600 line-clamp-2">{template.description}</p>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </>
                                    ) : (
                                        // Flat filtered grid
                                        <div className="grid grid-cols-3 gap-3">
                                            {filteredTemplates.map(template => (
                                                <button
                                                    key={template.id}
                                                    onClick={() => {
                                                        setSelectedTemplate(template.id);
                                                        setIsCustomDocument(false);
                                                    }}
                                                    className={`p-3 border-2 rounded-lg text-left transition-all ${
                                                        selectedTemplate === template.id
                                                            ? 'border-blue-500 bg-blue-50'
                                                            : 'border-slate-200 hover:border-blue-300 bg-white'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between mb-1">
                                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded">
                                                            {template.category}
                                                        </span>
                                                        {selectedTemplate === template.id && (
                                                            <div className="text-blue-500">
                                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                </svg>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <h4 className="font-bold text-slate-900 text-sm mb-1">{template.name}</h4>
                                                    <p className="text-xs text-slate-600 line-clamp-2">{template.description}</p>
                                                </button>
                                            ))}
                                            {filteredTemplates.length === 0 && (
                                                <div className="col-span-3 text-center py-8 text-slate-400">
                                                    No templates match your search.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowAddDocumentModal(false);
                                        setIsCustomDocument(false);
                                        setCustomDocumentName('');
                                        setSelectedTemplate('');
                                        setTemplateSearch('');
                                        setActiveCategory('All');
                                    }}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                                >
                                    {t('portal.common.cancel')}
                                </button>
                                <button
                                    onClick={handleCreateDocument}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
                                >
                                    {t('portal.drafting.create')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Conversational Editor Interface
    return (
        <div className="flex-1 bg-slate-50 p-6 flex flex-col gap-4 h-full min-h-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            setSessionId(null);
                            setMessages([]);
                            setDocumentContent('');
                            setDocumentTitle('');
                            loadDraftSessions();
                        }}
                        className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        {t('portal.drafting.back')}
                    </button>
                    <span className="text-slate-300">|</span>
                    <span className="text-sm font-medium text-slate-700">{documentTitle}</span>
                </div>
                <div className="flex items-center gap-2">
                    {documentContent && (
                        <>
                            <button
                                onClick={() => setShowSaveVersionModal(true)}
                                className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm flex items-center gap-2"
                            >
                                <BookmarkIcon /> Save Version
                            </button>
                            <button
                                onClick={handleOpenVersionHistory}
                                className="px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm flex items-center gap-2"
                            >
                                <HistoryIcon /> History
                            </button>
                        </>
                    )}
                    {documentContent && (
                        <button
                            onClick={() => setShowSaveModal(true)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm flex items-center gap-2"
                        >
                            <SaveIcon /> {t('portal.drafting.save')}
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
                {/* Left Panel: Chat */}
                <div className="w-2/5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-0">
                    <div className="p-4 border-b border-slate-200">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                                <SparklesIcon />
                            </div>
                            {t('portal.chat.title')}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">{t('portal.drafting.aiDesc')}</p>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                                        msg.role === 'user'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-100 text-slate-800'
                                    }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            </div>
                        ))}
                        {isGenerating && (
                            <div className="flex justify-start">
                                <div className="bg-slate-100 rounded-lg px-4 py-2">
                                    <div className="flex items-center gap-2">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        </div>
                                        <span className="text-xs text-slate-500">Generating...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Actions */}
                    <div className="px-4 py-2 border-t border-slate-200">
                        <div className="flex flex-wrap gap-2">
                            {quickActions.map((action, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleQuickAction(action)}
                                    className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors"
                                >
                                    {action}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-slate-200">
                        <div className="flex gap-2">
                            <TransliterateInput
                                value={inputMessage}
                                onChangeText={setInputMessage}
                                onKeyDown={handleKeyPress}
                                placeholder={t('portal.chat.placeholder')}
                                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isGenerating}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={isGenerating || !inputMessage.trim()}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <SendIcon />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Document Editor */}
                <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-0 relative">
                    <div className="p-4 border-b border-slate-200">
                        <h3 className="font-bold text-slate-800">{t('portal.drafting.liveDoc')}</h3>
                        <p className="text-xs text-slate-500 mt-1">{t('portal.drafting.liveDocDesc')}</p>
                    </div>

                    {documentContent ? (
                        <LineNumberedEditor
                            value={documentContent}
                            onChangeText={setDocumentContent}
                            className="flex-1 w-full p-6 bg-white resize-none focus:outline-none font-serif text-base leading-relaxed text-slate-800"
                            placeholder={t('portal.drafting.docContentPlaceholder')}
                        />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm text-slate-300">
                                <SparklesIcon />
                            </div>
                            <p className="text-sm">{t('portal.drafting.startChatting')}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Save Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setShowSaveModal(false)}>
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-slate-900 mb-4">Save Document</h3>
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-slate-700 mb-2">{t('portal.drafting.filename')}</label>
                            <input
                                type="text"
                                value={filename}
                                onChange={(e) => setFilename(e.target.value)}
                                placeholder="e.g., NOC_Property_Transfer.txt"
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-slate-500 mt-2">{t('portal.drafting.saveDesc')}</p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowSaveModal(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                            >
                                {t('portal.common.cancel')}
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
                            >
                                {isSaving ? 'Saving...' : t('portal.drafting.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Save Version Modal */}
            {showSaveVersionModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => { setShowSaveVersionModal(false); setVersionLabel(''); }}>
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-slate-900 mb-4">Save Version</h3>
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Version Label</label>
                            <input
                                type="text"
                                value={versionLabel}
                                onChange={(e) => setVersionLabel(e.target.value)}
                                placeholder="e.g., Final draft, After client review..."
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveVersion(); }}
                                autoFocus
                            />
                            <p className="text-xs text-slate-500 mt-2">Give this version a meaningful name so you can find it later.</p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setShowSaveVersionModal(false); setVersionLabel(''); }}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveVersion}
                                disabled={!versionLabel.trim()}
                                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
                            >
                                Save Version
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Version History Side Panel */}
            {showVersionHistory && (
                <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowVersionHistory(false)}>
                    <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" />
                    <div
                        className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Panel Header */}
                        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <HistoryIcon /> Version History
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    {versions.length} version{versions.length !== 1 ? 's' : ''} saved
                                </p>
                            </div>
                            <button
                                onClick={() => setShowVersionHistory(false)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                            >
                                <XIcon />
                            </button>
                        </div>

                        {/* Version List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {isLoadingVersions ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    </div>
                                </div>
                            ) : versions.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <HistoryIcon />
                                    <p className="mt-3 text-sm">No versions yet. Versions are created automatically when AI edits the document.</p>
                                </div>
                            ) : (
                                versions.map((version) => (
                                    <div
                                        key={version.version_number}
                                        className="bg-slate-50 rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-700">
                                                    v{version.version_number}
                                                </span>
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                                    version.type === 'manual'
                                                        ? 'bg-violet-100 text-violet-700'
                                                        : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {version.type === 'manual' ? 'Manual' : 'Auto'}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleRestoreVersion(version.version_number)}
                                                disabled={isRestoringVersion !== null}
                                                className="px-3 py-1 text-xs bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                                            >
                                                {isRestoringVersion === version.version_number ? (
                                                    'Restoring...'
                                                ) : (
                                                    <><RestoreIcon /> Restore</>
                                                )}
                                            </button>
                                        </div>
                                        {version.label && (
                                            <p className="text-sm text-slate-800 font-medium mb-1">{version.label}</p>
                                        )}
                                        <p className="text-xs text-slate-500">
                                            {formatVersionTime(version.created_at)}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CaseDraft;
