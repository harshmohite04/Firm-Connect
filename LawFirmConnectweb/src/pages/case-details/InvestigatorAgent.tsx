import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import Logo from '../../assets/logo.svg';
import caseService from '../../services/caseService';
import type {
    Case,
    InvestigationReport,
    InvestigationStructuredData,
    InvestigationStats,
    InvestigationFact,
    InvestigationConflict,
    InvestigationJobStatus,
} from '../../services/caseService';

// ============================================================
//  ICONS
// ============================================================
const PlayIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
    </svg>
);
const SpinnerIcon = () => (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
);
const FileSearchIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.243 3 3 0 00-4.243 4.243z" />
    </svg>
);
const ClockIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
const TargetIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
);
const ChevronDownIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
);
const ChevronUpIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
);
const AlertIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

const PrintIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
);

// Pipeline steps
const PIPELINE_STEPS = [
    { key: 'document_analyst', label: 'Analyze Docs', short: 'Docs' },
    { key: 'entity_extractor', label: 'Extract Facts', short: 'Facts' },
    { key: 'auditor', label: 'Audit Timeline', short: 'Audit' },
    { key: 'primary_investigator', label: 'Investigate', short: 'Investigate' },
    { key: 'cross_examiner', label: 'Cross-Examine', short: 'Critique' },
    { key: 'evidence_validator', label: 'Validate', short: 'Validate' },
    { key: 'legal_researcher', label: 'Legal Research', short: 'Legal' },
    { key: 'risk_assessor', label: 'Assess Risks', short: 'Risks' },
    { key: 'final_judge', label: 'Final Report', short: 'Report' },
];

// ============================================================
//  CSS (injected once)
// ============================================================
const INVESTIGATOR_STYLES = `
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.fade-in { animation: fadeInUp 0.3s ease-out both; }
.fade-in-1 { animation-delay: 0.1s; }
.fade-in-2 { animation-delay: 0.2s; }
.fade-in-3 { animation-delay: 0.3s; }
.fade-in-4 { animation-delay: 0.4s; }
`;

// ============================================================
//  HELPER: Circular layout
// ============================================================
interface NodePos { entity: string; x: number; y: number; connections: number; }
interface Edge { from: string; to: string; factCount: number; factIds: string[]; }

function buildGraph(entities: string[], facts: InvestigationFact[]) {
    // Limit to top 20 most-connected entities
    const connectionCount: Record<string, number> = {};
    entities.forEach(e => { connectionCount[e] = 0; });
    facts.forEach(f => {
        if (f.entities?.length >= 2) {
            f.entities.forEach(e => {
                if (connectionCount[e] !== undefined) connectionCount[e]++;
            });
        }
    });
    const sorted = [...entities].sort((a, b) => (connectionCount[b] || 0) - (connectionCount[a] || 0));
    const topEntities = sorted.slice(0, 20);
    const entitySet = new Set(topEntities);

    // Build edges
    const edgeMap: Record<string, Edge> = {};
    facts.forEach(f => {
        if (!f.entities || f.entities.length < 2) return;
        const relevant = f.entities.filter(e => entitySet.has(e));
        for (let i = 0; i < relevant.length; i++) {
            for (let j = i + 1; j < relevant.length; j++) {
                const key = [relevant[i], relevant[j]].sort().join('|||');
                if (!edgeMap[key]) edgeMap[key] = { from: relevant[i], to: relevant[j], factCount: 0, factIds: [] };
                edgeMap[key].factCount++;
                edgeMap[key].factIds.push(f.id);
            }
        }
    });

    return { topEntities, edges: Object.values(edgeMap), connectionCount };
}

function circularLayout(entities: string[], width: number, height: number, connectionCount: Record<string, number>): NodePos[] {
    const cx = width / 2, cy = height / 2;
    const radius = Math.min(width, height) * 0.38;
    return entities.map((entity, i) => {
        const angle = (2 * Math.PI * i) / entities.length - Math.PI / 2;
        return { entity, x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle), connections: connectionCount[entity] || 0 };
    });
}

function entityColorHeuristic(name: string): string {
    const lower = name.toLowerCase();
    if (/inc\.|corp\.|llc|ltd|co\.|company|firm|bank|group/i.test(lower)) return '#a78bfa'; // violet - org
    if (/street|city|state|county|court|building|office|address|\d{5}/i.test(lower)) return '#4ade80'; // green - location
    if (/\d{4}[-/]\d{2}|\bjan\b|\bfeb\b|\bmar\b|\bapr\b|\bmay\b|\bjun\b|\bjul\b|\baug\b|\bsep\b|\boct\b|\bnov\b|\bdec\b/i.test(lower)) return '#fbbf24'; // amber - date
    return '#3b82f6'; // blue - person/default
}

// ============================================================
//  SUB-COMPONENTS
// ============================================================

// --- Animated Counter ---
const AnimatedCounter: React.FC<{ target: number; duration?: number; suffix?: string }> = ({ target, duration = 1500, suffix = '' }) => {
    const [val, setVal] = useState(0);
    const ref = useRef<number | null>(null);
    useEffect(() => {
        const start = performance.now();
        const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setVal(Math.round(eased * target));
            if (progress < 1) ref.current = requestAnimationFrame(animate);
        };
        ref.current = requestAnimationFrame(animate);
        return () => { if (ref.current) cancelAnimationFrame(ref.current); };
    }, [target, duration]);
    return <span>{val}{suffix}</span>;
};

