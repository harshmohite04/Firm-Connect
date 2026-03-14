import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface Profile {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: string;
    barNumber?: string;
    organizationId?: { _id: string; name: string } | null;
    subscriptionPlan?: string;
}

interface Hearing {
    _id: string;
    title?: string;
    startDate?: string;
    location?: string;
    caseId?: string;
}

interface Document {
    _id?: string;
    fileName?: string;
    category?: string;
    filePath?: string;
    caseTitle?: string;
    caseId?: string;
}

const PortalAdvocateProfile: React.FC = () => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [hearings, setHearings] = useState<Hearing[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.get('/advocates/my-profile')
            .then(res => {
                setProfile(res.data.profile);
                setHearings(res.data.hearings || []);
                setDocuments(res.data.documents || []);
            })
            .catch(() => setError('Failed to load profile.'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex-1 p-6 overflow-y-auto" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
                    <div className="h-40 rounded-2xl" style={{ backgroundColor: 'var(--color-surface)' }} />
                    <div className="h-48 rounded-2xl" style={{ backgroundColor: 'var(--color-surface)' }} />
                    <div className="h-64 rounded-2xl" style={{ backgroundColor: 'var(--color-surface)' }} />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 p-6 flex items-center justify-center">
                <p className="text-red-500 font-medium">{error}</p>
            </div>
        );
    }

    const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : '';
    const orgName = profile?.organizationId
        ? (typeof profile.organizationId === 'object' ? profile.organizationId.name : '')
        : null;

    return (
        <div className="flex-1 p-6 overflow-y-auto" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Profile Card */}
                <div className="rounded-2xl p-6 shadow-sm border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface-border)' }}>
                    <div className="flex items-start gap-5">
                        <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600 flex-shrink-0">
                            {profile?.firstName?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{fullName}</h1>
                                {profile?.barNumber && (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                                        Bar: {profile.barNumber}
                                    </span>
                                )}
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                                    {profile?.role}
                                </span>
                            </div>
                            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{profile?.email}</p>
                            {profile?.phone && (
                                <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{profile.phone}</p>
                            )}
                            {orgName && (
                                <p className="text-sm mt-1 font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
                                    {orgName}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Upcoming Hearings */}
                <div className="rounded-2xl shadow-sm border overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface-border)' }}>
                    <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-surface-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
                        <h2 className="font-bold text-base" style={{ color: 'var(--color-text-primary)' }}>Upcoming Hearings</h2>
                    </div>
                    {hearings.length === 0 ? (
                        <div className="p-6 text-center text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                            No upcoming hearings found.
                        </div>
                    ) : (
                        <div className="divide-y" style={{ borderColor: 'var(--color-surface-border)' }}>
                            {hearings.map(h => (
                                <div key={h._id} className="px-6 py-4 flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                                            {h.title || 'Untitled Event'}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                                            {h.startDate && (
                                                <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                                                    {new Date(h.startDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                                </span>
                                            )}
                                            {h.location && (
                                                <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                                                    📍 {h.location}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {h.caseId && (
                                        <Link
                                            to={`/portal/cases/${h.caseId}`}
                                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors whitespace-nowrap"
                                        >
                                            View Case →
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Documents */}
                <div className="rounded-2xl shadow-sm border overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface-border)' }}>
                    <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-surface-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
                        <h2 className="font-bold text-base" style={{ color: 'var(--color-text-primary)' }}>Case Documents</h2>
                    </div>
                    {documents.length === 0 ? (
                        <div className="p-6 text-center text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                            No documents found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-xs font-bold uppercase tracking-wider" style={{ borderColor: 'var(--color-surface-border)', color: 'var(--color-text-tertiary)', backgroundColor: 'var(--color-bg-secondary)' }}>
                                        <th className="px-6 py-3 text-left">File Name</th>
                                        <th className="px-6 py-3 text-left">Category</th>
                                        <th className="px-6 py-3 text-left">Case</th>
                                        <th className="px-6 py-3 text-left">Download</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: 'var(--color-surface-border)' }}>
                                    {documents.map((doc, idx) => (
                                        <tr key={doc._id || idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-3 font-medium truncate max-w-[200px]" style={{ color: 'var(--color-text-primary)' }}>
                                                {doc.fileName || 'Untitled'}
                                            </td>
                                            <td className="px-6 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                                                {doc.category || '—'}
                                            </td>
                                            <td className="px-6 py-3">
                                                {doc.caseId ? (
                                                    <Link
                                                        to={`/portal/cases/${doc.caseId}`}
                                                        className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                                                    >
                                                        {doc.caseTitle || 'View Case'}
                                                    </Link>
                                                ) : (
                                                    <span style={{ color: 'var(--color-text-tertiary)' }}>{doc.caseTitle || '—'}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3">
                                                {doc.filePath ? (
                                                    <a
                                                        href={doc.filePath}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs transition-colors"
                                                    >
                                                        Download
                                                    </a>
                                                ) : (
                                                    <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>N/A</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default PortalAdvocateProfile;
