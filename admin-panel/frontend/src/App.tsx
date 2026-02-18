import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminGuard from './components/AdminGuard';
import AdminLayout from './components/AdminLayout';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminUserDetail from './pages/AdminUserDetail';
import AdminCases from './pages/AdminCases';
import AdminSubscriptions from './pages/AdminSubscriptions';
import AdminContacts from './pages/AdminContacts';

const App: React.FC = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={
                <AdminGuard>
                    <AdminLayout />
                </AdminGuard>
            }>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="users/:id" element={<AdminUserDetail />} />
                <Route path="cases" element={<AdminCases />} />
                <Route path="subscriptions" element={<AdminSubscriptions />} />
                <Route path="contacts" element={<AdminContacts />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default App;