// --- Stat Card ---
const StatCard: React.FC<{ label: string; value: number | string; accent: string; icon: React.ReactNode; delay: string; isText?: boolean }> = ({ label, value, accent, icon, delay, isText }) => (
    <div className={`fade-in ${delay} relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm p-5`}>
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: accent }} />
        <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${accent}18` }}>
                <div style={{ color: accent }}>{icon}</div>
            </div>
        </div>
        <div className="text-2xl font-bold text-slate-900">
            {isText ? value : <AnimatedCounter target={value as number} />}
        </div>
        <div className="text-xs mt-1 text-slate-500">{label}</div>
    </div>
);

// --- Entity Relationship Graph ---
const EntityGraph: React.FC<{ entities: string[]; facts: InvestigationFact[] }> = ({ entities, facts }) => {
    const [hovered, setHovered] = useState<string | null>(null);
    const width = 700, height = 420;

    if (!entities.length) return null;

    const { topEntities, edges, connectionCount } = buildGraph(entities, facts);
    const nodes = circularLayout(topEntities, width, height, connectionCount);
    const nodeMap: Record<string, NodePos> = {};
    nodes.forEach(n => { nodeMap[n.entity] = n; });

    const hoveredEdges = hovered ? new Set(edges.filter(e => e.from === hovered || e.to === hovered).flatMap(e => [e.from, e.to])) : null;

    return (
        <div className="fade-in fade-in-2 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Entity Relationship Graph</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-600">{topEntities.length} entities</span>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 420 }}>
                <rect width={width} height={height} fill="#f8fafc" />

                {/* Edges */}
                {edges.map((edge, i) => {
                    const from = nodeMap[edge.from], to = nodeMap[edge.to];
                    if (!from || !to) return null;
                    const dimmed = hovered && !(hoveredEdges?.has(edge.from) && hoveredEdges?.has(edge.to));
                    const baseOpacity = Math.min(0.3 + edge.factCount * 0.15, 0.9);
                    return (
                        <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                            stroke="#cbd5e1" strokeWidth={Math.min(1 + edge.factCount * 0.5, 3)}
                            strokeDasharray="4,4" opacity={dimmed ? 0.08 : baseOpacity}
                            style={{ transition: 'opacity 0.3s' }} />
                    );
                })}

                {/* Nodes */}
                {nodes.map((node) => {
                    const r = Math.min(18 + node.connections * 2, 28);
                    const color = entityColorHeuristic(node.entity);
                    const dimmed = hovered && hovered !== node.entity && !hoveredEdges?.has(node.entity);
                    return (
                        <g key={node.entity}
                            onMouseEnter={() => setHovered(node.entity)}
                            onMouseLeave={() => setHovered(null)}
                            style={{ cursor: 'pointer', transition: 'opacity 0.3s', opacity: dimmed ? 0.15 : 1 }}>
                            {/* Circle */}
                            <circle cx={node.x} cy={node.y} r={r} fill={`${color}22`} stroke={color} strokeWidth="1.5" />
                            {/* Label */}
                            <text x={node.x} y={node.y + r + 14} textAnchor="middle"
                                fill="#334155" fontSize="9" fontWeight="500">
                                {node.entity.length > 18 ? node.entity.slice(0, 16) + '..' : node.entity}
                            </text>
                            {/* Short label inside */}
                            <text x={node.x} y={node.y + 3} textAnchor="middle"
                                fill={color} fontSize="8" fontWeight="700">
                                {node.entity.slice(0, 3).toUpperCase()}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

// --- Fact / Evidence Card ---
const FactCard: React.FC<{ fact: InvestigationFact }> = ({ fact }) => {
    const conf = fact.confidence ?? 0;
    const barColor = conf >= 0.7 ? '#4ade80' : conf >= 0.4 ? '#fbbf24' : '#f87171';
    return (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="flex">
                <div className="w-1 flex-shrink-0" style={{ background: barColor }} />
                <div className="p-3 flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-xs leading-relaxed text-slate-700">{fact.description}</p>
                        {fact.id && <span className="text-[9px] font-mono flex-shrink-0 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">#{fact.id}</span>}
                    </div>
                    {fact.source_quote && (
                        <p className="text-[11px] italic mt-1.5 leading-relaxed text-slate-500">"{fact.source_quote}"</p>
                    )}
                    {fact.entities && fact.entities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {fact.entities.map(e => (
                                <span key={e} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{e}</span>
                            ))}
                        </div>
                    )}
                    {/* Confidence bar */}
                    <div className="mt-2 h-1 rounded-full overflow-hidden bg-slate-100">
                        <div className="h-full rounded-full transition-all" style={{ width: `${conf * 100}%`, background: barColor }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Timeline View ---
const TimelineView: React.FC<{ timeline: Record<string, any>[] }> = ({ timeline }) => {
    if (!timeline.length) return null;
    return (
        <div className="relative pl-6">
            {/* Center line */}
            <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-200" />
            {timeline.map((item, i) => (
                <div key={i} className="relative mb-4 last:mb-0">
                    {/* Dot */}
                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-blue-500 bg-white" />
                    {/* Card */}
                    <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-3">
                        {(item.date || item.time) && (
                            <div className="text-[10px] font-mono mb-1 text-blue-600">{item.date || item.time}</div>
                        )}
                        <p className="text-xs leading-relaxed text-slate-700">{item.event || item.description || JSON.stringify(item)}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- Conflict Card ---
const ConflictCard: React.FC<{ conflict: InvestigationConflict }> = ({ conflict }) => {
    const resolved = /resolved/i.test(conflict.resolution_status || '');
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-xs leading-relaxed text-slate-700">{conflict.description}</p>
                <span className={`text-[9px] font-bold uppercase tracking-wider flex-shrink-0 px-2 py-0.5 rounded ${resolved ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {resolved ? 'RESOLVED' : 'UNRESOLVED'}
                </span>
            </div>
            {conflict.conflicting_fact_ids?.length > 0 && (
                <div className="flex gap-1 mt-2">
                    {conflict.conflicting_fact_ids.map(id => (
                        <span key={id} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">#{id}</span>
                    ))}
                </div>
            )}
            {conflict.resolution_note && (
                <p className="text-[11px] mt-2 italic text-slate-500">{conflict.resolution_note}</p>
            )}
        </div>
    );
};

// --- Risk Card ---
const RiskCard: React.FC<{ risk: Record<string, any>; index: number }> = ({ risk, index }) => {
    const severity = (risk.severity || risk.level || risk.threat_level || '').toString().toLowerCase();
    const severityPercent = severity === 'critical' ? 100 : severity === 'high' ? 75 : severity === 'medium' ? 50 : 25;
    const barColor = severityPercent >= 75 ? '#f87171' : severityPercent >= 50 ? '#fbbf24' : '#4ade80';
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs leading-relaxed mb-2 text-slate-700">{risk.description || risk.risk || `Risk #${index + 1}`}</p>
            {/* Severity bar */}
            <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full overflow-hidden bg-slate-100">
                    <div className="h-full rounded-full transition-all" style={{ width: `${severityPercent}%`, background: barColor }} />
                </div>
                {severity && <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: barColor }}>{severity}</span>}
            </div>
            {risk.mitigation && <p className="text-[11px] mt-2 italic text-slate-500">{risk.mitigation}</p>}
        </div>
    );
};

