import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase, CreditCard, IndianRupee, ArrowRight } from 'lucide-react';
import adminService from '../services/adminService';

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<any>(null);
    const [activity, setActivity] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [s, a] = await Promise.all([adminService.getStats(), adminService.getRecentActivity()]);
                setStats(s);
                setActivity(a);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const statCards = [
        { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users, color: 'bg-blue-500', link: '/users' },
        { label: 'Active Cases', value: stats?.activeCases ?? 0, icon: Briefcase, color: 'bg-emerald-500', link: '/cases' },
        { label: 'Active Subscriptions', value: stats?.activeSubscriptions ?? 0, icon: CreditCard, color: 'bg-purple-500', link: '/subscriptions' },
        { label: 'Total Revenue', value: `₹${(stats?.totalRevenue ?? 0).toLocaleString('en-IN')}`, icon: IndianRupee, color: 'bg-amber-500', link: '/subscriptions' },
    ];

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map((card) => (
                    <div key={card.label} onClick={() => navigate(card.link)}
                        className="bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:shadow-md transition-shadow">
                        <div className={`${card.color} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
                            <card.icon className="w-5 h-5 text-white" />
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                        <p className="text-sm text-slate-500 mt-1">{card.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Recent Cases */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-slate-900">Recent Cases</h2>
                        <button onClick={() => navigate('/cases')} className="text-blue-600 text-sm flex items-center gap-1 hover:underline">
                            View all <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="space-y-3">
                        {activity?.recentCases?.length ? activity.recentCases.map((c: any) => (
                            <div key={c._id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-900 truncate">{c.title}</p>
                                    <p className="text-xs text-slate-500">{c.clientId?.firstName} {c.clientId?.lastName}</p>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    c.status === 'Open' ? 'bg-green-100 text-green-700' :
                                    c.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                    c.status === 'Closed' ? 'bg-slate-100 text-slate-600' :
                                    'bg-amber-100 text-amber-700'
                                }`}>{c.status}</span>
                            </div>
                        )) : <p className="text-sm text-slate-400">No recent cases</p>}
                    </div>
                </div>

                {/* Recent Sign-ups */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-slate-900">Recent Sign-ups</h2>
                        <button onClick={() => navigate('/users')} className="text-blue-600 text-sm flex items-center gap-1 hover:underline">
                            View all <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="space-y-3">
                        {activity?.recentUsers?.length ? activity.recentUsers.map((u: any) => (
                            <div key={u._id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                                    {u.firstName?.[0]}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-slate-900 truncate">{u.firstName} {u.lastName}</p>
                                    <p className="text-xs text-slate-500">{u.role}</p>
                                </div>
                                <p className="text-xs text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</p>
                            </div>
                        )) : <p className="text-sm text-slate-400">No recent sign-ups</p>}
                    </div>
                </div>

                {/* Recent Contact Messages */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-slate-900">Contact Messages</h2>
                        <button onClick={() => navigate('/contacts')} className="text-blue-600 text-sm flex items-center gap-1 hover:underline">
                            View all <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="space-y-3">
                        {activity?.recentContacts?.length ? activity.recentContacts.map((c: any) => (
                            <div key={c._id} className="py-2 border-b border-slate-100 last:border-0">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                        c.status === 'New' ? 'bg-blue-100 text-blue-700' :
                                        c.status === 'Read' ? 'bg-slate-100 text-slate-600' :
                                        'bg-green-100 text-green-700'
                                    }`}>{c.status}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1 truncate">{c.subject || c.message}</p>
                            </div>
                        )) : <p className="text-sm text-slate-400">No messages yet</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
