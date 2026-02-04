import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import caseService from '../../services/caseService';
import type { Case } from '../../services/caseService';
import { Play, FileText, AlertCircle, Loader2 } from 'lucide-react';

interface CaseContextType {
  caseData: Case;
  setCaseData: React.Dispatch<React.SetStateAction<Case | null>>;
}

const InvestigatorAgent: React.FC = () => {
    const { caseData } = useOutletContext<CaseContextType>();
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleRunInvestigation = async () => {
        setLoading(true);
        setError(null);
        setReport(null);
        try {
            const result = await caseService.runInvestigation(caseData._id);
            setReport(result.final_report);
        } catch (err: any) {
             console.error("Investigation failed", err);
             setError(err.response?.data?.detail || "Failed to run investigation. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header / Actions */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
                 <div>
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                         <FileText className="w-5 h-5 text-purple-600" />
                         Investigator Agent
                    </h2>
                    <p className="text-sm text-slate-500">
                        Automated deep analysis of case documents.
                    </p>
                 </div>
                 <div>
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
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
                        </div>
                        <h3 className="text-lg font-medium text-slate-800">Investigator is analyzing documents...</h3>
                        <p className="text-slate-500 max-w-md mt-2">
    This process involves reading all case files, extracting facts, identifying contradictions, and generating a comprehensive report. This may take a minute.
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
                    </div>
                )}
            </div>
        </div>
    );
};

export default InvestigatorAgent;