// --- Progress Log (loading feed) ---
const ProgressLog: React.FC<{ label: string; step: string }> = ({ label, step }) => {
    const { t } = useTranslation();
    const [lines, setLines] = useState<string[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (label) {
            setLines(prev => {
                const ts = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const stepLabel = step ? t(`portal.investigator.pipeline.${step}`) : '';
                const next = [...prev, `[${ts}] ${stepLabel ? `[${stepLabel}] ` : ''}${label}`];
                return next.slice(-12);
            });
        }
    }, [label, step, t]);

    useEffect(() => {
        if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }, [lines]);

    return (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-3 py-1.5 border-b border-slate-200 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-xs font-medium uppercase tracking-wider text-slate-600">Progress Log</span>
            </div>
            <div ref={containerRef} className="p-3 max-h-40 overflow-y-auto font-mono text-xs leading-relaxed text-slate-600">
                {lines.map((line, i) => <div key={i}>{line}</div>)}
            </div>
        </div>
    );
};

// --- Empty State ---
const EmptyState: React.FC<{ onRun: () => void; loadingHistory: boolean }> = ({ onRun, loadingHistory }) => {
    const { t } = useTranslation();
    return (
    <div className="flex flex-col items-center justify-center h-full py-24 px-6 bg-slate-50">
        <div className="max-w-sm text-center">
            {/* Search Icon */}
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-2">{t('portal.investigator.awaitingOrders')}</h3>
            <p className="text-sm leading-relaxed text-slate-500 mb-6">
                {t('portal.investigator.initialDescription')}
            </p>
            {loadingHistory ? (
                <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                    <SpinnerIcon /> Loading previous reports...
                </div>
            ) : (
                <button onClick={onRun}
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                    <PlayIcon /> {t('portal.investigator.initiate')}
                </button>
            )}
        </div>
    </div>
    );
};

// ============================================================
//  MAIN COMPONENT
// ============================================================

interface CaseContextType {
    caseData: Case;
    setCaseData: React.Dispatch<React.SetStateAction<Case | null>>;
}

const POLL_INTERVAL_MS = 2000;

