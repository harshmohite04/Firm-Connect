import React, { useEffect, useState } from 'react';
import { Mail, ChevronDown, ChevronUp } from 'lucide-react';
import adminService from '../services/adminService';
import toast from 'react-hot-toast';

const AdminContacts: React.FC = () => {
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [notes, setNotes] = useState<{ [key: string]: string }>({});

    const fetchSubmissions = async () => {
        setLoading(true);
        try {
            const params: any = { page, limit: 20 };
            if (statusFilter) params.status = statusFilter;
            const data = await adminService.getContactSubmissions(params);
            setSubmissions(data.submissions);
            setTotalPages(data.pages);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    useEffect(() => { fetchSubmissions(); }, [page, statusFilter]);

    const handleStatusChange = async (id: string, status: string) => {
        try { await adminService.updateContactSubmission(id, { status }); toast.success('Status updated'); fetchSubmissions(); }
        catch { toast.error('Failed to update status'); }
    };

    const handleNoteSave = async (id: string) => {
        try { await adminService.updateContactSubmission(id, { notes: notes[id] || '' }); toast.success('Notes saved'); }
        catch { toast.error('Failed to save notes'); }
    };

    const statusTabs = [
        { label: 'All', value: '' },
        { label: 'New', value: 'New' },
        { label: 'Read', value: 'Read' },
        { label: 'Replied', value: 'Replied' },
    ];

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Contact Inbox</h1>

            <div className="flex gap-2 mb-6">
                {statusTabs.map((tab) => (
                    <button key={tab.value} onClick={() => { setStatusFilter(tab.value); setPage(1); }}
                        className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                            statusFilter === tab.value ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}>{tab.label}</button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="space-y-3">
                    {submissions.map((s) => (
                        <div key={s._id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <button onClick={() => setExpandedId(expandedId === s._id ? null : s._id)}
                                className="w-full text-left p-5 hover:bg-slate-50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 flex-shrink-0">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-slate-900">{s.name}</p>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                    s.status === 'New' ? 'bg-blue-100 text-blue-700' :
                                                    s.status === 'Read' ? 'bg-slate-100 text-slate-600' : 'bg-green-100 text-green-700'
                                                }`}>{s.status}</span>
                                            </div>
                                            <p className="text-xs text-slate-500">{s.email}</p>
                                            <p className="text-sm text-slate-600 mt-1 truncate">{s.subject ? `${s.subject} — ` : ''}{s.message}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                        <span className="text-xs text-slate-400">{new Date(s.createdAt).toLocaleDateString()}</span>
                                        {expandedId === s._id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                    </div>
                                </div>
                            </button>

                            {expandedId === s._id && (
                                <div className="px-5 pb-5 border-t border-slate-100">
                                    <div className="mt-4 space-y-4">
                                        <div>
                                            <p className="text-xs font-medium text-slate-500 mb-1">Full Message</p>
                                            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap">{s.message}</div>
                                        </div>
                                        {s.phone && (
                                            <div>
                                                <p className="text-xs font-medium text-slate-500 mb-1">Phone</p>
                                                <p className="text-sm text-slate-700">{s.phone}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-xs font-medium text-slate-500 mb-1">Internal Notes</p>
                                            <textarea value={notes[s._id] !== undefined ? notes[s._id] : (s.notes || '')}
                                                onChange={(e) => setNotes({ ...notes, [s._id]: e.target.value })}
                                                rows={3} placeholder="Add internal notes..."
                                                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                                            <button onClick={() => handleNoteSave(s._id)}
                                                className="mt-2 px-3 py-1.5 text-xs bg-slate-700 text-white rounded-lg hover:bg-slate-800">Save Notes</button>
                                        </div>
                                        <div className="flex gap-2">
                                            {['New', 'Read', 'Replied'].map((st) => (
                                                <button key={st} onClick={() => handleStatusChange(s._id, st)}
                                                    className={`px-3 py-1.5 text-xs rounded-lg font-medium ${
                                                        s.status === st
                                                            ? st === 'New' ? 'bg-blue-600 text-white' : st === 'Read' ? 'bg-slate-700 text-white' : 'bg-green-600 text-white'
                                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}>{st}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {submissions.length === 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
                            No contact submissions found
                        </div>
                    )}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
                    <div className="flex gap-2">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="px-3 py-1 text-sm rounded border border-slate-200 disabled:opacity-50 hover:bg-slate-50">Prev</button>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                            className="px-3 py-1 text-sm rounded border border-slate-200 disabled:opacity-50 hover:bg-slate-50">Next</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminContacts;
