import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import caseService from '../../services/caseService';
import type { Case, CaseHealthScore, CaseHealthDimension, CaseRedFlag } from '../../services/caseService';

const RATING_CONFIG: Record<string, { color: string; label: string }> = {
    healthy: { color: '#22c55e', label: 'Healthy' },
    needs_attention: { color: '#f59e0b', label: 'Needs Attention' },
    at_risk: { color: '#f97316', label: 'At Risk' },
    critical: { color: '#ef4444', label: 'Critical' },
};

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
    critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: '!!' },
    warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: '!' },
    info: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: 'i' },
};

const DIMENSION_COLORS: Record<string, string> = {
    documents: '#8b5cf6',
    deadlines: '#3b82f6',
    billing: '#10b981',
    evidence: '#f59e0b',
};

/* ─── SVG Circular Gauge ─── */
const HealthRing: React.FC<{ score: number; rating: string }> = ({ score, rating }) => {
    const radius = 70;
    const stroke = 10;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;
    const ratingColor = RATING_CONFIG[rating]?.color || '#6b7280';

    return (
        <div className="flex flex-col items-center gap-3">
            <svg width="180" height="180" viewBox="0 0 180 180">
                <circle
                    cx="90" cy="90" r={radius}
                    fill="none"
                    stroke="var(--color-surface-border)"
                    strokeWidth={stroke}
                />
                <circle
                    cx="90" cy="90" r={radius}
                    fill="none"
                    stroke={ratingColor}
                    strokeWidth={stroke}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - progress}
                    strokeLinecap="round"
                    transform="rotate(-90 90 90)"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
                <text x="90" y="82" textAnchor="middle" fontSize="36" fontWeight="800" fill="var(--color-text-primary)">
                    {score}
                </text>
                <text x="90" y="106" textAnchor="middle" fontSize="13" fill="var(--color-text-secondary)">
                    out of 100
                </text>
            </svg>
            <span
                className="px-3 py-1 rounded-full text-sm font-semibold"
                style={{ backgroundColor: ratingColor + '20', color: ratingColor }}
            >
                {RATING_CONFIG[rating]?.label || rating}
            </span>
        </div>
    );
};

/* ─── Dimension Card ─── */
const DimensionCard: React.FC<{ dim: CaseHealthDimension }> = ({ dim }) => {
    const pct = Math.round((dim.score / dim.maxScore) * 100);
    const color = DIMENSION_COLORS[dim.name] || 'var(--color-accent)';

    return (
        <div
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-surface-border)' }}
        >
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{dim.label}</span>
                <span className="text-sm font-bold" style={{ color }}>
                    {dim.score}/{dim.maxScore}
                </span>
            </div>
            <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--color-surface-border)' }}>
                <div
                    className="h-2 rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: color, transition: 'width 0.6s ease' }}
                />
            </div>
        </div>
    );
};

/* ─── Red Flag Item ─── */
const RedFlagItem: React.FC<{ flag: CaseRedFlag }> = ({ flag }) => {
    const config = SEVERITY_CONFIG[flag.severity] || SEVERITY_CONFIG.info;
    return (
        <div
            className="flex gap-3 items-start rounded-lg p-3"
            style={{ backgroundColor: config.bg }}
        >
            <span
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: config.color, color: '#fff' }}
            >
                {config.icon}
            </span>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span
                        className="text-xs font-semibold uppercase px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: 'var(--color-surface-border)', color: 'var(--color-text-secondary)' }}
                    >
                        {flag.category}
                    </span>
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{flag.message}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{flag.actionable}</p>
            </div>
        </div>
    );
};

/* ─── Loading Skeleton ─── */
const Skeleton: React.FC = () => (
    <div className="flex-1 overflow-auto p-6 animate-pulse">
        <div className="flex flex-col items-center mb-8">
            <div className="w-[180px] h-[180px] rounded-full" style={{ backgroundColor: 'var(--color-surface-border)' }} />
            <div className="w-32 h-6 rounded-full mt-3" style={{ backgroundColor: 'var(--color-surface-border)' }} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-xl h-20" style={{ backgroundColor: 'var(--color-surface-border)' }} />
            ))}
        </div>
        <div className="space-y-3">
            {[1, 2, 3].map(i => (
                <div key={i} className="rounded-lg h-16" style={{ backgroundColor: 'var(--color-surface-border)' }} />
            ))}
        </div>
    </div>
);

/* ─── Main Component ─── */
const CaseOverview: React.FC = () => {
    const { caseData } = useOutletContext<{ caseData: Case }>();
    const [health, setHealth] = useState<CaseHealthScore | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!caseData?._id) return;
        setLoading(true);
        caseService.getCaseHealth(caseData._id)
            .then(setHealth)
            .catch(err => setError(err?.response?.data?.message || 'Failed to load health score'))
            .finally(() => setLoading(false));
    }, [caseData?._id]);

    if (loading) return <Skeleton />;

    if (error || !health) {
        return (
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                        {error || 'Unable to compute health score'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto p-6">
            {/* Health Score Ring */}
            <div className="flex flex-col items-center mb-8">
                <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>Case Health Score</h2>
                <HealthRing score={health.score} rating={health.rating} />
            </div>

            {/* Dimension Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {health.dimensions.map(dim => (
                    <DimensionCard key={dim.name} dim={dim} />
                ))}
            </div>

            {/* Red Flags */}
            {health.redFlags.length > 0 && (
                <div>
                    <h3 className="text-base font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                        Attention Items ({health.redFlags.length})
                    </h3>
                    <div className="space-y-2">
                        {health.redFlags.map((flag, i) => (
                            <RedFlagItem key={i} flag={flag} />
                        ))}
                    </div>
                </div>
            )}

            {health.redFlags.length === 0 && (
                <div className="text-center py-8">
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        No issues detected. This case looks good!
                    </p>
                </div>
            )}
        </div>
    );
};

export default CaseOverview;