const InvestigatorAgent: React.FC = () => {
    const { t } = useTranslation();
    const { caseData } = useOutletContext<CaseContextType>();
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Structured data
    const [structuredData, setStructuredData] = useState<InvestigationStructuredData | null>(null);
    const [stats, setStats] = useState<InvestigationStats | null>(null);

    // View mode
    const [viewMode, setViewMode] = useState<'dashboard' | 'report'>('dashboard');

    // Progress
    const [activeStep, setActiveStep] = useState('');
    const [progressLabel, setProgressLabel] = useState('');
    const [progressPercent, setProgressPercent] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

    // Focus
    const [focusText, setFocusText] = useState('');
    const [showFocus, setShowFocus] = useState(false);

    // History
    const [reportHistory, setReportHistory] = useState<InvestigationReport[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

    // Evidence cards pagination
    const FACTS_PER_PAGE = 6;
    const [factsPage, setFactsPage] = useState(0);

    // Background job polling
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    const applyJobProgress = useCallback((data: InvestigationJobStatus) => {
        setActiveStep(data.currentStep || '');
        setProgressLabel(data.progressLabel || 'Processing...');
        setProgressPercent(data.progress || 0);
        setCompletedSteps(() => {
            const next = new Set<string>();
            const idx = PIPELINE_STEPS.findIndex(s => s.key === data.currentStep);
            for (let i = 0; i < idx; i++) next.add(PIPELINE_STEPS[i].key);
            return next;
        });
    }, []);

    const startPolling = useCallback((jobId: string) => {
        stopPolling();
        setLoading(true);

        pollRef.current = setInterval(async () => {
            try {
                const data = await caseService.getInvestigationStatus(jobId);

                if (data.status === 'running') {
                    applyJobProgress(data);
                } else if (data.status === 'completed') {
                    stopPolling();
                    sessionStorage.removeItem(`investigation_job_${caseData._id}`);
                    setProgressPercent(100);
                    setProgressLabel(t('portal.investigator.status.completed'));
                    setCompletedSteps(new Set(PIPELINE_STEPS.map(s => s.key)));
                    if (data.structuredData) setStructuredData(data.structuredData);
                    if (data.stats) setStats(data.stats);
                    setTimeout(() => {
                        setReport(data.finalReport || null);
                        setLoading(false);
                        loadReportHistory();
                    }, 600);
                } else if (data.status === 'error') {
                    stopPolling();
                    sessionStorage.removeItem(`investigation_job_${caseData._id}`);
                    setError(data.error || t('portal.investigator.status.error'));
                    setLoading(false);
                }
            } catch (err) {
                console.error('Polling error:', err);
                // Don't stop polling on transient network errors — retry next interval
            }
        }, POLL_INTERVAL_MS);
    }, [caseData?._id, stopPolling, applyJobProgress, t]);

    // On mount: load history + check for an active background job
    useEffect(() => {
        if (!caseData?._id) return;

        loadReportHistory();

        // Check sessionStorage for a running job first (instant)
        const savedJobId = sessionStorage.getItem(`investigation_job_${caseData._id}`);
        if (savedJobId) {
            setLoading(true);
            setProgressLabel('Resuming investigation...');
            startPolling(savedJobId);
            return () => stopPolling();
        }

        // Also check the server for any running job (covers browser refresh)
        const checkActiveJob = async () => {
            try {
                const result = await caseService.getActiveInvestigationJob(caseData._id);
                if (result.hasActiveJob && result.jobId) {
                    sessionStorage.setItem(`investigation_job_${caseData._id}`, result.jobId);
                    setLoading(true);
                    setProgressLabel(result.progressLabel || 'Investigation in progress...');
                    setProgressPercent(result.progress || 0);
                    setActiveStep(result.currentStep || '');
                    startPolling(result.jobId);
                }
            } catch {
                // Silent — non-critical
            }
        };
        checkActiveJob();

        return () => stopPolling();
    }, [caseData?._id]);

    // Inject styles once
    useEffect(() => {
        if (document.getElementById('investigator-styles')) return;
        const style = document.createElement('style');
        style.id = 'investigator-styles';
        style.textContent = INVESTIGATOR_STYLES;
        document.head.appendChild(style);
    }, []);

    const loadReportHistory = async () => {
        setLoadingHistory(true);
        try {
            const reports = await caseService.getInvestigationReports(caseData._id);
            setReportHistory(reports);
            if (reports.length > 0 && !report) {
                setReport(reports[0].final_report);
                setSelectedReportId(reports[0]._id);
                if (reports[0].structured_data) setStructuredData(reports[0].structured_data);
                if (reports[0].metadata) setStats(reports[0].metadata);
            }
        } catch (err) {
            console.error("Failed to load report history", err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleRun = async () => {
        setLoading(true);
        setError(null);
        setReport(null);
        setStructuredData(null);
        setStats(null);
        setProgressPercent(0);
        setActiveStep('');
        setProgressLabel(t('portal.investigator.status.ready'));
        setCompletedSteps(new Set());
        setSelectedReportId(null);
        setFactsPage(0);

        const focusQuestions = focusText.split('\n').map(q => q.trim()).filter(Boolean);

        try {
            // Start as a background job on the server
            const { jobId } = await caseService.startInvestigationBackground(caseData._id, focusQuestions);

            // Persist jobId so we can resume if user navigates away & back
            sessionStorage.setItem(`investigation_job_${caseData._id}`, jobId);

            // Begin polling for progress
            startPolling(jobId);
        } catch (err: any) {
            setError(err.response?.data?.detail || t('portal.investigator.status.error'));
            setLoading(false);
        }
    };

    const handleSelectReport = (r: InvestigationReport) => {
        setReport(r.final_report);
        setSelectedReportId(r._id);
        setStructuredData(r.structured_data || null);
        setStats(r.metadata || null);
        setShowHistory(false);
        setFactsPage(0);
    };

    const printStyles = `
        @page { margin: 15mm 12mm; }
        body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; max-width: 900px; margin: 0 auto; padding: 0 20px; line-height: 1.7; color: #1a1a1a; font-size: 14px; }

        /* Header with logo */
        .print-header { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #7c3aed; padding-bottom: 16px; margin-bottom: 24px; }
        .print-header img { height: 40px; max-width: 140px; object-fit: contain; }
        .print-header .title { font-size: 1.4em; font-weight: 800; color: #1e1b4b; margin: 0; }
        .print-header .subtitle { font-size: 0.75em; color: #64748b; margin: 2px 0 0 0; }

        h1 { font-size: 1.5em; font-weight: 800; margin-bottom: 8px; }
        h2 { font-size: 1.2em; font-weight: 700; margin-top: 1.5em; padding: 8px 12px; border-left: 4px solid #7c3aed; background: #f5f3ff; }
        h3 { font-size: 1.05em; font-weight: 600; margin-top: 1.2em; }
        p { margin: 0.6em 0; text-align: justify; }
        ul, ol { padding-left: 24px; margin: 8px 0; }
        li { margin: 4px 0; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 0.9em; }
        th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
        th { background: #f8fafc; font-weight: 600; }
        blockquote { border-left: 3px solid #cbd5e1; padding-left: 16px; margin: 12px 0; color: #475569; font-style: italic; }

        /* Section header colored borders */
        .section-violet { border-left: 4px solid #8b5cf6; background: #f5f3ff; padding: 8px 12px; }
        .section-blue { border-left: 4px solid #3b82f6; background: #eff6ff; padding: 8px 12px; }
        .section-amber { border-left: 4px solid #f59e0b; background: #fffbeb; padding: 8px 12px; }
        .section-red { border-left: 4px solid #ef4444; background: #fef2f2; padding: 8px 12px; }
        .section-emerald { border-left: 4px solid #10b981; background: #ecfdf5; padding: 8px 12px; }
        .section-cyan { border-left: 4px solid #06b6d4; background: #ecfeff; padding: 8px 12px; }
        .section-orange { border-left: 4px solid #f97316; background: #fff7ed; padding: 8px 12px; }

        /* Risk/severity badges */
        .badge-high, .badge-critical { background: #fee2e2; color: #b91c1c; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.75em; display: inline-block; }
        .badge-medium { background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.75em; display: inline-block; }
        .badge-low { background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.75em; display: inline-block; }

        /* Dashboard stats table */
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
        .stat-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; text-align: center; }
        .stat-box .stat-value { font-size: 1.5em; font-weight: 800; color: #1e1b4b; }
        .stat-box .stat-label { font-size: 0.75em; color: #64748b; margin-top: 2px; }

        /* Dashboard sections */
        .db-section { margin-top: 24px; page-break-inside: avoid; }
        .db-section-title { font-size: 1.1em; font-weight: 700; color: #1e1b4b; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px; }
        .db-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 8px; }
        .db-card .card-title { font-weight: 600; color: #1e1b4b; margin-bottom: 4px; }
        .db-card .card-text { font-size: 0.85em; color: #475569; }
        .db-card .card-meta { font-size: 0.75em; color: #94a3b8; margin-top: 4px; }

        /* Timeline */
        .timeline-item { display: flex; gap: 12px; margin-bottom: 12px; padding-left: 8px; border-left: 2px solid #e2e8f0; }
        .timeline-item .tl-date { font-size: 0.75em; font-weight: 600; color: #7c3aed; min-width: 90px; }
        .timeline-item .tl-desc { font-size: 0.85em; color: #334155; }

        /* Entity graph SVG */
        svg { max-width: 100%; height: auto; }

        /* Footer */
        .print-footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 0.7em; color: #94a3b8; text-align: center; }

        @media print { body { margin: 0; } .print-header { break-after: avoid; } .db-section { break-inside: avoid; } }
    `;

    const buildPrintHeader = (subtitle: string) => `
        <div class="print-header">
            <img src="${Logo}" alt="Logo" />
            <div>
                <div class="title">Legal Intelligence Report</div>
                <div class="subtitle">${subtitle}</div>
            </div>
        </div>
    `;

    const buildPrintFooter = () => `
        <div class="print-footer">
            Generated by AI Investigation Pipeline &bull; ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} &bull; Confidential
        </div>
    `;

    const handlePrint = () => {
        const contentEl = document.getElementById('investigator-print-content');
        if (!contentEl) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        // Clone content and strip the in-app gradient header bar (it has icons that render huge without Tailwind)
        const clone = contentEl.cloneNode(true) as HTMLElement;
        const gradientHeader = clone.querySelector('.from-violet-600');
        if (gradientHeader) {
            gradientHeader.parentElement?.removeChild(gradientHeader);
        }

        const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const reportIdStr = selectedReportId ? ` | Report #${selectedReportId.slice(-8)}` : '';

        printWindow.document.write(`<!DOCTYPE html>
            <html><head><title>Legal Intelligence Report</title>
            <style>${printStyles}</style></head>
            <body>
                ${buildPrintHeader(`${reportDate}${reportIdStr}`)}
                ${clone.innerHTML}
                ${buildPrintFooter()}
            </body></html>`);
        printWindow.document.close();
        printWindow.print();
    };

    const handlePrintDashboard = () => {
        if (!structuredData && !stats) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const reportIdStr = selectedReportId ? ` | Report #${selectedReportId.slice(-8)}` : '';

        // Build stats section
        let statsHtml = '';
        if (stats) {
            statsHtml = `<div class="stats-grid">
                <div class="stat-box"><div class="stat-value">${stats.document_count ?? 0}</div><div class="stat-label">Documents Analyzed</div></div>
                <div class="stat-box"><div class="stat-value">${stats.fact_count ?? 0}</div><div class="stat-label">Facts Extracted</div></div>
                <div class="stat-box"><div class="stat-value">${stats.entity_count ?? 0}</div><div class="stat-label">Entities Found</div></div>
                <div class="stat-box"><div class="stat-value">${stats.conflict_count ?? 0}</div><div class="stat-label">Conflicts</div></div>
                <div class="stat-box"><div class="stat-value"><span class="badge-${(stats.overall_risk_level || 'low').toLowerCase()}">${stats.overall_risk_level || 'N/A'}</span></div><div class="stat-label">Risk Level</div></div>
            </div>`;
        }

        // Entity graph SVG — find the large graph SVG (viewBox="0 0 700 420"), not small icon SVGs
        let graphHtml = '';
        const graphSvg = document.querySelector('#investigator-print-content svg[viewBox="0 0 700 420"]');
        if (graphSvg) {
            graphHtml = `<div class="db-section">
                <div class="db-section-title">Entity Relationship Graph</div>
                ${graphSvg.outerHTML}
            </div>`;
        }

        // Evidence/Facts
        let factsHtml = '';
        if (structuredData && structuredData.facts.length > 0) {
            const factCards = structuredData.facts.map(f =>
                `<div class="db-card">
                    <div class="card-title">${f.description || f.id}</div>
                    ${f.source_doc_id ? `<div class="card-meta">Source: ${f.source_doc_id}</div>` : ''}
                    ${f.confidence ? `<div class="card-meta">Confidence: ${(f.confidence * 100).toFixed(0)}%</div>` : ''}
                </div>`
            ).join('');
            factsHtml = `<div class="db-section">
                <div class="db-section-title">Evidence Cards (${structuredData.facts.length} facts)</div>
                ${factCards}
            </div>`;
        }

        // Timeline
        let timelineHtml = '';
        if (structuredData && structuredData.timeline.length > 0) {
            const items = structuredData.timeline.map(t =>
                `<div class="timeline-item">
                    <div class="tl-date">${t.date || ''}</div>
                    <div class="tl-desc">${t.event || t.description || ''}</div>
                </div>`
            ).join('');
            timelineHtml = `<div class="db-section">
                <div class="db-section-title">Timeline (${structuredData.timeline.length} events)</div>
                ${items}
            </div>`;
        }

        // Conflicts
        let conflictsHtml = '';
        if (structuredData && structuredData.conflicts.length > 0) {
            const cards = structuredData.conflicts.map(c =>
                `<div class="db-card">
                    <div class="card-title">${c.description || 'Conflict'}</div>
                    ${c.resolution_status ? `<div class="card-meta">Status: ${c.resolution_status}</div>` : ''}
                    ${c.resolution_note ? `<div class="card-text" style="margin-top:4px">${c.resolution_note}</div>` : ''}
                </div>`
            ).join('');
            conflictsHtml = `<div class="db-section">
                <div class="db-section-title">Conflicts (${structuredData.conflicts.length})</div>
                ${cards}
            </div>`;
        }

        // Risks
        let risksHtml = '';
        if (structuredData && structuredData.risks.length > 0) {
            const cards = structuredData.risks.map(r =>
                `<div class="db-card">
                    <div class="card-title">${r.description || r.title || 'Risk'}</div>
                    ${r.severity ? `<div class="card-meta">Severity: <span class="badge-${r.severity.toLowerCase()}">${r.severity}</span></div>` : ''}
                    ${r.mitigation ? `<div class="card-text" style="margin-top:4px"><strong>Mitigation:</strong> ${r.mitigation}</div>` : ''}
                </div>`
            ).join('');
            risksHtml = `<div class="db-section">
                <div class="db-section-title">Risk Assessment (${structuredData.risks.length})</div>
                ${cards}
            </div>`;
        }

        printWindow.document.write(`<!DOCTYPE html>
            <html><head><title>Intelligence Board</title>
            <style>${printStyles}</style></head>
            <body>
                ${buildPrintHeader(`Intelligence Board &bull; ${reportDate}${reportIdStr}`)}
                ${statsHtml}
                ${graphHtml}
                ${factsHtml}
                ${timelineHtml}
                ${conflictsHtml}
                ${risksHtml}
                ${buildPrintFooter()}
            </body></html>`);
        printWindow.document.close();
        printWindow.print();
    };

    const fmtDate = (d: string) => {
        try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
        catch { return d; }
    };

    const getStepStatus = (key: string) => {
        if (completedSteps.has(key)) return 'done';
        if (activeStep === key) return 'active';
        return 'pending';
    };

    const riskLevelColor = (level: string) => {
        const l = level?.toUpperCase();
        if (l === 'CRITICAL') return '#f87171';
        if (l === 'HIGH') return '#f87171';
        if (l === 'MEDIUM') return '#fbbf24';
        return '#4ade80';
    };

    const hasIntelData = structuredData && (
        structuredData.entities.length > 0 ||
        structuredData.facts.length > 0 ||
        structuredData.timeline.length > 0
    );

    // ============================================================
    //  RENDER
    // ============================================================
    return (
        <div className="flex flex-col h-full">
            {/* ===== HEADER ===== */}
            <div className="border-b border-slate-200 bg-white px-6 py-4 space-y-3">
                {/* Top Row */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm text-white"
                            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                            <FileSearchIcon />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">{t('portal.investigator.title')}</h2>
                            <p className="text-xs text-slate-500">{t('portal.investigator.subtitle')}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* View Toggle */}
                        {report && !loading && (
                            <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => setViewMode('dashboard')}
                                    className={`px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:text-slate-700'}`}>
                                    {t('portal.investigator.intelBoard')}
                                </button>
                                <button
                                    onClick={() => setViewMode('report')}
                                    className={`px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === 'report' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:text-slate-700'}`}>
                                    {t('portal.investigator.report')}
                                </button>
                            </div>
                        )}

                        {/* History */}
                        {reportHistory.length > 0 && (
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-slate-600 bg-slate-100 hover:bg-slate-200">
                                <ClockIcon />
                                <span className="hidden sm:inline">{t('portal.investigator.history')}</span>
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                                    {reportHistory.length}
                                </span>
                                {showHistory ? <ChevronUpIcon /> : <ChevronDownIcon />}
                            </button>
                        )}

                        {/* Print */}
                        {report && !loading && (
                            <button onClick={viewMode === 'report' ? handlePrint : handlePrintDashboard}
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                title={viewMode === 'report' ? 'Print report' : 'Print intelligence board'}>
                                <PrintIcon />
                            </button>
                        )}

                        {/* Run Button */}
                        {!loading ? (
                            <button onClick={handleRun}
                                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg shadow-sm transition-all bg-blue-600 hover:bg-blue-700 text-white">
                                <PlayIcon /> {t('portal.investigator.runInvestigation')}
                            </button>
                        ) : (
                            <button disabled className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg cursor-not-allowed bg-blue-50 text-blue-600">
                                <SpinnerIcon /> {t('portal.investigator.status.running')}...
                            </button>
                        )}
                    </div>
                </div>

                {/* Focus Questions */}
                <div>
                    <button onClick={() => setShowFocus(!showFocus)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors text-blue-600">
                        <TargetIcon />
                        {showFocus ? t('portal.investigator.hideFocus') : t('portal.investigator.addFocus')}
                        {showFocus ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    </button>
                    {showFocus && (
                        <div className="mt-2 relative">
                            <textarea
                                value={focusText}
                                onChange={(e) => setFocusText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                        setShowFocus(false);
                                        (e.target as HTMLTextAreaElement).blur();
                                    }
                                }}
                                placeholder={"Enter questions to focus the investigation (one per line):\n\u2022 Was there a breach of contract?\n\u2022 What are the payment discrepancies?"}
                                className="w-full rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 border border-slate-200 text-slate-700 placeholder-slate-400"
                                rows={3}
                            />
                        </div>
                    )}
                </div>

                {/* History Dropdown */}
                {showHistory && reportHistory.length > 0 && (
                    <div className="rounded-lg shadow-sm max-h-56 overflow-y-auto divide-y bg-white border border-slate-200">
                        {reportHistory.map((r) => (
                            <button key={r._id} onClick={() => handleSelectReport(r)}
                                className="w-full text-left px-4 py-3 transition-colors hover:bg-slate-50"
                                style={{
                                    borderLeft: selectedReportId === r._id ? '2px solid #3b82f6' : '2px solid transparent',
                                    background: selectedReportId === r._id ? '#eff6ff' : 'transparent',
                                }}>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ background: selectedReportId === r._id ? '#3b82f6' : '#94a3b8' }} />
                                        <span className="text-sm font-medium text-slate-700">{fmtDate(r.created_at)}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                                        <span>{r.metadata?.document_count || 0} docs</span>
                                        <span>{r.metadata?.fact_count || 0} facts</span>
                                        <span>{r.metadata?.revision_count || 0} revisions</span>
                                    </div>
                                </div>
                                {r.focus_questions && r.focus_questions.length > 0 && (
                                    <p className="text-[11px] mt-1 ml-4 truncate text-slate-400">
                                        Focus: {r.focus_questions.join(' | ')}
                                    </p>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ===== CONTENT ===== */}
            <div id="investigator-print-content" className="flex-1 overflow-y-auto bg-slate-50 p-6 space-y-6">
                {/* Error Banner */}
                {error && (
                    <div className="rounded-lg px-4 py-3 flex items-start gap-3 bg-red-50 border border-red-200">
                        <div className="mt-0.5 text-red-500"><AlertIcon /></div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-red-700">{t('portal.investigator.status.error')}</p>
                            <p className="text-sm mt-0.5 text-red-600">{error}</p>
                        </div>
                        <button onClick={() => setError(null)} className="text-lg leading-none text-red-500">&times;</button>
                    </div>
                )}

                {/* === LOADING STATE === */}
                {loading && (
                    <div className="max-w-3xl mx-auto space-y-6">
                        {/* Pipeline */}
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-slate-800">Investigation Pipeline</h3>
                                <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">{progressPercent}%</span>
                            </div>

                            {/* Step Grid */}
                            <svg viewBox="0 0 600 60" className="w-full mb-4">
                                {/* Connecting lines */}
                                {PIPELINE_STEPS.map((_, i) => {
                                    if (i === 0) return null;
                                    const x1 = (i - 1) * (600 / (PIPELINE_STEPS.length - 1));
                                    const x2 = i * (600 / (PIPELINE_STEPS.length - 1));
                                    const s1 = getStepStatus(PIPELINE_STEPS[i - 1].key);
                                    const s2 = getStepStatus(PIPELINE_STEPS[i].key);
                                    const done = s1 === 'done' && (s2 === 'done' || s2 === 'active');
                                    return (
                                        <line key={i} x1={x1} y1={20} x2={x2} y2={20}
                                            stroke={done ? '#4ade80' : '#e2e8f0'}
                                            strokeWidth="1.5" strokeDasharray={done ? 'none' : '4,4'} />
                                    );
                                })}
                                {/* Nodes */}
                                {PIPELINE_STEPS.map((step, i) => {
                                    const x = i * (600 / (PIPELINE_STEPS.length - 1));
                                    const status = getStepStatus(step.key);
                                    const color = status === 'done' ? '#4ade80' : status === 'active' ? '#3b82f6' : '#cbd5e1';
                                    const textColor = status === 'pending' ? '#94a3b8' : '#334155';
                                    return (
                                        <g key={step.key}>
                                            <circle cx={x} cy={20} r={6} fill={status === 'pending' ? '#f8fafc' : `${color}33`} stroke={color} strokeWidth="1.5" />
                                            {status === 'done' && <circle cx={x} cy={20} r={2.5} fill={color} />}
                                            <text x={x} y={48} textAnchor="middle" fill={textColor} fontSize="8" fontFamily="monospace" fontWeight="500">
                                                {t(`portal.investigator.pipeline.${step.key}`)}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>
                        </div>

                        {/* Progress Log */}
                        <ProgressLog label={progressLabel} step={activeStep} />

                        {/* Status */}
                        <div className="text-center space-y-2">
                            <p className="text-sm font-medium text-slate-700">{progressLabel}</p>
                            <p className="text-xs text-slate-500">
                                Analyzing documents, extracting evidence, and generating a comprehensive intelligence report.
                            </p>
                        </div>
                    </div>
                )}

                {/* === DASHBOARD VIEW === */}
                {!loading && report && viewMode === 'dashboard' && (
                    <div className="max-w-6xl mx-auto space-y-6">
                        {/* Stats Dashboard */}
                        {stats && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                <StatCard label="Documents Analyzed" value={stats.document_count} accent="#a78bfa" delay="fade-in-1" icon={
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                } />
                                <StatCard label="Facts Extracted" value={stats.fact_count} accent="#3b82f6" delay="fade-in-1" icon={
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
                                } />
                                <StatCard label="Entities Found" value={stats.entity_count} accent="#4ade80" delay="fade-in-2" icon={
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                } />
                                <StatCard label="Conflicts" value={stats.conflict_count} accent="#fbbf24" delay="fade-in-3" icon={
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                } />
                                <StatCard label="Risk Level" value={stats.overall_risk_level} accent={riskLevelColor(stats.overall_risk_level)} delay="fade-in-4" isText icon={
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                } />
                            </div>
                        )}

                        {/* Entity Graph */}
                        {hasIntelData && structuredData && (
                            <EntityGraph entities={structuredData.entities} facts={structuredData.facts} />
                        )}

                        {/* Evidence + Timeline Row */}
                        {structuredData && (structuredData.facts.length > 0 || structuredData.timeline.length > 0) && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Evidence Cards */}
                                {structuredData.facts.length > 0 && (
                                    <div className="fade-in fade-in-3 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-slate-800">Evidence Cards</h3>
                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-600">
                                                {structuredData.facts.length} facts
                                            </span>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            {structuredData.facts.slice(factsPage * FACTS_PER_PAGE, (factsPage + 1) * FACTS_PER_PAGE).map((fact, i) => (
                                                <FactCard key={fact.id || i} fact={fact} />
                                            ))}
                                        </div>
                                        {structuredData.facts.length > FACTS_PER_PAGE && (() => {
                                            const totalPages = Math.ceil(structuredData.facts.length / FACTS_PER_PAGE);
                                            return (
                                                <div className="flex items-center justify-center gap-3 py-2.5 border-t border-slate-100 bg-slate-50">
                                                    <button onClick={() => setFactsPage(p => p - 1)} disabled={factsPage === 0}
                                                        className="px-2 py-1 rounded text-xs font-semibold transition-colors disabled:opacity-30 text-blue-600 hover:bg-blue-50">
                                                        &#8592; Prev
                                                    </button>
                                                    <span className="text-[11px] font-mono text-slate-500">
                                                        Page {factsPage + 1} of {totalPages}
                                                    </span>
                                                    <button onClick={() => setFactsPage(p => p + 1)} disabled={factsPage >= totalPages - 1}
                                                        className="px-2 py-1 rounded text-xs font-semibold transition-colors disabled:opacity-30 text-blue-600 hover:bg-blue-50">
                                                        Next &#8594;
                                                    </button>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* Timeline */}
                                {structuredData.timeline.length > 0 && (
                                    <div className="fade-in fade-in-3 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-slate-800">Visual Timeline</h3>
                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-600">
                                                {structuredData.timeline.length} events
                                            </span>
                                        </div>
                                        <div className="p-4" style={{ maxHeight: 480, overflowY: 'auto' }}>
                                            <TimelineView timeline={structuredData.timeline} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Conflicts & Risks */}
                        {structuredData && (structuredData.conflicts.length > 0 || structuredData.risks.length > 0) && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 fade-in fade-in-4">
                                {/* Conflicts */}
                                {structuredData.conflicts.length > 0 && (
                                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-slate-800">Conflicts</h3>
                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                                                {structuredData.conflicts.length}
                                            </span>
                                        </div>
                                        <div className="p-4 space-y-3" style={{ maxHeight: 400, overflowY: 'auto' }}>
                                            {structuredData.conflicts.map((c, i) => <ConflictCard key={i} conflict={c} />)}
                                        </div>
                                    </div>
                                )}

                                {/* Risks */}
                                {structuredData.risks.length > 0 && (
                                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-slate-800">Risk Assessment</h3>
                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-50 text-red-700">
                                                {structuredData.risks.length}
                                            </span>
                                        </div>
                                        <div className="p-4 space-y-3" style={{ maxHeight: 400, overflowY: 'auto' }}>
                                            {structuredData.risks.map((r, i) => <RiskCard key={i} risk={r} index={i} />)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Fallback if no structured data */}
                        {!hasIntelData && (
                            <div className="text-center py-16">
                                <p className="text-sm text-slate-500">
                                    No structured intelligence data available for this report. Switch to the Report view for the full analysis.
                                </p>
                                <button onClick={() => setViewMode('report')}
                                    className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors">
                                    View Report
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* === REPORT VIEW === */}
                {!loading && report && viewMode === 'report' && (
                    <div className="print:p-0">
                        <div className="max-w-4xl mx-auto space-y-4">
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                {/* Report Header Bar */}
                                <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-5 print:bg-slate-800">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            </div>
                                            <div>
                                                <h3 className="text-white font-bold text-base">Legal Intelligence Report</h3>
                                                <p className="text-white/60 text-xs mt-0.5">Generated by AI Investigation Pipeline</p>
                                            </div>
                                        </div>
                                        {selectedReportId && (
                                            <span className="text-white/40 text-[10px] font-mono bg-white/10 px-2 py-1 rounded">#{selectedReportId.slice(-8)}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Report Body */}
                                <div className="px-8 py-8 print:px-4">
                                    <ReactMarkdown
                                        components={{
                                            h1: ({ children }) => (
                                                <h1 className="text-2xl font-extrabold text-slate-900 mb-2 mt-0 leading-tight">{children}</h1>
                                            ),
                                            h2: ({ children }) => {
                                                const text = String(children);
                                                let accent = 'border-violet-500 bg-violet-50 text-violet-900';
                                                let dot = 'bg-violet-500';
                                                if (/timeline/i.test(text)) { accent = 'border-blue-500 bg-blue-50 text-blue-900'; dot = 'bg-blue-500'; }
                                                else if (/contradiction|challenge/i.test(text)) { accent = 'border-amber-500 bg-amber-50 text-amber-900'; dot = 'bg-amber-500'; }
                                                else if (/missing|gap|evidence.*critical/i.test(text)) { accent = 'border-red-500 bg-red-50 text-red-900'; dot = 'bg-red-500'; }
                                                else if (/legal.*analysis/i.test(text)) { accent = 'border-indigo-500 bg-indigo-50 text-indigo-900'; dot = 'bg-indigo-500'; }
                                                else if (/strategic|assessment|recommendation/i.test(text)) { accent = 'border-emerald-500 bg-emerald-50 text-emerald-900'; dot = 'bg-emerald-500'; }
                                                else if (/parties|relationship/i.test(text)) { accent = 'border-cyan-500 bg-cyan-50 text-cyan-900'; dot = 'bg-cyan-500'; }
                                                else if (/fact|key/i.test(text)) { accent = 'border-orange-500 bg-orange-50 text-orange-900'; dot = 'bg-orange-500'; }
                                                else if (/overview/i.test(text)) { accent = 'border-slate-500 bg-slate-50 text-slate-900'; dot = 'bg-slate-500'; }
                                                return (
                                                    <div className={`mt-8 mb-4 -mx-8 px-8 py-3 border-l-4 ${accent} flex items-center gap-2.5`}>
                                                        <div className={`w-2 h-2 rounded-full ${dot} flex-shrink-0`} />
                                                        <h2 className="text-base font-bold m-0 leading-snug">{children}</h2>
                                                    </div>
                                                );
                                            },
                                            h3: ({ children }) => (
                                                <h3 className="text-sm font-bold text-slate-800 mt-5 mb-2 uppercase tracking-wide">{children}</h3>
                                            ),
                                            p: ({ children }) => (
                                                <p className="text-sm text-slate-600 leading-relaxed mb-3">{children}</p>
                                            ),
                                            strong: ({ children }) => {
                                                const text = String(children);
                                                if (/^HIGH\s*(RISK)?$/i.test(text.trim())) return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700">{children}</span>;
                                                if (/^MEDIUM$/i.test(text.trim())) return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-700">{children}</span>;
                                                if (/^LOW$/i.test(text.trim())) return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-green-100 text-green-700">{children}</span>;
                                                return <strong className="font-semibold text-slate-800">{children}</strong>;
                                            },
                                            table: ({ children }) => (
                                                <div className="my-4 overflow-x-auto rounded-lg border border-slate-200">
                                                    <table className="w-full text-sm border-collapse">{children}</table>
                                                </div>
                                            ),
                                            thead: ({ children }) => (
                                                <thead className="bg-slate-50">{children}</thead>
                                            ),
                                            th: ({ children }) => (
                                                <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 py-3 border-b border-slate-200">{children}</th>
                                            ),
                                            td: ({ children }) => (
                                                <td className="px-4 py-3 text-sm text-slate-600 border-b border-slate-100 align-top">{children}</td>
                                            ),
                                            tr: ({ children }) => (
                                                <tr className="hover:bg-slate-50/50 transition-colors">{children}</tr>
                                            ),
                                            ul: ({ children }) => (
                                                <ul className="space-y-1.5 my-3 ml-0 list-none">{children}</ul>
                                            ),
                                            ol: ({ children }) => (
                                                <ol className="space-y-2 my-3 ml-0 list-none counter-reset-item">{children}</ol>
                                            ),
                                            li: ({ children, ordered, index }: any) => (
                                                <li className="flex gap-2 text-sm text-slate-600 leading-relaxed">
                                                    <span className="mt-1.5 flex-shrink-0">
                                                        {ordered
                                                            ? <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center">{(index ?? 0) + 1}</span>
                                                            : <span className="w-1.5 h-1.5 rounded-full bg-slate-400 block mt-0.5" />
                                                        }
                                                    </span>
                                                    <span className="flex-1">{children}</span>
                                                </li>
                                            ),
                                            blockquote: ({ children }) => (
                                                <blockquote className="border-l-4 border-violet-300 bg-violet-50/40 rounded-r-lg px-4 py-3 my-4 text-sm text-violet-800 italic">{children}</blockquote>
                                            ),
                                            hr: () => (
                                                <div className="my-6 border-t border-slate-200" />
                                            ),
                                            em: ({ children }) => {
                                                const text = String(children);
                                                if (/importance:\s*high/i.test(text)) return <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded not-italic">{children}</span>;
                                                if (/importance:\s*medium/i.test(text)) return <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded not-italic">{children}</span>;
                                                return <em className="text-slate-500">{children}</em>;
                                            },
                                            code: ({ children }) => (
                                                <code className="text-xs font-semibold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-100">{children}</code>
                                            ),
                                        }}
                                    >
                                        {report}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* === EMPTY STATE === */}
                {!loading && !report && (
                    <EmptyState onRun={handleRun} loadingHistory={loadingHistory} />
                )}
            </div>
        </div>
    );
};

export default InvestigatorAgent;
