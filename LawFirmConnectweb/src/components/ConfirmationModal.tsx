import React, { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, Info, X, CheckCircle2 } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    type?: 'danger' | 'warning' | 'info' | 'success';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose,    
    title, 
    message, 
    onConfirm,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDanger = false,
    type
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            setTimeout(() => setIsVisible(true), 10);
        } else {
            setIsVisible(false);
            const timer = setTimeout(() => setShouldRender(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!shouldRender) return null;

    // Determine type for styling, prioritizing 'type' prop but falling back to 'isDanger'
    const modalType = type || (isDanger ? 'danger' : 'info');

    const getIcon = (size: string = "w-6 h-6") => {
        const iconProps = { className: size };
        switch (modalType) {
            case 'danger': return <AlertCircle {...iconProps} />;
            case 'warning': return <AlertTriangle {...iconProps} />;
            case 'success': return <CheckCircle2 {...iconProps} />;
            default: return <Info {...iconProps} />;
        }
    };

    const getTypeStyles = () => {
        const commonBtn = 'bg-blue-600 hover:bg-blue-700 shadow-blue-200/50';
        switch (modalType) {
            case 'danger':
                return {
                    iconBg: 'bg-red-50 text-red-600 ring-4 ring-red-50/50',
                    confirmBtn: commonBtn,
                    accent: 'border-red-500'
                };
            case 'warning':
                return {
                    iconBg: 'bg-amber-50 text-amber-600 ring-4 ring-amber-50/50',
                    confirmBtn: commonBtn,
                    accent: 'border-amber-500'
                };
            case 'success':
                return {
                    iconBg: 'bg-emerald-50 text-emerald-600 ring-4 ring-emerald-50/50',
                    confirmBtn: commonBtn,
                    accent: 'border-emerald-500'
                };
            default:
                return {
                    iconBg: 'bg-blue-50 text-blue-600 ring-4 ring-blue-50/50',
                    confirmBtn: commonBtn,
                    accent: 'border-blue-500'
                };
        }
    };

    const styles = getTypeStyles();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
            {/* Backdrop with Glassmorphism */}
            <div 
                className={`absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-all duration-300 ease-out cursor-pointer ${
                    isVisible ? 'opacity-100' : 'opacity-0'
                }`} 
                onClick={onClose}
                aria-hidden="true"
            />
            
            {/* Modal Card */}
            <div 
                className={`relative bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] w-full max-w-md overflow-hidden transform transition-all duration-300 ease-out z-10 border border-slate-200/50 ${
                    isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
                }`}
                role="dialog" 
                aria-modal="true"
            >
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors z-20"
                    aria-label="Close"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Content Section */}
                <div className="p-6">
                    <div className="flex items-start gap-5">
                        {/* Icon Container */}
                        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transform transition-transform duration-500 ${
                            isVisible ? 'scale-100 rotate-0' : 'scale-75 rotate-12'
                        } ${styles.iconBg}`}>
                            {getIcon("w-6 h-6")}
                        </div>

                        <div className="pt-0.5">
                            <h3 className="text-xl font-bold text-slate-900 mb-1 tracking-tight">
                                {title}
                            </h3>
                            <p className="text-slate-500 text-sm font-medium leading-relaxed">
                                {message}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions Footer */}
                <div className="bg-slate-50/50 px-6 py-4 flex flex-row-reverse gap-2.5 border-t border-slate-100">
                    <button 
                        type="button" 
                        className={`px-5 py-2 text-sm font-bold text-white rounded-lg transition-all duration-200 shadow-sm active:scale-[0.98] ${styles.confirmBtn}`}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        {confirmText}
                    </button>
                    <button 
                        type="button" 
                        className="px-5 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 active:scale-[0.98]"
                        onClick={onClose}
                    >
                        {cancelText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
