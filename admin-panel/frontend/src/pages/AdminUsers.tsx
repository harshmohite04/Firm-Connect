import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, Shield, ShieldOff } from 'lucide-react';
import adminService from '../services/adminService';
import toast from 'react-hot-toast';

const AdminUsers: React.FC = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [subFilter, setSubFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const params: any = { page, limit: 20 };
            if (search) params.search = search;
            if (roleFilter) params.role = roleFilter;
            if (subFilter) params.subscriptionStatus = subFilter;
            const data = await adminService.getUsers(params);
            setUsers(data.users);
            setTotalPages(data.pages);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, [page, roleFilter, subFilter]);

    const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchUsers(); };

    const handleRoleChange = async (userId: string, role: string) => {
        try { await adminService.changeUserRole(userId, role); toast.success('Role updated'); fetchUsers(); }
        catch { toast.error('Failed to update role'); }
    };

    const handleToggleAdmin = async (userId: string) => {
        try { await adminService.toggleAdminStatus(userId); toast.success('Admin status toggled'); fetchUsers(); }
        catch { toast.error('Failed to toggle admin'); }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-6">User Management</h1>

            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-3">
                    <form onSubmit={handleSearch} className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Search by name or email..." value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </form>
                    <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">All Roles</option>
                        <option value="CLIENT">Client</option>
                        <option value="ATTORNEY">Attorney</option>
                        <option value="PARALEGAL">Paralegal</option>
                        <option value="ADMIN">Admin</option>
                    </select>
                    <select value={subFilter} onChange={(e) => { setSubFilter(e.target.value); setPage(1); }}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">All Subscriptions</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
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
                                    <th className="text-left px-4 py-3 font-medium text-slate-600">Name & Email</th>
                                    <th className="text-left px-4 py-3 font-medium text-slate-600">Role</th>
                                    <th className="text-left px-4 py-3 font-medium text-slate-600">Plan</th>
                                    <th className="text-left px-4 py-3 font-medium text-slate-600">Sub Status</th>
                                    <th className="text-left px-4 py-3 font-medium text-slate-600">Admin</th>
                                    <th className="text-left px-4 py-3 font-medium text-slate-600">Created</th>
                                    <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map((u) => (
                                    <tr key={u._id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-slate-900">{u.firstName} {u.lastName}</p>
                                            <p className="text-xs text-slate-500">{u.email}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <select value={u.role} onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                                className="text-xs px-2 py-1 rounded border border-slate-200 bg-slate-50 focus:outline-none">
                                                <option value="CLIENT">Client</option>
                                                <option value="ATTORNEY">Attorney</option>
                                                <option value="PARALEGAL">Paralegal</option>
                                                <option value="ADMIN">Admin</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                u.subscriptionPlan === 'ENTERPRISE' ? 'bg-purple-100 text-purple-700' :
                                                u.subscriptionPlan === 'PROFESSIONAL' ? 'bg-blue-100 text-blue-700' :
                                                u.subscriptionPlan === 'STARTER' ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-slate-100 text-slate-500'
                                            }`}>{u.subscriptionPlan || 'None'}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                u.subscriptionStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                                            }`}>{u.subscriptionStatus}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => handleToggleAdmin(u._id)}
                                                className={`p-1 rounded ${u.isAdmin ? 'text-blue-600' : 'text-slate-400'} hover:bg-slate-100`}
                                                title={u.isAdmin ? 'Revoke Admin' : 'Make Admin'}>
                                                {u.isAdmin ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => navigate(`/users/${u._id}`)}
                                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium">
                                                <Eye className="w-3.5 h-3.5" /> View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr><td colSpan={7} className="text-center py-8 text-slate-400">No users found</td></tr>
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
        </div>
    );
};

export default AdminUsers;
