import React, { useEffect, useState } from 'react';
import { Users, UserCheck, UserX } from 'lucide-react';
import adminService from '../services/adminService';
import toast from 'react-hot-toast';

const AdminSubscriptions: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [planFilter, setPlanFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [activeCount, setActiveCount] = useState(0);
    const [inactiveCount, setInactiveCount] = useState(0);
    const [total, setTotal] = useState(0);

    const [editModal, setEditModal] = useState<{ open: boolean; user: any }>({ open: false, user: null });
    const [editPlan, setEditPlan] = useState('');
    const [editStatus, setEditStatus] = useState('');
    const [editDays, setEditDays] = useState('');
    const [editDate, setEditDate] = useState('');

    const fetchSubs = async () => {
        setLoading(true);
        try {
            const params: any = { page, limit: 20 };
            if (statusFilter) params.status = statusFilter;
            if (planFilter) params.plan = planFilter;
            const data = await adminService.getSubscriptions(params);
            setUsers(data.users);
            setTotalPages(data.pages);
            setActiveCount(data.activeCount);
            setInactiveCount(data.inactiveCount);
            setTotal(data.total);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    useEffect(() => { fetchSubs(); }, [page, statusFilter, planFilter]);

    const openEdit = (user: any) => {
        setEditModal({ open: true, user });
        setEditPlan(user.subscriptionPlan || '');
        setEditStatus(user.subscriptionStatus || 'INACTIVE');
        setEditDays(''); setEditDate('');
    };

    const handleUpdate = async () => {
        try {
            const body: any = {};
            if (editStatus) body.subscriptionStatus = editStatus;
            if (editPlan) body.subscriptionPlan = editPlan;
            if (editDays) body.days = parseInt(editDays);
            else if (editDate) body.subscriptionExpiresAt = editDate;
            await adminService.updateSubscription(editModal.user._id, body);
            toast.success('Subscription updated');
            setEditModal({ open: false, user: null });
            fetchSubs();
        } catch { toast.error('Failed to update'); }
    };

    const summaryCards = [
        { label: 'Active', value: activeCount, icon: UserCheck, color: 'bg-green-500' },
        { label: 'Inactive', value: inactiveCount, icon: UserX, color: 'bg-red-500' },
        { label: 'Total Subscribers', value: total, icon: Users, color: 'bg-blue-500' },
    ];

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Subscription Management</h1>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {summaryCards.map((c) => (
                    <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center gap-3">
                            <div className={`${c.color} w-10 h-10 rounded-lg flex items-center justify-center`}>
                                <c.icon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{c.value}</p>
                                <p className="text-sm text-slate-500">{c.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
                <div className="flex gap-3">
                    <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">All Statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
                    </select>
                    <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">All Plans</option><option value="STARTER">Starter</option>
                        <option value="PROFESSIONAL">Professional</option><option value="ENTERPRISE">Enterprise</option>
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
                                    <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                                    <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
                                    <th className="text-left px-4 py-3 font-medium text-slate-600">Plan</th>
                                    <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                                    <th className="text-left px-4 py-3 font-medium text-slate-600">Expires</th>
                                    <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map((u) => (
                                    <tr key={u._id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium text-slate-900">{u.firstName} {u.lastName}</td>
                                        <td className="px-4 py-3 text-slate-500">{u.email}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                u.subscriptionPlan === 'ENTERPRISE' ? 'bg-purple-100 text-purple-700' :
                                                u.subscriptionPlan === 'PROFESSIONAL' ? 'bg-blue-100 text-blue-700' :
                                                u.subscriptionPlan === 'STARTER' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                            }`}>{u.subscriptionPlan || 'None'}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                u.subscriptionStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                                            }`}>{u.subscriptionStatus}</span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500">
                                            {u.subscriptionExpiresAt ? new Date(u.subscriptionExpiresAt).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => openEdit(u)}
                                                className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr><td colSpan={6} className="text-center py-8 text-slate-400">No subscriptions found</td></tr>
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

            {/* Edit Modal */}
            {editModal.open && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="p-5 border-b border-slate-200">
                            <h3 className="font-bold text-slate-900">Edit Subscription</h3>
                            <p className="text-sm text-slate-500 mt-1">{editModal.user.firstName} {editModal.user.lastName} — {editModal.user.email}</p>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Plan</label>
                                <select value={editPlan} onChange={(e) => setEditPlan(e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">Select</option><option value="STARTER">Starter</option>
                                    <option value="PROFESSIONAL">Professional</option><option value="ENTERPRISE">Enterprise</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Duration (days from today)</label>
                                <input type="number" value={editDays} onChange={(e) => { setEditDays(e.target.value); setEditDate(''); }}
                                    placeholder="e.g. 7, 30, 90, 365"
                                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Or exact expiry date</label>
                                <input type="date" value={editDate} onChange={(e) => { setEditDate(e.target.value); setEditDays(''); }}
                                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
                            <button onClick={() => setEditModal({ open: false, user: null })}
                                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                            <button onClick={handleUpdate}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSubscriptions;
