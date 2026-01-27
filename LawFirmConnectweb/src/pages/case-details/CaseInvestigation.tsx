import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import ragService from '../../services/ragService';
import ReactMarkdown from 'react-markdown';
import { 
    Zap, 
    FileText, 
    Loader2, 
    ShieldCheck, 
    Activity,
    Network
} from 'lucide-react';

interface CaseData {
    _id: string;
    title: string;
}

interface Node {
    id: string;
    group: string;
    val: number;
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
}

interface Link {
    source: string;
    target: string;
}

// --- Simple Force Graph Hook ---
const useGraphSimulation = (nodes: Node[], _links: Link[], width: number, height: number) => {
    const [simulatedNodes, setSimulatedNodes] = useState<Node[]>([]);

    useEffect(() => {
        // Initialize positions randomly if not set
        const initializedNodes = nodes.map(n => ({
            ...n,
            x: n.x || Math.random() * width,
            y: n.y || Math.random() * height,
            vx: 0,
            vy: 0
        }));
        setSimulatedNodes(initializedNodes);
    }, [nodes, width, height]);

    // Simple ticker for animation (Physics-lite)
    useEffect(() => {
        if (simulatedNodes.length === 0) return;

        let animationFrameId: number;
        
        const tick = () => {
            setSimulatedNodes(prevNodes => {
                const newNodes = prevNodes.map(node => {
                    // 1. Center Force
                    const dx = (width / 2) - (node.x || 0);
                    const dy = (height / 2) - (node.y || 0);
                    let vx = (node.vx || 0) + dx * 0.005;
                    let vy = (node.vy || 0) + dy * 0.005;

                    // 2. Repulsion (Coulomb-ish)
                    prevNodes.forEach(other => {
                        if (node.id === other.id) return;
                        const rx = (node.x || 0) - (other.x || 0);
                        const ry = (node.y || 0) - (other.y || 0);
                        const distSq = rx * rx + ry * ry + 1; // +1 to avoid div by zero
                        const force = 500 / distSq;
                        vx += rx * force;
                        vy += ry * force;
                    });

                    // 3. Damping
                    vx *= 0.95;
                    vy *= 0.95;

                    return { ...node, x: (node.x || 0) + vx, y: (node.y || 0) + vy, vx, vy };
                });
                return newNodes;
            });
            animationFrameId = requestAnimationFrame(tick);
        };

        tick();
        return () => cancelAnimationFrame(animationFrameId);
    }, [simulatedNodes.length, width, height]); // Re-start if node count changes

    return simulatedNodes;
};


