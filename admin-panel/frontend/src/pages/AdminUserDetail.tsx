import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, ShieldOff, Key, Unlock, User as UserIcon } from 'lucide-react';
import adminService from '../services/adminService';
import toast from 'react-hot-toast';

const AdminUserDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [newPassword, setNewPassword] = useState('');
    const [subDays, setSubDays] = useState('');
    const [subPlan, setSubPlan] = useState('');
    const [subStatus, setSubStatus] = useState('');

    const fetchUser = async () => {
        try {
            const result = await adminService.getUserDetail(id!);
            setData(result);
            setSubPlan(result.user.subscriptionPlan || '');
            setSubStatus(result.user.subscriptionStatus || 'INACTIVE');
        } catch (err) {
            toast.error('Failed to load user');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUser(); }, [id]);

    const handleResetPassword = async () => {
        if (!newPassword || newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
        try { await adminService.resetUserPassword(id!, newPassword); toast.success('Password reset successfully'); setNewPassword(''); }
        catch { toast.error('Failed to reset password'); }
    };

    const handleToggleAdmin = async () => {
        try { await adminService.toggleAdminStatus(id!); toast.success('Admin status toggled'); fetchUser(); }
        catch { toast.error('Failed to toggle admin'); }
    };

    const handleUnlock = async () => {
        try { await adminService.unlockUserAccount(id!); toast.success('Account unlocked'); fetchUser(); }
        catch { toast.error('Failed to unlock'); }
    };

    const handleRoleChange = async (role: string) => {
        try { await adminService.changeUserRole(id!, role); toast.success('Role updated'); fetchUser(); }
        catch { toast.error('Failed to update role'); }
    };

    const handleSubscriptionUpdate = async () => {
        try {
            const body: any = {};
            if (subStatus) body.subscriptionStatus = subStatus;
            if (subPlan) body.subscriptionPlan = subPlan;
            if (subDays) body.days = parseInt(subDays);
            await adminService.updateSubscription(id!, body);
            toast.success('Subscription updated');
            setSubDays('');
            fetchUser();
        } catch { toast.error('Failed to update subscription'); }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>;
    }

    if (!data) return <p className="text-center text-slate-500 mt-10">User not found</p>;

    const { user, cases, messages, billing } = data;

    return (
        <div>
            <button onClick={() => navigate('/users')} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-4">
                <ArrowLeft className="w-4 h-4" /> Back to Users
            </button>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Account Info */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <UserIcon className="w-5 h-5 text-blue-600" /> Account Info
                    </h2>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-medium">{user.firstName} {user.lastName}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-medium">{user.email}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Phone</span><span className="font-medium">{user.phone || 'N/A'}</span></div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500">Role</span>
                            <select value={user.role} onChange={(e) => handleRoleChange(e.target.value)}
                                className="text-xs px-2 py-1 rounded border border-slate-200 bg-slate-50 focus:outline-none">
                                <option value="CLIENT">Client</option><option value="ATTORNEY">Attorney</option>
                                <option value="PARALEGAL">Paralegal</option><option value="ADMIN">Admin</option>
                            </select>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500">Admin</span>
                            <button onClick={handleToggleAdmin}
                                className={`flex items-center gap-1 text-xs px-2 py-1 rounded font-medium ${user.isAdmin ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                {user.isAdmin ? <><Shield className="w-3 h-3" /> Admin</> : <><ShieldOff className="w-3 h-3" /> Non-Admin</>}
                            </button>
                        </div>
                        <div className="flex justify-between"><span className="text-slate-500">Status</span>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${user.status === 'VERIFIED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{user.status}</span>
                        </div>
                        <div className="flex justify-between"><span className="text-slate-500">Failed Logins</span><span className="font-medium">{user.failedLoginAttempts || 0}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Locked</span><span className="font-medium">{user.lockUntil && new Date(user.lockUntil) > new Date() ? 'Yes' : 'No'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Created</span><span className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</span></div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Reset Password</label>
                            <div className="flex gap-2">
                                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="New password (min 6 chars)"
                                    className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                <button onClick={handleResetPassword}
                                    className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors">
                                    <Key className="w-3.5 h-3.5" /> Reset
                                </button>
                            </div>
                        </div>
                        {(user.failedLoginAttempts > 0 || user.lockUntil) && (
                            <button onClick={handleUnlock}
                                className="flex items-center gap-1 px-3 py-2 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 transition-colors">
                                <Unlock className="w-3.5 h-3.5" /> Unlock Account
                            </button>
                        )}
                    </div>
                </div>

                {/* Subscription */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="font-bold text-slate-900 mb-4">Subscription</h2>
                    <div className="space-y-3 text-sm mb-5">
                        <div className="flex justify-between"><span className="text-slate-500">Plan</span>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                user.subscriptionPlan === 'ENTERPRISE' ? 'bg-purple-100 text-purple-700' :
                                user.subscriptionPlan === 'PROFESSIONAL' ? 'bg-blue-100 text-blue-700' :
                                user.subscriptionPlan === 'STARTER' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}>{user.subscriptionPlan || 'None'}</span>
                        </div>
                        <div className="flex justify-between"><span className="text-slate-500">Status</span>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${user.subscriptionStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{user.subscriptionStatus}</span>
                        </div>
                        <div className="flex justify-between"><span className="text-slate-500">Expires</span>
                            <span className="font-medium">{user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt).toLocaleDateString() : 'N/A'}</span>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-slate-100 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Plan</label>
                                <select value={subPlan} onChange={(e) => setSubPlan(e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">Select</option><option value="STARTER">Starter</option>
                                    <option value="PROFESSIONAL">Professional</option><option value="ENTERPRISE">Enterprise</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                                <select value={subStatus} onChange={(e) => setSubStatus(e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Duration (days from today)</label>
                            <input type="number" value={subDays} onChange={(e) => setSubDays(e.target.value)}
                                placeholder="e.g. 7, 30, 90, 365"
                                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <button onClick={handleSubscriptionUpdate}
                            className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium">
                            Update Subscription
                        </button>
                    </div>
                </div>
            </div>

            {/* Cases */}
            <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="font-bold text-slate-900 mb-4">Cases ({cases.length})</h2>
                {cases.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600">Title</th>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600">Status</th>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600">Legal Matter</th>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600">Created</th>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600">Docs</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {cases.map((c: any) => (
                                    <tr key={c._id} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 font-medium text-slate-900">{c.title}</td>
                                        <td className="px-4 py-2"><span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                            c.status === 'Open' ? 'bg-green-100 text-green-700' : c.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                            c.status === 'Closed' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'
                                        }`}>{c.status}</span></td>
                                        <td className="px-4 py-2 text-slate-500">{c.legalMatter}</td>
                                        <td className="px-4 py-2 text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                                        <td className="px-4 py-2 text-slate-500">{c.documents?.length || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : <p className="text-sm text-slate-400">No cases found</p>}
            </div>

            {/* Messages */}
            <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="font-bold text-slate-900 mb-4">Recent Conversations ({messages.length})</h2>
                {messages.length > 0 ? (
                    <div className="space-y-3">
                        {messages.map((m: any, i: number) => (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-900">{m.contactName}</p>
                                    <p className="text-xs text-slate-500 truncate">{m.lastMessage}</p>
                                </div>
                                <div className="text-right flex-shrink-0 ml-4">
                                    {m.unreadCount > 0 && <span className="inline-block bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{m.unreadCount}</span>}
                                    <p className="text-xs text-slate-400 mt-1">{new Date(m.lastDate).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : <p className="text-sm text-slate-400">No conversations</p>}
            </div>

            {/* Billing */}
            <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="font-bold text-slate-900 mb-4">Billing ({billing.length})</h2>
                {billing.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600">Invoice</th>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600">Amount</th>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600">Status</th>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {billing.map((b: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 font-medium text-slate-900">{b.invoiceId || '-'}</td>
                                        <td className="px-4 py-2">₹{b.amount?.toLocaleString('en-IN')}</td>
                                        <td className="px-4 py-2"><span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                            b.status === 'Paid' ? 'bg-green-100 text-green-700' : b.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
                                        }`}>{b.status}</span></td>
                                        <td className="px-4 py-2 text-slate-500">{new Date(b.date).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : <p className="text-sm text-slate-400">No billing records</p>}
            </div>
        </div>
    );
};

export default AdminUserDetail;
