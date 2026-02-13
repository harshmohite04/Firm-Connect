import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import axios from 'axios';

interface User {
    _id: string;
    email: string;
    subscriptionStatus: string;
    subscriptionExpiresAt: string;
}

const SubscriptionGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);
    const [accessError, setAccessError] = useState<string | null>(null);
    const location = useLocation();

    useEffect(() => {

        const checkSubscription = async () => {
            try {
                const userInfo = localStorage.getItem('user');
                if (!userInfo) {

                    setHasAccess(false);
                    setLoading(false);
                    return;
                }

                const { token } = JSON.parse(userInfo);
                if (!token) {

                    setHasAccess(false);
                    setLoading(false);
                    return;
                }

                const { data } = await api.get('/auth/me');

                const user: User = data;
                
                // VALIDATION LOGIC STARTS HERE
                // 1. Check for Admin Domain Bypass (@harsh.com)
                // If this is true, you get access immediately.
                if (user.email && user.email.toLowerCase().endsWith('@harsh.com')) {

                    setHasAccess(true);
                } 
                // 2. Check Valid Subscription (For everyone else)
                // If status is 'ACTIVE' AND expiration date is in the future.
                else if (user.subscriptionStatus === 'ACTIVE' && new Date(user.subscriptionExpiresAt) > new Date()) {

                    setHasAccess(true);
                } 
                // 3. No Access
                else {
                    console.warn('SubscriptionGuard: Access DENIED. User:', user);
                    const errorMsg = `Access Denied. Email: ${user.email}, Status: ${user.subscriptionStatus}, Expires: ${user.subscriptionExpiresAt}`;
                    setAccessError(errorMsg);
                    setHasAccess(false);
                }



            } catch (error: any) {
                console.error('Subscription check failed:', error);
                setAccessError(`Subscription Check Failed! Error: ${error.message}`);
                // If 401, clear user data
                if (axios.isAxiosError(error) && error.response?.status === 401) {
                    localStorage.removeItem('user');
                }
                setHasAccess(false);
            } finally {
                setLoading(false);
            }
        };

        checkSubscription();
    }, []);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!hasAccess) {
        return <Navigate to="/pricing" state={{ from: location, error: accessError }} replace />;
    }

    return <>{children}</>;
};

export default SubscriptionGuard;