const CaseInvestigation: React.FC = () => {
    const { caseData } = useOutletContext<{ caseData: CaseData }>();
    const [status, setStatus] = useState<'Idle' | 'Running' | 'Completed' | 'Failed'>('Idle');
    const [progress, setProgress] = useState<string[]>([]);
    const [report, setReport] = useState<string | null>(null);
    const [graphData, setGraphData] = useState<{nodes: Node[], links: Link[]}>({ nodes: [], links: [] });
    const [polling, setPolling] = useState(false);
    const [activeTab, setActiveTab] = useState<'console' | 'graph' | 'report'>('console');
    
    const progressEndRef = useRef<HTMLDivElement>(null);
    const graphContainerRef = useRef<HTMLDivElement>(null);

    // Filter out graph updates from the visible log
    const visibleLog = useMemo(() => progress.filter(p => !p.startsWith("GRAPH_UPDATE:")), [progress]);

    // Graph Simulation
    const nodes = useGraphSimulation(graphData.nodes, graphData.links, 600, 400);

    const fetchStatus = async () => {
        if (!caseData?._id) return;
        try {
            const data = await ragService.getInvestigationStatus(caseData._id);
            
            // Handle updates
            if (data.progress) {
                setProgress(data.progress);
                
                // Parse latest graph update if any
                const graphUpdates = data.progress.filter((p: string) => p.startsWith("GRAPH_UPDATE:"));
                if (graphUpdates.length > 0) {
                    try {
                        const lastUpdate = graphUpdates[graphUpdates.length - 1].replace("GRAPH_UPDATE: ", "");
                        const parsed = JSON.parse(lastUpdate);
                        // Only update if changed to avoid re-renders
                        if (parsed.nodes.length !== graphData.nodes.length) {
                             setGraphData(parsed);
                             // Auto-switch to graph view on first data
                             if (status === 'Running' && activeTab === 'console') setActiveTab('graph'); 
                        }
                    } catch (e) {
                        console.warn("Failed to parse graph update", e);
                    }
                }
            }

            if (data.status === 'Running') {
                setStatus('Running');
                setPolling(true);
            } else if (data.status === 'Completed') {
                setStatus('Completed');
                setReport(data.report);
                setPolling(false);
                if (activeTab !== 'report') setActiveTab('report'); // Auto-show report when done
            } else if (data.status === 'Failed') {
                setStatus('Failed');
                setReport(data.report);
                setPolling(false);
            }
        } catch (error) {
            console.error("Failed to fetch investigation status", error);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, [caseData?._id]);

    useEffect(() => {
        let interval: any;
        if (polling) {
            interval = setInterval(fetchStatus, 2000); // Faster polling for "Live" feel
        }
        return () => clearInterval(interval);
    }, [polling]);

    useEffect(() => {
        progressEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [visibleLog]);

    const handleStart = async () => {
        if (!caseData?._id) return;
        setStatus('Running');
        setProgress(['Initializing Super Lawyer Engine...']);
        setGraphData({ nodes: [], links: [] });
        setReport(null);
        setActiveTab('console'); // Start with console
        try {
            await ragService.startInvestigation(caseData._id);
            setPolling(true);
        } catch (error) {
            setStatus('Failed');
            setReport("Could not start investigation agent.");
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200">
                        <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Super Lawyer Engine</h2>
                        <p className="text-xs text-slate-500 font-medium tracking-wide flex items-center gap-1">
                            <Activity className="w-3 h-3 text-emerald-500" />
                            DEEP REASONING & EVIDENCE MAPPING
                        </p>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button 
                         onClick={() => setActiveTab('console')}
                         className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'console' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Live Console
                    </button>
                    <button 
                         onClick={() => setActiveTab('graph')}
                         className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${activeTab === 'graph' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Network className="w-3 h-3" /> Knowledge Web
                    </button>
                    <button 
                         onClick={() => setActiveTab('report')}
                         className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${activeTab === 'report' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <FileText className="w-3 h-3" /> Dossier
                    </button>
                </div>

                {status === 'Idle' && (
                    <button 
                        onClick={handleStart}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold transition-all shadow-md active:scale-95"
                    >
                        <Zap className="w-4 h-4 fill-current" />
                        Start Analysis
                    </button>
                )}

                {status === 'Running' && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm font-semibold uppercase tracking-wider">Investigating...</span>
                    </div>
                )}

                {status === 'Completed' && (
                    <button 
                        onClick={handleStart}
                        className="text-sm text-slate-500 hover:text-indigo-600 font-medium underline transition-colors"
                    >
                        Run New Scan
                    </button>
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden relative bg-slate-50">
                
                {/* 1. Live Console View */}
                {activeTab === 'console' && (
                    <div className="absolute inset-0 bg-[#0f172a] text-slate-300 font-mono p-6 overflow-y-auto">
                        <div className="max-w-3xl mx-auto">
                            {visibleLog.map((msg, i) => (
                                <div key={i} className="mb-3 flex gap-4 border-l-2 border-slate-700 pl-4 py-1 hover:border-indigo-500 transition-colors">
                                    <span className="text-slate-500 text-xs shrink-0 pt-1">
                                        {new Date().toLocaleTimeString()}
                                    </span>
                                    <span className={`${msg.includes('Found') ? 'text-emerald-400 font-bold' : msg.includes('Analyzing') ? 'text-indigo-300' : 'text-slate-300'}`}>
                                        {msg}
                                    </span>
                                </div>
                            ))}
                             <div ref={progressEndRef} />
                        </div>
                    </div>
                )}

                {/* 2. Knowledge Web (Graph) View */}
                {activeTab === 'graph' && (
                     <div className="absolute inset-0 bg-slate-900 flex items-center justify-center overflow-hidden" ref={graphContainerRef}>
                        {nodes.length === 0 ? (
                            <div className="text-center text-slate-500">
                                <Network className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                <p>Waiting for graph data...</p>
                            </div>
                        ) : (
                            <svg width="100%" height="100%" viewBox="0 0 600 400" className="w-full h-full">
                                <defs>
                                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="20" refY="3.5" orient="auto">
                                        <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                                    </marker>
                                </defs>
                                {nodes.map((node) => (
                                    <g key={node.id} transform={`translate(${node.x},${node.y})`}>
                                        <circle 
                                            r={Math.max(5, Math.min(node.val * 3, 20))} 
                                            fill="#6366f1" 
                                            opacity="0.8" 
                                            className="animate-pulse"
                                        />
                                        <text 
                                            dy={-10} 
                                            textAnchor="middle" 
                                            fill="white" 
                                            fontSize="8" 
                                            className="uppercase tracking-wider font-bold shadow-black drop-shadow-md"
                                        >
                                            {node.id}
                                        </text>
                                    </g>
                                ))}
                            </svg>
                        )}
                        <div className="absolute bottom-4 right-4 bg-slate-800 text-slate-400 text-xs px-3 py-1 rounded-full border border-slate-700">
                            {nodes.length} Entities • Physics Simulation Active
                        </div>
                     </div>
                )}

                {/* 3. Dossier (Report) View */}
                {activeTab === 'report' && (
                     <div className="absolute inset-0 bg-white overflow-y-auto p-8">
                        {report ? (
                            <div className="max-w-4xl mx-auto">
                            <div className="prose prose-slate max-w-none prose-h1:text-indigo-900 prose-h2:text-indigo-700 prose-h2:border-b prose-h2:pb-2 prose-h2:mt-8 prose-strong:text-indigo-600">
                                <ReactMarkdown>
                                    {report}
                                </ReactMarkdown>
                            </div>
                            </div>
                         ) : (
                             <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                 <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-200" />
                                 <p>Compiling Intelligence Dossier...</p>
                             </div>
                         )}
                     </div>
                )}
            </div>
        </div>
    );
};

export default CaseInvestigation;
