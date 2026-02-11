import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import caseService from '../../services/caseService';
import type { Case, InvestigationReport, InvestigationProgressEvent } from '../../services/caseService';
import { Play, FileText, AlertCircle, Loader2, Clock, ChevronDown, ChevronUp, Search } from 'lucide-react';

interface CaseContextType {
  caseData: Case;
  setCaseData: React.Dispatch<React.SetStateAction<Case | null>>;
}

const InvestigatorAgent: React.FC = () => {
    const { caseData } = useOutletContext<CaseContextType>();
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Progress tracking
    const [progressStep, setProgressStep] = useState('');
    const [progressLabel, setProgressLabel] = useState('');
    const [progressPercent, setProgressPercent] = useState(0);

    // Focus questions
    const [focusText, setFocusText] = useState('');
    const [showFocus, setShowFocus] = useState(false);

    // Report history
    const [reportHistory, setReportHistory] = useState<InvestigationReport[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const abortControllerRef = useRef<AbortController | null>(null);

    // Load report history on mount
    useEffect(() => {
        if (caseData?._id) {
            loadReportHistory();
        }
        return () => {
            // Cleanup SSE connection on unmount
            abortControllerRef.current?.abort();
        };
    }, [caseData?._id]);

    const loadReportHistory = async () => {
        setLoadingHistory(true);
        try {
            const reports = await caseService.getInvestigationReports(caseData._id);
            setReportHistory(reports);
            // Load the latest report if available and no current report
            if (reports.length > 0 && !report) {
                setReport(reports[0].final_report);
            }
        } catch (err) {
            console.error("Failed to load report history", err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleRunInvestigation = async () => {
        setLoading(true);
        setError(null);
        setReport(null);
        setProgressPercent(0);
        setProgressStep('');
        setProgressLabel('Starting investigation...');

        const focusQuestions = focusText
            .split('\n')
            .map(q => q.trim())
            .filter(q => q.length > 0);

        try {
            const controller = caseService.runInvestigationStream(
                caseData._id,
                focusQuestions,
                (event: InvestigationProgressEvent) => {
                    if (event.type === 'progress') {
                        setProgressStep(event.step || '');
                        setProgressLabel(event.label || 'Processing...');
                        setProgressPercent(event.progress || 0);
                    } else if (event.type === 'complete') {
                        setProgressPercent(100);
                        setProgressLabel('Complete!');
                        setReport(event.final_report || null);
                        setLoading(false);
                        // Refresh history
                        loadReportHistory();
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
            abortControllerRef.current = controller;
        } catch (err: any) {
            console.error("Investigation failed", err);
            setError(err.response?.data?.detail || "Failed to run investigation. Please try again.");
            setLoading(false);
        }
    };

    const handleSelectReport = (r: InvestigationReport) => {
        setReport(r.final_report);
        setShowHistory(false);
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleString();
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header / Actions */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-purple-600" />
                            Investigator Agent
                        </h2>
                        <p className="text-sm text-slate-500">
                            Automated deep analysis of case documents.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {reportHistory.length > 0 && (
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className="text-slate-600 hover:text-slate-800 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1.5 text-sm transition-colors"
                            >
                                <Clock className="w-4 h-4" />
                                History ({reportHistory.length})
                                {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                        )}
                        {!loading ? (
                            <button
                                onClick={handleRunInvestigation}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm hover:shadow"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                Start Investigation
                            </button>
                        ) : (
                            <button disabled className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 cursor-not-allowed">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                            </button>
                        )}
                    </div>
                </div>

                {/* Focus Questions */}
                <div className="mt-3">
                    <button
                        onClick={() => setShowFocus(!showFocus)}
                        className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                    >
                        <Search className="w-3.5 h-3.5" />
                        {showFocus ? 'Hide' : 'Set'} investigation focus
                        {showFocus ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {showFocus && (
                        <textarea
                            value={focusText}
                            onChange={(e) => setFocusText(e.target.value)}
                            placeholder="Enter focus questions (one per line), e.g.:&#10;Was there a breach of contract?&#10;What are the payment discrepancies?"
                            className="mt-2 w-full border border-slate-200 rounded-lg p-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
                            rows={3}
                        />
                    )}
                </div>

                {/* Report History Dropdown */}
                {showHistory && reportHistory.length > 0 && (
                    <div className="mt-3 border border-slate-200 rounded-lg bg-white max-h-48 overflow-y-auto">
                        {reportHistory.map((r) => (
                            <button
                                key={r._id}
                                onClick={() => handleSelectReport(r)}
                                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors"
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-700">
                                        Report - {formatDate(r.created_at)}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {r.metadata?.fact_count || 0} facts, {r.metadata?.document_count || 0} docs
                                    </span>
                                </div>
                                {r.focus_questions && r.focus_questions.length > 0 && (
                                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                                        Focus: {r.focus_questions.join(', ')}
                                    </p>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="font-semibold text-sm">Error</h3>
                            <p className="text-sm">{error}</p>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        {/* Progress Bar */}
                        <div className="w-full max-w-md mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-slate-700">{progressLabel}</span>
                                <span className="text-sm font-semibold text-purple-600">{progressPercent}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                            {progressStep && (
                                <p className="text-xs text-slate-400 mt-2">
                                    Step: {progressStep}
                                </p>
                            )}
                        </div>
                        <p className="text-slate-500 max-w-md text-sm">
                            The investigator is reading all case files, extracting facts, identifying contradictions, and generating a comprehensive report.
                        </p>
                    </div>
                ) : report ? (
                    <div className="bg-white rounded-xl shadow border border-slate-200 p-8 max-w-4xl mx-auto">
                        <div className="prose prose-slate max-w-none">
                            <ReactMarkdown>{report}</ReactMarkdown>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-20 text-slate-400">
                        <FileText className="w-16 h-16 mb-4 opacity-20" />
                        <h3 className="text-lg font-medium text-slate-600">No report generated yet</h3>
                        <p className="max-w-md mt-2">
                            Click the "Start Investigation" button to have the AI agent analyze all documents and generate a detailed report.
                        </p>
                        {loadingHistory && (
                            <p className="text-sm text-slate-400 mt-3 flex items-center gap-2">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Loading previous reports...
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InvestigatorAgent;
