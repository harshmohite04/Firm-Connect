import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
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
    const location = useLocation();

    useEffect(() => {
        const checkSubscription = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setHasAccess(false);
                    setLoading(false);
                    return;
                }

                const { data } = await axios.get('http://localhost:5000/auth/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const user: User = data;
                
                // 1. Check for Admin Domain Bypass
                if (user.email.endsWith('@harsh.com')) {
                    setHasAccess(true);
                } 
                // 2. Check Valid Subscription
                else if (user.subscriptionStatus === 'ACTIVE' && new Date(user.subscriptionExpiresAt) > new Date()) {
                    setHasAccess(true);
                } 
                // 3. No Access
                else {
                    setHasAccess(false);
                }

            } catch (error) {
                console.error('Subscription check failed:', error);
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
        return <Navigate to="/pricing" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

export default SubscriptionGuard;
