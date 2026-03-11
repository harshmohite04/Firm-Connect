import React, { useState, useEffect } from 'react';
import ragService from '../../services/ragService';

interface CustomInstructionsModalProps {
    open: boolean;
    onClose: () => void;
}

const CustomInstructionsModal: React.FC<CustomInstructionsModalProps> = ({ open, onClose }) => {
    const [instructions, setInstructions] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (open) {
            ragService.getCustomInstructions().then(data => {
                setInstructions(data.instructions || '');
            });
            setSaved(false);
        }
    }, [open]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await ragService.setCustomInstructions(instructions);
            setSaved(true);
            setTimeout(() => onClose(), 800);
        } catch {
            // Error handled in service
        } finally {
            setSaving(false);
        }
    };

    const handleClear = async () => {
        setInstructions('');
        setSaving(true);
        try {
            await ragService.setCustomInstructions('');
            setSaved(true);
            setTimeout(() => onClose(), 800);
        } catch {
            // Error handled in service
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl p-6 w-[500px] max-w-[90vw] max-h-[80vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg">Custom Instructions</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Tell the AI how you'd like it to respond. These apply to all your conversations.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"
                        aria-label="Close custom instructions"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="e.g., Always respond in formal legal language. Focus on Indian law. Include relevant IPC sections when applicable..."
                    className="flex-1 min-h-[200px] p-4 border border-slate-200 rounded-xl text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                    maxLength={2000}
                    aria-label="Custom instructions input"
                />

                <div className="flex items-center justify-between mt-4">
                    <span className="text-[10px] text-slate-400">{instructions.length}/2000</span>
                    <div className="flex gap-2">
                        {instructions && (
                            <button
                                onClick={handleClear}
                                disabled={saving}
                                className="px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                Clear
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {saved ? 'Saved!' : saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomInstructionsModal;
