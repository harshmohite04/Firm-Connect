import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import PortalLayout from '../components/PortalLayout';
import { dummyBilling, dummyCases } from '../data/dummyData';
import { useTranslation } from 'react-i18next';

// Icons
const WalletIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
)
const CheckCircleIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
)
const ClockIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
)
const TrendingUpIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
)
const SearchIcon = () => (
    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
)
const FilterIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
)
const DownloadIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
)
const PlusIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
)
const EyeIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
)
const PrintIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
)
const SendIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
)
const XIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
)

// Format currency in Indian Rupees
const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

// Convert USD-like amounts to INR (approximate rate)
const toINR = (usdAmount: number) => Math.round(usdAmount * 83);

const PortalBilling: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'open' | 'history' | 'retainer' | 'time'> ('open');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedDateRange, setSelectedDateRange] = useState('all');
    const [showQuickPay, setShowQuickPay] = useState(false);
    const { t } = useTranslation();

    // Keyboard: ESC to close billing modals
    React.useEffect(() => {
        if (!showQuickPay && !showCreateModal) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (showQuickPay) setShowQuickPay(false);
                if (showCreateModal) setShowCreateModal(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showQuickPay, showCreateModal]);

    // Convert billing data to INR
    const billingData = useMemo(() => 
        dummyBilling.map(b => ({ ...b, amount: toINR(b.amount) })), 
        []
    );

    // Sample time entries for law firms
    const [timeEntries] = useState([
        { id: 'T001', date: '2024-01-15', description: 'Client consultation - Estate planning', hours: 2.5, rate: 5000, lawyer: 'Adv. Sharma', status: 'Unbilled', caseId: '1' },
        { id: 'T002', date: '2024-01-16', description: 'Document review - Property dispute', hours: 3.0, rate: 5000, lawyer: 'Adv. Sharma', status: 'Unbilled', caseId: '2' },
        { id: 'T003', date: '2024-01-17', description: 'Court appearance - Civil litigation', hours: 4.0, rate: 7500, lawyer: 'Adv. Patel', status: 'Billed', caseId: '2' },
        { id: 'T004', date: '2024-01-18', description: 'Legal research - Merger compliance', hours: 1.5, rate: 5000, lawyer: 'Adv. Kumar', status: 'Unbilled', caseId: '3' },
    ]);

    // Sample retainer data
    const [retainerData] = useState([
        { id: 'RET001', client: 'TechCorp Inc.', monthlyAmount: 50000, balance: 35000, validTill: '2024-06-30', status: 'Active' },
        { id: 'RET002', client: 'Johnson Family', monthlyAmount: 25000, balance: 12500, validTill: '2024-03-31', status: 'Active' },
    ]);

    // Stats Calculations
    const totalOutstanding = billingData
        .filter(b => b.status === 'Pending' || b.status === 'Overdue')
        .reduce((sum, b) => sum + b.amount, 0);

    const paidThisMonth = billingData
        .filter(b => b.status === 'Paid')
        .reduce((sum, b) => sum + b.amount, 0);

    const unbilledWIP = timeEntries
        .filter(t => t.status === 'Unbilled')
        .reduce((sum, t) => sum + (t.hours * t.rate), 0);

    const totalRetainerBalance = retainerData.reduce((sum, r) => sum + r.balance, 0);

    const paidInvoices = billingData.filter(b => b.status === 'Paid');
    const lastPayment = paidInvoices.length > 0 ? paidInvoices[paidInvoices.length - 1] : null;

    // Filter Data
    const filteredData = billingData.filter(bill => {
        const matchesSearch = 
            bill.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
            bill.description.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (!matchesSearch) return false;

        if (activeTab === 'open') return bill.status === 'Pending' || bill.status === 'Overdue';
        if (activeTab === 'history') return bill.status === 'Paid';
        return true;
    });

    const handleQuickPay = (invoiceId: string) => {
        toast.success(`Redirecting to Razorpay for invoice ${invoiceId}...`);
    };

    return (
        <PortalLayout>
            <div className="max-w-7xl mx-auto">
                
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{t('billing.title')}</h1>
                        <p className="text-slate-500 text-sm mt-1">{t('billing.subtitle')}</p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowQuickPay(true)}
                            className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                        >
                            <WalletIcon /> {t('billing.quickPay')}
                        </button>
                        <button 
                            onClick={() => setShowCreateModal(true)}
                            className="px-4 py-2.5 bg-indigo-600 rounded-lg text-sm font-semibold text-white hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <PlusIcon /> {t('billing.newInvoice')}
                        </button>
                    </div>
                </div>

                {/* Stats Cards - Modern Design */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {/* Outstanding */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2 bg-red-50 rounded-lg">
                                <div className="text-red-500"><WalletIcon /></div>
                            </div>
                            {totalOutstanding > 0 && (
                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">{t('billing.actionRequired')}</span>
                            )}
                        </div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('billing.outstanding')}</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{formatINR(totalOutstanding)}</p>
                        <p className="text-xs text-slate-400 mt-2">{filteredData.filter(b => b.status !== 'Paid').length} {t('billing.pendingInvoices')}</p>
                    </div>

                    {/* Paid This Month */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2 bg-emerald-50 rounded-lg">
                                <div className="text-emerald-500"><CheckCircleIcon /></div>
                            </div>
                            <span className="text-emerald-600 text-xs font-medium flex items-center gap-1">
                                <TrendingUpIcon /> +12%
                            </span>
                        </div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('billing.collected')}</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{formatINR(paidThisMonth)}</p>
                        <p className="text-xs text-slate-400 mt-2">Last: {lastPayment ? new Date(lastPayment.date).toLocaleDateString('en-IN') : 'N/A'}</p>
                    </div>

                    {/* Unbilled WIP */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2 bg-amber-50 rounded-lg">
                                <div className="text-amber-500"><ClockIcon /></div>
                            </div>
                        </div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('billing.unbilledWIP')}</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{formatINR(unbilledWIP)}</p>
                        <p className="text-xs text-slate-400 mt-2">{timeEntries.filter(t => t.status === 'Unbilled').length} {t('billing.timeEntries')}</p>
                    </div>

                    {/* Retainer Balance */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <div className="text-indigo-500"><WalletIcon /></div>
                            </div>
                        </div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('billing.retainerBalance')}</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{formatINR(totalRetainerBalance)}</p>
                        <p className="text-xs text-slate-400 mt-2">{retainerData.length} {t('billing.activeRetainers')}</p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    
                    {/* Tabs */}
                    <div className="flex border-b border-slate-200 bg-slate-50/50 overflow-x-auto">
                        {[
                            { id: 'open', label: t('billing.openInvoices'), count: billingData.filter(b => b.status !== 'Paid').length },
                            { id: 'history', label: t('billing.paymentHistory'), count: paidInvoices.length },
                            { id: 'time', label: t('billing.timeEntriesTab'), count: timeEntries.length },
                            { id: 'retainer', label: t('billing.retainers'), count: retainerData.length },
                        ].map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-5 py-4 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
                                    activeTab === tab.id 
                                        ? 'text-indigo-600 border-indigo-600 bg-white' 
                                        : 'text-slate-600 border-transparent hover:text-slate-800 hover:bg-slate-100'
                                }`}
                            >
                                {tab.label}
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                    activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
                                }`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Filters Bar */}
                    <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 bg-white">
                        <div className="flex-grow relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchIcon />
                            </div>
                            <input 
                                type="text" 
                                placeholder={t('billing.searchPlaceholder')} 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                        </div>
                        <div className="flex gap-2">
                            <select 
                                value={selectedDateRange}
                                onChange={(e) => setSelectedDateRange(e.target.value)}
                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="all">{t('billing.allTime')}</option>
                                <option value="month">{t('billing.thisMonth')}</option>
                                <option value="quarter">{t('billing.thisQuarter')}</option>
                                <option value="year">{t('billing.thisYear')}</option>
                            </select>
                            <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
                                <FilterIcon /> {t('billing.filter')}
                            </button>
                            <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
                                <DownloadIcon /> {t('billing.export')}
                            </button>
                        </div>
                    </div>

                    {/* Tab Content */}
                    {(activeTab === 'open' || activeTab === 'history') && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">{t('billing.invoiceNo')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">{t('billing.date')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">{t('billing.dueDate')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">{t('billing.description')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">{t('billing.amount')}</th>
                                        <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">{t('billing.status')}</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">{t('billing.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {filteredData.map((bill: any) => {
                                        const relatedCase = dummyCases.find((c: any) => c._id === bill.caseId);
                                        const dueDate = new Date(new Date(bill.date).getTime() + 14 * 24 * 60 * 60 * 1000);
                                        const isOverdue = bill.status !== 'Paid' && dueDate < new Date();
                                        
                                        return (
                                            <tr key={bill.id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-bold text-indigo-600">#{bill.id}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm text-slate-600">{new Date(bill.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                                                        {dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-semibold text-slate-900">{bill.description}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">{relatedCase?.title || t('billing.general')}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-bold text-slate-900">{formatINR(bill.amount)}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full ${
                                                        bill.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                                                        isOverdue ? 'bg-red-100 text-red-700' :
                                                        'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        {isOverdue && bill.status !== 'Paid' ? t('billing.overdue') : bill.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="View">
                                                            <EyeIcon />
                                                        </button>
                                                        <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="Print">
                                                            <PrintIcon />
                                                        </button>
                                                        {bill.status !== 'Paid' && (
                                                            <button 
                                                                onClick={() => handleQuickPay(bill.id)}
                                                                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                                                            >
                                                                {t('billing.payNow')}
                                                            </button>
                                                        )}
                                                        {bill.status === 'Paid' && (
                                                            <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="Receipt">
                                                                <DownloadIcon />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {filteredData.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-16 text-center">
                                                <div className="flex flex-col items-center">
                                                    <div className="p-4 bg-slate-100 rounded-full mb-4">
                                                        <WalletIcon />
                                                    </div>
                                                    <p className="font-semibold text-slate-900">{t('billing.noInvoices')}</p>
                                                    <p className="text-sm text-slate-400 mt-1">{t('billing.adjustFilters')}</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Time Entries Tab */}
                    {activeTab === 'time' && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">{t('billing.date')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">{t('billing.description')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">{t('billing.lawyer')}</th>
                                        <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">{t('billing.hours')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">{t('billing.rate')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">{t('billing.amount')}</th>
                                        <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">{t('billing.status')}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {timeEntries.map(entry => {
                                        const relatedCase = dummyCases.find((c: any) => c._id === entry.caseId);
                                        return (
                                            <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    {new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-medium text-slate-900">{entry.description}</p>
                                                    <p className="text-xs text-slate-400">{relatedCase?.title}</p>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">{entry.lawyer}</td>
                                                <td className="px-6 py-4 text-center text-sm font-semibold text-slate-900">{entry.hours}h</td>
                                                <td className="px-6 py-4 text-sm text-slate-600">{formatINR(entry.rate)}/hr</td>
                                                <td className="px-6 py-4 text-sm font-bold text-slate-900">{formatINR(entry.hours * entry.rate)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-1 text-xs font-bold rounded ${
                                                        entry.status === 'Billed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        {entry.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                                <p className="text-sm text-slate-600">
                                    {t('billing.totalUnbilled')}: <span className="font-bold text-slate-900">{formatINR(unbilledWIP)}</span>
                                </p>
                                <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                                    {t('billing.generateInvoice')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Retainers Tab */}
                    {activeTab === 'retainer' && (
                        <div className="p-6">
                            <div className="grid gap-4">
                                {retainerData.map(ret => (
                                    <div key={ret.id} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h3 className="font-bold text-slate-900">{ret.client}</h3>
                                                <p className="text-sm text-slate-500">{t('billing.validTill')} {new Date(ret.validTill).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                            </div>
                                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">{ret.status}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <p className="text-xs text-slate-500">{t('billing.monthlyRetainer')}</p>
                                                <p className="text-lg font-bold text-slate-900">{formatINR(ret.monthlyAmount)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">{t('billing.availableBalance')}</p>
                                                <p className="text-lg font-bold text-emerald-600">{formatINR(ret.balance)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">{t('billing.usage')}</p>
                                                <div className="mt-1">
                                                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-indigo-500 rounded-full transition-all"
                                                            style={{ width: `${((ret.monthlyAmount - ret.balance) / ret.monthlyAmount) * 100}%` }}
                                                        />
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1">{Math.round(((ret.monthlyAmount - ret.balance) / ret.monthlyAmount) * 100)}% {t('billing.used')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
                        <p className="text-sm text-slate-600">
                            {t('billing.showing')} <span className="font-semibold">1</span> {t('billing.to')} <span className="font-semibold">{Math.min(10, filteredData.length)}</span> {t('billing.of')} <span className="font-semibold">{filteredData.length}</span> {t('billing.results')}
                        </p>
                        <div className="flex gap-1">
                            <button className="px-3 py-1.5 border border-slate-200 rounded-md text-sm text-slate-500 font-medium hover:bg-white transition-colors">{t('billing.previous')}</button>
                            <button className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium">1</button>
                            <button className="px-3 py-1.5 border border-slate-200 rounded-md text-sm text-slate-500 font-medium hover:bg-white transition-colors">{t('billing.next')}</button>
                        </div>
                    </div>
                </div>

                {/* Quick Pay Modal */}
                {showQuickPay && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-indigo-600 to-purple-600">
                                <h3 className="font-bold text-lg text-white">Quick Payment</h3>
                                <button onClick={() => setShowQuickPay(false)} className="text-white/80 hover:text-white">
                                    <XIcon />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Select Invoice</label>
                                    <select className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                                        {billingData.filter(b => b.status !== 'Paid').map(b => (
                                            <option key={b.id} value={b.id}>#{b.id} - {formatINR(b.amount)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₹</span>
                                        <input 
                                            type="number" 
                                            className="w-full p-3 pl-8 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Method</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['UPI', 'Card', 'Net Banking'].map(method => (
                                            <button key={method} className="p-3 border-2 border-slate-200 rounded-xl text-sm font-medium hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
                                                {method}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-indigo-200">
                                    Pay Now with Razorpay
                                </button>
                                <p className="text-xs text-center text-slate-400">Secured by Razorpay • 256-bit SSL Encryption</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Create Invoice Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0">
                                <h3 className="font-bold text-lg text-slate-900">Create New Invoice</h3>
                                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <XIcon />
                                </button>
                            </div>
                            <div className="p-6 space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Client / Matter</label>
                                        <select className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                                            {dummyCases.map(c => (
                                                <option key={c._id} value={c._id}>{c.clientName} - {c.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Invoice Date</label>
                                        <input type="date" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                                    <textarea rows={3} className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder="Enter invoice description..."></textarea>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Amount (₹)</label>
                                        <input type="number" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Due Date</label>
                                        <input type="date" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button onClick={() => setShowCreateModal(false)} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-colors">
                                        Cancel
                                    </button>
                                    <button className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                                        <SendIcon /> Create & Send
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PortalLayout>
    );
};

export default PortalBilling;
