import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import caseService from '../../services/caseService';

const SparklesIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
)

const SaveIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
)

const CaseDraft: React.FC = () => {
    // @ts-ignore
    const { caseData } = useOutletContext<{ caseData: any }>();
    const navigate = useNavigate();

    const [instructions, setInstructions] = useState('');
    const [generatedContent, setGeneratedContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [filename, setFilename] = useState('');
    const [showSaveModal, setShowSaveModal] = useState(false);

    const handleGenerate = async () => {
        if (!instructions.trim()) return;
        setIsGenerating(true);
        try {
            const content = await caseService.generateDocument(caseData._id, instructions);
            setGeneratedContent(content);
        } catch (error) {
            console.error("Generation failed", error);
            alert("Failed to generate document. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!filename.trim()) {
            alert("Please enter a filename");
            return;
        }
        setIsSaving(true);
        try {
            await caseService.saveGeneratedDocument(caseData._id, filename, generatedContent);
            setShowSaveModal(false);
            alert("Document saved and ingested successfully!");
            navigate('../documents'); 
        } catch (error) {
            console.error("Save failed", error);
            alert("Failed to save document.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex-1 bg-slate-50 p-6 flex flex-col gap-6 h-[calc(100vh-140px)] overflow-hidden">
            <div className="flex flex-col md:flex-row gap-6 h-full">
                
                {/* Left Panel: Instructions */}
                <div className="w-full md:w-1/3 flex flex-col gap-4">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                                <SparklesIcon />
                            </div>
                            Document Instructions
                        </h3>
                        
                        <textarea
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            placeholder="Describe the document you want to create. E.g., 'Draft a demand letter for unpaid invoices totaling $5,000, referencing the contract dated Jan 1st.'"
                            className="flex-1 w-full p-4 bg-slate-50 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-sm leading-relaxed"
                        />
                        
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || !instructions.trim()}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                        >
                            {isGenerating ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <SparklesIcon /> Generate Draft
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Right Panel: Editor */}
                <div className="flex-1 flex flex-col gap-4">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col relative">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800">Draft Editor</h3>
                            {generatedContent && (
                                <button
                                    onClick={() => setShowSaveModal(true)}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm flex items-center gap-2"
                                >
                                    <SaveIcon /> Save to Documents
                                </button>
                            )}
                        </div>

                        {generatedContent ? (
                            <textarea
                                value={generatedContent}
                                onChange={(e) => setGeneratedContent(e.target.value)}
                                className="flex-1 w-full p-6 bg-white border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-serif text-lg leading-relaxed text-slate-800"
                            />
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm text-slate-300">
                                    <SparklesIcon />
                                </div>
                                <p>Generated content will appear here</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Save Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-slate-900 mb-4">Save Document</h3>
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Filename</label>
                            <input
                                type="text"
                                value={filename}
                                onChange={(e) => setFilename(e.target.value)}
                                placeholder="e.g., Demand_Letter_Smith.txt"
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-slate-500 mt-2">File will be saved to Documents and processed by AI.</p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowSaveModal(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
                            >
                                {isSaving ? 'Saving...' : 'Save Document'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CaseDraft;
