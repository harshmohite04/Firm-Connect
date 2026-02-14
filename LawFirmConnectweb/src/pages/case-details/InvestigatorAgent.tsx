import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import caseService from '../../services/caseService';
import type {
    Case,
    InvestigationReport,
    InvestigationProgressEvent,
    InvestigationStructuredData,
    InvestigationStats,
    InvestigationFact,
    InvestigationConflict,
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
//  INTEL BOARD CSS (injected once)
// ============================================================
const INTEL_STYLES = `
@keyframes nodePulse {
  0%, 100% { filter: drop-shadow(0 0 4px rgba(34,211,238,0.4)); }
  50% { filter: drop-shadow(0 0 12px rgba(34,211,238,0.8)); }
}
@keyframes dashFlow {
  to { stroke-dashoffset: -20; }
}
@keyframes scanline {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes sonarRing {
  0% { r: 8; opacity: 0.8; }
  100% { r: 80; opacity: 0; }
}
@keyframes radarSweep {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes intelFeedBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
.intel-fade-in { animation: fadeInUp 0.5s ease-out both; }
.intel-fade-in-1 { animation-delay: 0.1s; }
.intel-fade-in-2 { animation-delay: 0.2s; }
.intel-fade-in-3 { animation-delay: 0.3s; }
.intel-fade-in-4 { animation-delay: 0.4s; }
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
    return '#22d3ee'; // cyan - person/default
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
    <div className={`intel-fade-in ${delay} relative overflow-hidden rounded-xl border border-white/[0.06] p-5`}
        style={{ background: '#111827' }}>
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: accent }} />
        <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${accent}18` }}>
                <div style={{ color: accent }}>{icon}</div>
            </div>
        </div>
        <div className="font-mono text-2xl font-bold" style={{ color: '#e2e8f0' }}>
            {isText ? value : <AnimatedCounter target={value as number} />}
        </div>
        <div className="text-xs mt-1" style={{ color: '#94a3b8' }}>{label}</div>
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
        <div className="intel-fade-in intel-fade-in-2 rounded-xl border border-white/[0.06] overflow-hidden" style={{ background: '#111827' }}>
            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <h3 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Entity Relationship Graph</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ color: '#22d3ee', background: 'rgba(34,211,238,0.1)' }}>{topEntities.length} entities</span>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 420 }}>
                {/* Grid background */}
                <defs>
                    <pattern id="intelGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(34,211,238,0.03)" strokeWidth="0.5" />
                    </pattern>
                </defs>
                <rect width={width} height={height} fill="url(#intelGrid)" />

                {/* Edges */}
                {edges.map((edge, i) => {
                    const from = nodeMap[edge.from], to = nodeMap[edge.to];
                    if (!from || !to) return null;
                    const dimmed = hovered && !(hoveredEdges?.has(edge.from) && hoveredEdges?.has(edge.to));
                    const baseOpacity = Math.min(0.3 + edge.factCount * 0.15, 0.9);
                    return (
                        <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                            stroke="#22d3ee" strokeWidth={Math.min(1 + edge.factCount * 0.5, 3)}
                            strokeDasharray="4,4" opacity={dimmed ? 0.08 : baseOpacity}
                            style={{ animation: 'dashFlow 1.5s linear infinite', transition: 'opacity 0.3s' }} />
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
                            {/* Glow */}
                            <circle cx={node.x} cy={node.y} r={r + 4} fill="none" stroke={color} strokeWidth="1" opacity="0.3"
                                style={hovered === node.entity ? { animation: 'nodePulse 1.5s ease-in-out infinite' } : {}} />
                            {/* Circle */}
                            <circle cx={node.x} cy={node.y} r={r} fill={`${color}22`} stroke={color} strokeWidth="1.5" />
                            {/* Label */}
                            <text x={node.x} y={node.y + r + 14} textAnchor="middle"
                                fill="#e2e8f0" fontSize="9" fontFamily="monospace" fontWeight="500">
                                {node.entity.length > 18 ? node.entity.slice(0, 16) + '..' : node.entity}
                            </text>
                            {/* Short label inside */}
                            <text x={node.x} y={node.y + 3} textAnchor="middle"
                                fill={color} fontSize="8" fontFamily="monospace" fontWeight="700">
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
        <div className="rounded-lg border border-white/[0.06] overflow-hidden" style={{ background: '#1e293b' }}>
            <div className="flex">
                <div className="w-1 flex-shrink-0" style={{ background: barColor }} />
                <div className="p-3 flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-xs leading-relaxed" style={{ color: '#e2e8f0' }}>{fact.description}</p>
                        {fact.id && <span className="text-[9px] font-mono flex-shrink-0 px-1.5 py-0.5 rounded" style={{ color: '#94a3b8', background: 'rgba(148,163,184,0.1)' }}>#{fact.id}</span>}
                    </div>
                    {fact.source_quote && (
                        <p className="text-[11px] italic mt-1.5 leading-relaxed" style={{ color: '#94a3b8' }}>"{fact.source_quote}"</p>
                    )}
                    {fact.entities && fact.entities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {fact.entities.map(e => (
                                <span key={e} className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ color: '#22d3ee', background: 'rgba(34,211,238,0.1)' }}>{e}</span>
                            ))}
                        </div>
                    )}
                    {/* Confidence bar */}
                    <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
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
            <div className="absolute left-3 top-0 bottom-0 w-px" style={{ background: 'rgba(34,211,238,0.2)', borderLeft: '1px dashed rgba(34,211,238,0.3)' }} />
            {timeline.map((item, i) => (
                <div key={i} className="relative mb-4 last:mb-0">
                    {/* Dot */}
                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2" style={{ borderColor: '#22d3ee', background: '#0a0f1e' }} />
                    {/* Card */}
                    <div className="rounded-lg border border-white/[0.06] p-3" style={{ background: '#1e293b' }}>
                        {(item.date || item.time) && (
                            <div className="text-[10px] font-mono mb-1" style={{ color: '#22d3ee' }}>{item.date || item.time}</div>
                        )}
                        <p className="text-xs leading-relaxed" style={{ color: '#e2e8f0' }}>{item.event || item.description || JSON.stringify(item)}</p>
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
        <div className="rounded-lg border border-white/[0.06] p-4" style={{ background: '#1e293b' }}>
            <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-xs leading-relaxed" style={{ color: '#e2e8f0' }}>{conflict.description}</p>
                <span className="text-[9px] font-bold uppercase tracking-wider flex-shrink-0 px-2 py-0.5 rounded"
                    style={{ color: resolved ? '#4ade80' : '#f87171', background: resolved ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)' }}>
                    {resolved ? 'RESOLVED' : 'UNRESOLVED'}
                </span>
            </div>
            {conflict.conflicting_fact_ids?.length > 0 && (
                <div className="flex gap-1 mt-2">
                    {conflict.conflicting_fact_ids.map(id => (
                        <span key={id} className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.1)' }}>#{id}</span>
                    ))}
                </div>
            )}
            {conflict.resolution_note && (
                <p className="text-[11px] mt-2 italic" style={{ color: '#94a3b8' }}>{conflict.resolution_note}</p>
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
        <div className="rounded-lg border border-white/[0.06] p-4" style={{ background: '#1e293b' }}>
            <p className="text-xs leading-relaxed mb-2" style={{ color: '#e2e8f0' }}>{risk.description || risk.risk || `Risk #${index + 1}`}</p>
            {/* Severity bar */}
            <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${severityPercent}%`, background: barColor }} />
                </div>
                {severity && <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: barColor }}>{severity}</span>}
            </div>
            {risk.mitigation && <p className="text-[11px] mt-2 italic" style={{ color: '#94a3b8' }}>{risk.mitigation}</p>}
        </div>
    );
};

// --- Intel Feed (loading terminal) ---
const IntelFeed: React.FC<{ label: string; step: string }> = ({ label, step }) => {
    const [lines, setLines] = useState<string[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (label) {
            setLines(prev => {
                const ts = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const next = [...prev, `[${ts}] ${step ? `[${step}] ` : ''}${label}`];
                return next.slice(-12);
            });
        }
    }, [label, step]);

    useEffect(() => {
        if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }, [lines]);

    return (
        <div className="rounded-lg border border-white/[0.06] overflow-hidden" style={{ background: '#0a0f1e' }}>
            <div className="px-3 py-1.5 border-b border-white/[0.06] flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: '#4ade80' }} />
                <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: '#4ade80' }}>INTEL FEED</span>
            </div>
            <div ref={containerRef} className="p-3 max-h-40 overflow-y-auto font-mono text-[11px] leading-relaxed" style={{ color: '#4ade80' }}>
                {lines.map((line, i) => <div key={i}>{line}</div>)}
                <span style={{ animation: 'intelFeedBlink 1s infinite' }}>_</span>
            </div>
        </div>
    );
};

// --- Radar Empty State ---
const RadarEmpty: React.FC<{ onRun: () => void; loadingHistory: boolean }> = ({ onRun, loadingHistory }) => (
    <div className="flex flex-col items-center justify-center h-full py-24 px-6" style={{ background: '#0a0f1e' }}>
        <div className="max-w-sm text-center">
            {/* Radar SVG */}
            <svg width="160" height="160" viewBox="0 0 160 160" className="mx-auto mb-6">
                <circle cx="80" cy="80" r="60" fill="none" stroke="rgba(34,211,238,0.1)" strokeWidth="1" />
                <circle cx="80" cy="80" r="40" fill="none" stroke="rgba(34,211,238,0.08)" strokeWidth="1" />
                <circle cx="80" cy="80" r="20" fill="none" stroke="rgba(34,211,238,0.06)" strokeWidth="1" />
                {/* Sweep line */}
                <line x1="80" y1="80" x2="80" y2="20" stroke="rgba(34,211,238,0.5)" strokeWidth="1.5"
                    style={{ transformOrigin: '80px 80px', animation: 'radarSweep 3s linear infinite' }} />
                {/* Sonar rings */}
                <circle cx="80" cy="80" r="8" fill="none" stroke="#22d3ee" strokeWidth="1">
                    <animate attributeName="r" from="8" to="70" dur="2.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.6" to="0" dur="2.5s" repeatCount="indefinite" />
                </circle>
                <circle cx="80" cy="80" r="8" fill="none" stroke="#22d3ee" strokeWidth="1">
                    <animate attributeName="r" from="8" to="70" dur="2.5s" begin="1.25s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.6" to="0" dur="2.5s" begin="1.25s" repeatCount="indefinite" />
                </circle>
                {/* Center dot */}
                <circle cx="80" cy="80" r="3" fill="#22d3ee" />
            </svg>

            <h3 className="text-sm font-mono uppercase tracking-[0.2em] font-bold mb-3" style={{ color: '#e2e8f0' }}>AWAITING ORDERS</h3>
            <p className="text-xs leading-relaxed mb-6" style={{ color: '#94a3b8' }}>
                Initiate the investigator agent to analyze all case documents. The AI will extract facts, identify contradictions, assess risks, and produce a comprehensive intelligence report.
            </p>
            {loadingHistory ? (
                <div className="inline-flex items-center gap-2 text-xs" style={{ color: '#94a3b8' }}>
                    <SpinnerIcon /> Loading previous reports...
                </div>
            ) : (
                <button onClick={onRun}
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-mono font-bold uppercase tracking-wider rounded-lg transition-all hover:shadow-lg hover:shadow-cyan-500/20"
                    style={{ color: '#22d3ee', border: '1px solid rgba(34,211,238,0.4)', background: 'rgba(34,211,238,0.05)' }}>
                    <PlayIcon /> INITIATE OPERATION
                </button>
            )}
        </div>
    </div>
);

// ============================================================
//  MAIN COMPONENT
// ============================================================

interface CaseContextType {
    caseData: Case;
    setCaseData: React.Dispatch<React.SetStateAction<Case | null>>;
}

const InvestigatorAgent: React.FC = () => {
    const { caseData } = useOutletContext<CaseContextType>();
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Structured data
    const [structuredData, setStructuredData] = useState<InvestigationStructuredData | null>(null);
    const [stats, setStats] = useState<InvestigationStats | null>(null);

    // View mode
    const [viewMode, setViewMode] = useState<'intel' | 'report'>('intel');

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

    // Evidence cards expand
    const [showAllFacts, setShowAllFacts] = useState(false);

    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (caseData?._id) loadReportHistory();
        return () => { abortRef.current?.abort(); };
    }, [caseData?._id]);

    // Inject intel styles once
    useEffect(() => {
        if (document.getElementById('intel-board-styles')) return;
        const style = document.createElement('style');
        style.id = 'intel-board-styles';
        style.textContent = INTEL_STYLES;
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

    const handleRun = () => {
        setLoading(true);
        setError(null);
        setReport(null);
        setStructuredData(null);
        setStats(null);
        setProgressPercent(0);
        setActiveStep('');
        setProgressLabel('Initializing pipeline...');
        setCompletedSteps(new Set());
        setSelectedReportId(null);
        setShowAllFacts(false);

        const focusQuestions = focusText.split('\n').map(q => q.trim()).filter(Boolean);

        try {
            const controller = caseService.runInvestigationStream(
                caseData._id,
                focusQuestions,
                (event: InvestigationProgressEvent) => {
                    if (event.type === 'progress') {
                        setActiveStep(event.step || '');
                        setProgressLabel(event.label || 'Processing...');
                        setProgressPercent(event.progress || 0);
                        setCompletedSteps(prev => {
                            const next = new Set(prev);
                            const idx = PIPELINE_STEPS.findIndex(s => s.key === event.step);
                            for (let i = 0; i < idx; i++) next.add(PIPELINE_STEPS[i].key);
                            return next;
                        });
                    } else if (event.type === 'complete') {
                        setProgressPercent(100);
                        setProgressLabel('Investigation complete');
                        setCompletedSteps(new Set(PIPELINE_STEPS.map(s => s.key)));
                        if (event.structured_data) setStructuredData(event.structured_data);
                        if (event.stats) setStats(event.stats);
                        setTimeout(() => {
                            setReport(event.final_report || null);
                            setLoading(false);
                            loadReportHistory();
                        }, 600);
                    } else if (event.type === 'error') {
                        setError(event.detail || 'Investigation failed');
                        setLoading(false);
                    }
                },
                (errMsg: string) => {
                    setError(errMsg);
                    setLoading(false);
                }
            );
            abortRef.current = controller;
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to start investigation.");
            setLoading(false);
        }
    };

    const handleSelectReport = (r: InvestigationReport) => {
        setReport(r.final_report);
        setSelectedReportId(r._id);
        setStructuredData(r.structured_data || null);
        setStats(r.metadata || null);
        setShowHistory(false);
        setShowAllFacts(false);
    };

    const handlePrint = () => { window.print(); };

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
        <div className="flex flex-col h-full" style={{ background: viewMode === 'intel' && (report || loading) ? '#0a0f1e' : undefined }}>
            {/* ===== HEADER ===== */}
            <div className="border-b px-6 py-4 space-y-3"
                style={viewMode === 'intel' && (report || loading) ? { background: '#111827', borderColor: 'rgba(255,255,255,0.06)' } : { background: '#fff', borderColor: '#e2e8f0' }}>
                {/* Top Row */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                            style={viewMode === 'intel' && (report || loading)
                                ? { background: 'linear-gradient(135deg, #22d3ee, #a78bfa)' }
                                : { background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                            <FileSearchIcon />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold" style={{ color: viewMode === 'intel' && (report || loading) ? '#e2e8f0' : '#0f172a' }}>Investigator Agent</h2>
                            <p className="text-xs" style={{ color: viewMode === 'intel' && (report || loading) ? '#94a3b8' : '#94a3b8' }}>AI-powered multi-agent document analysis</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* View Toggle */}
                        {report && !loading && (
                            <div className="flex rounded-lg overflow-hidden border"
                                style={viewMode === 'intel' ? { borderColor: 'rgba(255,255,255,0.1)' } : { borderColor: '#e2e8f0' }}>
                                <button
                                    onClick={() => setViewMode('intel')}
                                    className="px-3 py-1.5 text-xs font-semibold transition-colors"
                                    style={viewMode === 'intel'
                                        ? { background: 'rgba(34,211,238,0.15)', color: '#22d3ee' }
                                        : { background: 'transparent', color: '#94a3b8' }}>
                                    Intelligence Board
                                </button>
                                <button
                                    onClick={() => setViewMode('report')}
                                    className="px-3 py-1.5 text-xs font-semibold transition-colors"
                                    style={viewMode === 'report'
                                        ? { background: '#8b5cf6', color: '#fff' }
                                        : { background: 'transparent', color: '#94a3b8' }}>
                                    Report
                                </button>
                            </div>
                        )}

                        {/* History */}
                        {reportHistory.length > 0 && (
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors"
                                style={viewMode === 'intel' && (report || loading)
                                    ? { color: '#94a3b8', background: 'rgba(255,255,255,0.05)' }
                                    : { color: '#475569', background: '#f1f5f9' }}>
                                <ClockIcon />
                                <span className="hidden sm:inline">History</span>
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                                    style={viewMode === 'intel' && (report || loading)
                                        ? { color: '#e2e8f0', background: 'rgba(255,255,255,0.1)' }
                                        : { color: '#334155', background: '#cbd5e1' }}>
                                    {reportHistory.length}
                                </span>
                                {showHistory ? <ChevronUpIcon /> : <ChevronDownIcon />}
                            </button>
                        )}

                        {/* Print */}
                        {report && !loading && viewMode === 'report' && (
                            <button onClick={handlePrint}
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                title="Print report">
                                <PrintIcon />
                            </button>
                        )}

                        {/* Run Button */}
                        {!loading ? (
                            <button onClick={handleRun}
                                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg shadow-sm transition-all"
                                style={viewMode === 'intel' && report
                                    ? { color: '#22d3ee', border: '1px solid rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.1)' }
                                    : { color: '#fff', background: 'linear-gradient(to right, #8b5cf6, #7c3aed)' }}>
                                <PlayIcon /> Run Investigation
                            </button>
                        ) : (
                            <button disabled className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg cursor-not-allowed"
                                style={viewMode === 'intel' ? { color: '#22d3ee', background: 'rgba(34,211,238,0.1)' } : { color: '#7c3aed', background: '#f5f3ff' }}>
                                <SpinnerIcon /> Running...
                            </button>
                        )}
                    </div>
                </div>

                {/* Focus Questions */}
                <div>
                    <button onClick={() => setShowFocus(!showFocus)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
                        style={{ color: viewMode === 'intel' && (report || loading) ? '#22d3ee' : '#7c3aed' }}>
                        <TargetIcon />
                        {showFocus ? 'Hide focus options' : 'Add investigation focus'}
                        {showFocus ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    </button>
                    {showFocus && (
                        <div className="mt-2 relative">
                            <textarea
                                value={focusText}
                                onChange={(e) => setFocusText(e.target.value)}
                                placeholder={"Enter questions to focus the investigation (one per line):\n\u2022 Was there a breach of contract?\n\u2022 What are the payment discrepancies?"}
                                className="w-full rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2"
                                style={viewMode === 'intel' && (report || loading)
                                    ? { background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.2)', color: '#e2e8f0' }
                                    : { background: '#f5f3ff', border: '1px solid #ddd6fe', color: '#334155' }}
                                rows={3}
                            />
                        </div>
                    )}
                </div>

                {/* History Dropdown */}
                {showHistory && reportHistory.length > 0 && (
                    <div className="rounded-lg shadow-sm max-h-56 overflow-y-auto divide-y"
                        style={viewMode === 'intel' && (report || loading)
                            ? { background: '#1e293b', borderColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }
                            : { background: '#fff', border: '1px solid #e2e8f0' }}>
                        {reportHistory.map((r) => (
                            <button key={r._id} onClick={() => handleSelectReport(r)}
                                className="w-full text-left px-4 py-3 transition-colors"
                                style={{
                                    borderLeft: selectedReportId === r._id ? '2px solid #8b5cf6' : '2px solid transparent',
                                    background: selectedReportId === r._id
                                        ? (viewMode === 'intel' ? 'rgba(139,92,246,0.1)' : '#f5f3ff')
                                        : 'transparent',
                                }}>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ background: selectedReportId === r._id ? '#8b5cf6' : '#94a3b8' }} />
                                        <span className="text-sm font-medium" style={{ color: viewMode === 'intel' && (report || loading) ? '#e2e8f0' : '#334155' }}>{fmtDate(r.created_at)}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px]" style={{ color: '#94a3b8' }}>
                                        <span>{r.metadata?.document_count || 0} docs</span>
                                        <span>{r.metadata?.fact_count || 0} facts</span>
                                        <span>{r.metadata?.revision_count || 0} revisions</span>
                                    </div>
                                </div>
                                {r.focus_questions && r.focus_questions.length > 0 && (
                                    <p className="text-[11px] mt-1 ml-4 truncate" style={{ color: '#94a3b8' }}>
                                        Focus: {r.focus_questions.join(' | ')}
                                    </p>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ===== CONTENT ===== */}
            <div className="flex-1 overflow-y-auto" style={{ background: viewMode === 'intel' && (report || loading || (!loading && !report)) ? '#0a0f1e' : '#f8fafc' }}>
                {/* Error Banner */}
                {error && (
                    <div className="mx-6 mt-4 rounded-lg px-4 py-3 flex items-start gap-3"
                        style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
                        <div className="mt-0.5" style={{ color: '#f87171' }}><AlertIcon /></div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold" style={{ color: '#f87171' }}>Investigation Failed</p>
                            <p className="text-sm mt-0.5" style={{ color: '#fca5a5' }}>{error}</p>
                        </div>
                        <button onClick={() => setError(null)} className="text-lg leading-none" style={{ color: '#f87171' }}>&times;</button>
                    </div>
                )}

                {/* === LOADING STATE === */}
                {loading && (
                    <div className="px-6 py-8">
                        <div className="max-w-3xl mx-auto space-y-6">
                            {/* Pipeline Constellation */}
                            <div className="rounded-xl border p-6" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.06)' }}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Investigation Pipeline</h3>
                                    <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-full" style={{ color: '#22d3ee', background: 'rgba(34,211,238,0.1)' }}>{progressPercent}%</span>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full rounded-full h-2 mb-6 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                    <div className="h-2 rounded-full transition-all duration-700 ease-out"
                                        style={{ width: `${progressPercent}%`, background: 'linear-gradient(to right, #22d3ee, #4ade80)' }} />
                                </div>

                                {/* Step Grid (constellation style) */}
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
                                                stroke={done ? '#4ade80' : 'rgba(148,163,184,0.2)'}
                                                strokeWidth="1.5" strokeDasharray={done ? 'none' : '4,4'}
                                                style={!done ? { animation: 'dashFlow 1.5s linear infinite' } : {}} />
                                        );
                                    })}
                                    {/* Nodes */}
                                    {PIPELINE_STEPS.map((step, i) => {
                                        const x = i * (600 / (PIPELINE_STEPS.length - 1));
                                        const status = getStepStatus(step.key);
                                        const color = status === 'done' ? '#4ade80' : status === 'active' ? '#22d3ee' : '#475569';
                                        return (
                                            <g key={step.key}>
                                                {status === 'active' && (
                                                    <circle cx={x} cy={20} r={12} fill="none" stroke="#22d3ee" strokeWidth="1" opacity="0.3"
                                                        style={{ animation: 'nodePulse 1.5s ease-in-out infinite' }} />
                                                )}
                                                <circle cx={x} cy={20} r={6} fill={status === 'pending' ? '#1e293b' : `${color}33`} stroke={color} strokeWidth="1.5" />
                                                {status === 'done' && <circle cx={x} cy={20} r={2.5} fill={color} />}
                                                <text x={x} y={48} textAnchor="middle" fill={color} fontSize="8" fontFamily="monospace" fontWeight="500">
                                                    {step.short}
                                                </text>
                                            </g>
                                        );
                                    })}
                                </svg>
                            </div>

                            {/* Intel Feed */}
                            <IntelFeed label={progressLabel} step={activeStep} />

                            {/* Status */}
                            <div className="text-center space-y-2">
                                <p className="text-sm font-medium" style={{ color: '#e2e8f0' }}>{progressLabel}</p>
                                <p className="text-xs" style={{ color: '#94a3b8' }}>
                                    Analyzing documents, extracting evidence, and generating a comprehensive intelligence report.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* === INTEL BOARD VIEW === */}
                {!loading && report && viewMode === 'intel' && (
                    <div className="p-6">
                        <div className="max-w-6xl mx-auto space-y-6">
                            {/* Scanline overlay */}
                            <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" style={{ opacity: 0.02 }}>
                                <div className="w-full h-1" style={{ background: 'rgba(34,211,238,0.5)', animation: 'scanline 8s linear infinite' }} />
                            </div>

                            {/* Stats Dashboard */}
                            {stats && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                    <StatCard label="Documents Analyzed" value={stats.document_count} accent="#a78bfa" delay="intel-fade-in-1" icon={
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    } />
                                    <StatCard label="Facts Extracted" value={stats.fact_count} accent="#22d3ee" delay="intel-fade-in-1" icon={
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
                                    } />
                                    <StatCard label="Entities Found" value={stats.entity_count} accent="#4ade80" delay="intel-fade-in-2" icon={
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    } />
                                    <StatCard label="Conflicts" value={stats.conflict_count} accent="#fbbf24" delay="intel-fade-in-3" icon={
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    } />
                                    <StatCard label="Risk Level" value={stats.overall_risk_level} accent={riskLevelColor(stats.overall_risk_level)} delay="intel-fade-in-4" isText icon={
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
                                        <div className="intel-fade-in intel-fade-in-3 rounded-xl border border-white/[0.06] overflow-hidden" style={{ background: '#111827' }}>
                                            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                                                <h3 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Evidence Cards</h3>
                                                <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ color: '#22d3ee', background: 'rgba(34,211,238,0.1)' }}>
                                                    {structuredData.facts.length} facts
                                                </span>
                                            </div>
                                            <div className="p-4 space-y-3" style={{ maxHeight: showAllFacts ? 'none' : '480px', overflow: showAllFacts ? 'visible' : 'hidden' }}>
                                                {(showAllFacts ? structuredData.facts : structuredData.facts.slice(0, 8)).map((fact, i) => (
                                                    <FactCard key={fact.id || i} fact={fact} />
                                                ))}
                                            </div>
                                            {structuredData.facts.length > 8 && (
                                                <button onClick={() => setShowAllFacts(!showAllFacts)}
                                                    className="w-full py-2.5 text-xs font-semibold border-t transition-colors"
                                                    style={{ color: '#22d3ee', borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(34,211,238,0.03)' }}>
                                                    {showAllFacts ? 'Show less' : `Show all ${structuredData.facts.length} facts`}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Timeline */}
                                    {structuredData.timeline.length > 0 && (
                                        <div className="intel-fade-in intel-fade-in-3 rounded-xl border border-white/[0.06] overflow-hidden" style={{ background: '#111827' }}>
                                            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                                                <h3 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Visual Timeline</h3>
                                                <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ color: '#22d3ee', background: 'rgba(34,211,238,0.1)' }}>
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
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 intel-fade-in intel-fade-in-4">
                                    {/* Conflicts */}
                                    {structuredData.conflicts.length > 0 && (
                                        <div className="rounded-xl border border-white/[0.06] overflow-hidden" style={{ background: '#111827' }}>
                                            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                                                <h3 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Conflicts</h3>
                                                <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.1)' }}>
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
                                        <div className="rounded-xl border border-white/[0.06] overflow-hidden" style={{ background: '#111827' }}>
                                            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                                                <h3 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Risk Assessment</h3>
                                                <span className="text-[10px] font-mono px-2 py-0.5 rounded"
                                                    style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)' }}>
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
                                    <p className="text-sm" style={{ color: '#94a3b8' }}>
                                        No structured intelligence data available for this report. Switch to the Report view for the full analysis.
                                    </p>
                                    <button onClick={() => setViewMode('report')}
                                        className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg"
                                        style={{ color: '#22d3ee', border: '1px solid rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.05)' }}>
                                        View Report
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* === REPORT VIEW === */}
                {!loading && report && viewMode === 'report' && (
                    <div className="p-6 print:p-0">
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
                    <RadarEmpty onRun={handleRun} loadingHistory={loadingHistory} />
                )}
            </div>
        </div>
    );
};

export default InvestigatorAgent;
