import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import adminService from '../services/adminService';
import toast from 'react-hot-toast';

const AdminCases: React.FC = () => {
    const [cases, setCases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [matterFilter, setMatterFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [assignModal, setAssignModal] = useState<{ open: boolean; caseId: string }>({ open: false, caseId: '' });
    const [lawyerSearch, setLawyerSearch] = useState('');
    const [lawyers, setLawyers] = useState<any[]>([]);

    const fetchCases = async () => {
        setLoading(true);
        try {
            const params: any = { page, limit: 20 };
            if (search) params.search = search;
            if (statusFilter) params.status = statusFilter;
            if (matterFilter) params.legalMatter = matterFilter;
            const data = await adminService.getCases(params);
            setCases(data.cases);
            setTotalPages(data.pages);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCases(); }, [page, statusFilter, matterFilter]);

    const handleSearchSubmit = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchCases(); };

    const handleStatusChange = async (caseId: string, status: string) => {
        try { await adminService.updateCaseStatus(caseId, status); toast.success('Status updated'); fetchCases(); }
        catch { toast.error('Failed to update status'); }
    };

    const openAssignModal = async (caseId: string) => {
        setAssignModal({ open: true, caseId });
        try {
            const data = await adminService.getUsers({ role: 'ATTORNEY', limit: 50 });
            setLawyers(data.users);
        } catch (err) { console.error(err); }
    };

    const handleAssign = async (lawyerId: string) => {
        try {
            await adminService.assignLawyer(assignModal.caseId, lawyerId);
            toast.success('Lawyer assigned');
            setAssignModal({ open: false, caseId: '' });
            fetchCases();
        } catch { toast.error('Failed to assign lawyer'); }
    };

    const filteredLawyers = lawyers.filter(l =>
        `${l.firstName} ${l.lastName} ${l.email}`.toLowerCase().includes(lawyerSearch.toLowerCase())
    );

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Case Management</h1>

            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-3">
                    <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Search by case title..." value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </form>
                    <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">All Statuses</option>
                        <option value="Open">Open</option><option value="In Progress">In Progress</option>
                        <option value="Closed">Closed</option><option value="Paused">Paused</option>
                    </select>
                    <select value={matterFilter} onChange={(e) => { setMatterFilter(e.target.value); setPage(1); }}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">All Matters</option>
                        <option value="Family Law">Family Law</option><option value="Corporate">Corporate</option>
                        <option value="Real Estate">Real Estate</option><option value="Litigation">Litigation</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left px-4 py-3 font-medium text-slate-600">Title</th>
                                    <th className="text-left px-4 py-3 font-medium text-slate-600">Client</th>
                                    <th className="text-left px-4 py-3 font-medium text-slate-600">Legal Matter</th>
                                    <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                                    <th className="text-left px-4 py-3 font-medium text-slate-600">Lead Attorney</th>
                                    <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                                    <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {cases.map((c) => (
                                    <tr key={c._id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium text-slate-900">{c.title}</td>
                                        <td className="px-4 py-3 text-slate-500">{c.clientId?.firstName} {c.clientId?.lastName}</td>
                                        <td className="px-4 py-3 text-slate-500">{c.legalMatter}</td>
                                        <td className="px-4 py-3">
                                            <select value={c.status} onChange={(e) => handleStatusChange(c._id, e.target.value)}
                                                className="text-xs px-2 py-1 rounded border border-slate-200 bg-slate-50 focus:outline-none">
                                                <option value="Open">Open</option><option value="In Progress">In Progress</option>
                                                <option value="Closed">Closed</option><option value="Paused">Paused</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">
                                            {c.leadAttorneyId ? `${c.leadAttorneyId.firstName} ${c.leadAttorneyId.lastName}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => openAssignModal(c._id)}
                                                className="text-blue-600 hover:text-blue-800 text-xs font-medium">Assign Lawyer</button>
                                        </td>
                                    </tr>
                                ))}
                                {cases.length === 0 && (
                                    <tr><td colSpan={7} className="text-center py-8 text-slate-400">No cases found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
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

            {/* Assign Lawyer Modal */}
            {assignModal.open && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="p-5 border-b border-slate-200">
                            <h3 className="font-bold text-slate-900">Assign Lawyer</h3>
                        </div>
                        <div className="p-5">
                            <input type="text" placeholder="Search attorneys..." value={lawyerSearch}
                                onChange={(e) => setLawyerSearch(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3" />
                            <div className="max-h-60 overflow-y-auto space-y-1">
                                {filteredLawyers.map((l) => (
                                    <button key={l._id} onClick={() => handleAssign(l._id)}
                                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 text-sm transition-colors">
                                        <p className="font-medium text-slate-900">{l.firstName} {l.lastName}</p>
                                        <p className="text-xs text-slate-500">{l.email}</p>
                                    </button>
                                ))}
                                {filteredLawyers.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No attorneys found</p>}
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-200 flex justify-end">
                            <button onClick={() => setAssignModal({ open: false, caseId: '' })}
                                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCases;
