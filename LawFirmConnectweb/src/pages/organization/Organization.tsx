import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import organizationService from '../../services/organizationService';
import type { Organization, OrganizationMember, Invitation } from '../../services/organizationService';
import { Building2, LayoutDashboard, Users, CreditCard, Mail, Settings } from 'lucide-react';
import OverviewTab from './OverviewTab';
import MembersTab from './MembersTab';
import SeatsBillingTab from './SeatsBillingTab';
import InvitationsTab from './InvitationsTab';
import SettingsTab from './SettingsTab';

const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'seats', label: 'Seats & Billing', icon: CreditCard },
    { id: 'invitations', label: 'Invitations', icon: Mail },
    { id: 'settings', label: 'Settings', icon: Settings },
];

const OrganizationPage: React.FC = () => {
    const [org, setOrg] = useState<Organization | null>(null);
    const [members, setMembers] = useState<OrganizationMember[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [totalSeats, setTotalSeats] = useState(0);
    const [usedSeats, setUsedSeats] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    // Route guard: redirect non-admins
    if (user?.role !== 'ADMIN') {
        return <Navigate to="/portal/firm-connect" replace />;
    }

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const orgData = await organizationService.getOrganization();
            setOrg(orgData);

            const membersData = await organizationService.getMembers();
            setMembers(membersData.members);
            setTotalSeats(membersData.totalSeats);
            setUsedSeats(membersData.usedSeats);

            const invData = await organizationService.getInvitations();
            setInvitations(invData);
        } catch (error: any) {
            console.error('Error fetching org data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <PortalLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-accent)' }}></div>
                </div>
            </PortalLayout>
        );
    }

    if (!org) {
        return (
            <PortalLayout>
                <div className="max-w-2xl mx-auto text-center py-20">
                    <Building2 className="mx-auto h-16 w-16 mb-6" style={{ color: 'var(--color-text-tertiary)' }} />
                    <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>No Organization</h2>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Purchase a plan to create your firm.</p>
                </div>
            </PortalLayout>
        );
    }

    const renderTab = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <OverviewTab
                        org={org}
                        members={members}
                        totalSeats={totalSeats}
                        usedSeats={usedSeats}
                        onSwitchTab={setActiveTab}
                    />
                );
            case 'members':
                return <MembersTab org={org} members={members} onRefresh={fetchData} />;
            case 'seats':
                return <SeatsBillingTab org={org} totalSeats={totalSeats} usedSeats={usedSeats} onRefresh={fetchData} />;
            case 'invitations':
                return <InvitationsTab invitations={invitations} totalSeats={totalSeats} usedSeats={usedSeats} onRefresh={fetchData} />;
            case 'settings':
                return <SettingsTab org={org} onRefresh={fetchData} />;
            default:
                return null;
        }
    };

    return (
        <PortalLayout>
            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Building2 className="h-8 w-8" style={{ color: 'var(--color-accent)' }} />
                        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                            Organization Management
                        </h1>
                    </div>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        {org.name} · {org.plan} Plan
                    </p>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-1 mb-6 overflow-x-auto pb-1 border-b" style={{ borderColor: 'var(--color-surface-border)' }}>
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap -mb-px border-b-2 ${
                                    isActive
                                        ? 'border-current'
                                        : 'border-transparent hover:border-slate-300'
                                }`}
                                style={{
                                    color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                                }}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                {renderTab()}
            </div>
        </PortalLayout>
    );
};

export default OrganizationPage;
