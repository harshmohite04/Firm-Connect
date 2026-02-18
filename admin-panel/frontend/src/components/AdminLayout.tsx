import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, Briefcase, CreditCard, Mail, LogOut, Menu, Shield } from 'lucide-react';

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/users', icon: Users, label: 'Users', end: false },
    { to: '/cases', icon: Briefcase, label: 'Cases', end: false },
    { to: '/subscriptions', icon: CreditCard, label: 'Subscriptions', end: false },
    { to: '/contacts', icon: Mail, label: 'Contact Inbox', end: false },
];

const AdminLayout: React.FC = () => {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const adminInfo = localStorage.getItem('admin');
    const admin = adminInfo ? JSON.parse(adminInfo) : null;

    const handleSignOut = () => {
        localStorage.removeItem('admin');
        navigate('/login');
    };

    const sidebarContent = (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-5 border-b border-slate-700">
                <div className="flex items-center gap-2">
                    <Shield className="w-6 h-6 text-blue-400" />
                    <span className="text-lg font-bold text-white">Admin Panel</span>
                </div>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                            }`
                        }
                    >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                        {admin?.firstName?.[0] || 'A'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{admin?.firstName || 'Admin'}</p>
                        <p className="text-xs text-blue-400">Administrator</p>
                    </div>
                    <button onClick={handleSignOut} className="text-slate-400 hover:text-red-400 transition-colors" title="Sign Out">
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed top-0 left-0 z-50 h-full w-64 bg-slate-800 transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {sidebarContent}
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-h-screen min-w-0">
                {/* Mobile header */}
                <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
                    <button onClick={() => setSidebarOpen(true)} className="text-slate-600">
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-600" />
                        <span className="font-bold text-slate-900">Admin</span>
                    </div>
                    <div className="w-6" />
                </div>

                <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
