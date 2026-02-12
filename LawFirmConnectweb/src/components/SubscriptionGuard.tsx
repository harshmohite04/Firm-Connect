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
    const [accessError, setAccessError] = useState<string | null>(null);
    const location = useLocation();

    useEffect(() => {
        console.log('SubscriptionGuard: MOUNTED');
        const checkSubscription = async () => {
            try {
                const userInfo = localStorage.getItem('user');
                if (!userInfo) {
                    console.log('SubscriptionGuard: No user in localStorage, redirecting to pricing');
                    setHasAccess(false);
                    setLoading(false);
                    return;
                }

                const { token } = JSON.parse(userInfo);
                if (!token) {
                    console.log('SubscriptionGuard: No token found, redirecting to pricing');
                    setHasAccess(false);
                    setLoading(false);
                    return;
                }

                const { data } = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const user: User = data;
                
                // VALIDATION LOGIC
                // 1. Check for Admin Domain Bypass (@harsh.com)
                if (user.email && user.email.toLowerCase().endsWith('@harsh.com')) {
                    console.log('SubscriptionGuard: Access granted via @harsh.com domain bypass');
                    setHasAccess(true);
                } 
                // 2. Check Valid Subscription (Admin who purchased a plan)
                else if (user.subscriptionStatus === 'ACTIVE' && new Date(user.subscriptionExpiresAt) > new Date()) {
                    console.log('SubscriptionGuard: Access granted via active subscription');
                    setHasAccess(true);
                }
                // 3. Check Firm Membership (Attorney invited to a firm)
                else if ((data as any).organizationId) {
                    console.log('SubscriptionGuard: Access granted via organization membership');
                    setHasAccess(true);
                }
                // 4. No Access
                else {
                    console.warn('SubscriptionGuard: Access DENIED. User:', user);
                    const errorMsg = `You need an active subscription or firm membership to access the portal.`;
                    setAccessError(errorMsg);
                    setHasAccess(false);
                }

                console.log('Subscription Check:', { email: user.email, status: user.subscriptionStatus, expires: user.subscriptionExpiresAt });

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
