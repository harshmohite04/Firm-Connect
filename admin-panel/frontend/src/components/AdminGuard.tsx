import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import adminService from '../services/adminService';

const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const adminInfo = localStorage.getItem('admin');
                if (!adminInfo) {
                    setLoading(false);
                    return;
                }

                const data = await adminService.getMe();
                if (data.isAdmin === true) {
                    setIsAdmin(true);
                }
            } catch {
                localStorage.removeItem('admin');
            } finally {
                setLoading(false);
            }
        };

        checkAdmin();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 text-sm">Verifying admin access...</p>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

export default AdminGuard;
