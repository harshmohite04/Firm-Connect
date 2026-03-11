import React, { useState } from 'react';
interface MessageActionsProps {
    content: string;
    isUser: boolean;
    messageId: number;
    onRegenerate?: () => void;
    onEdit?: () => void;
    onFeedback?: (messageId: number, feedback: 'up' | 'down') => void;
    feedbackState?: 'up' | 'down' | null;
    isLoading?: boolean;
    hasError?: boolean;
    onRetry?: () => void;
    tokenUsage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
}

const MessageActions: React.FC<MessageActionsProps> = ({
    content,
    isUser,
    messageId,
    onRegenerate,
    onEdit,
    onFeedback,
    feedbackState,
    isLoading,
    hasError,
    onRetry,
    tokenUsage,
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = content;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const btnBase = 'p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95';
    const btnColor = 'text-slate-400 hover:text-slate-600 hover:bg-slate-100';

    return (
        <div className={`flex items-center gap-0.5 mt-1.5 ${isUser ? 'justify-end' : 'justify-start'} opacity-0 group-hover/msg:opacity-100 transition-opacity duration-200`}>
            {/* Token usage (AI messages only, on hover) */}
            {!isUser && tokenUsage && (
                <span className="text-[10px] text-slate-300 mr-1 tabular-nums" title={`Prompt: ${tokenUsage.prompt_tokens} | Completion: ${tokenUsage.completion_tokens}`}>
                    {tokenUsage.total_tokens} tokens
                </span>
            )}

            {/* Copy */}
            <button
                onClick={handleCopy}
                className={`${btnBase} ${copied ? 'text-green-500 hover:text-green-600' : btnColor}`}
                title={copied ? 'Copied!' : 'Copy message'}
                aria-label={copied ? 'Copied to clipboard' : 'Copy message'}
            >
                {copied ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                )}
            </button>

            {/* Edit (user messages only) */}
            {isUser && onEdit && (
                <button
                    onClick={onEdit}
                    className={`${btnBase} ${btnColor}`}
                    title="Edit message"
                    aria-label="Edit message"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
            )}

            {/* Regenerate (AI messages only) */}
            {!isUser && onRegenerate && !isLoading && (
                <button
                    onClick={onRegenerate}
                    className={`${btnBase} ${btnColor}`}
                    title="Regenerate response"
                    aria-label="Regenerate response"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            )}

            {/* Retry on error */}
            {!isUser && hasError && onRetry && (
                <button
                    onClick={onRetry}
                    className={`${btnBase} text-red-400 hover:text-red-600 hover:bg-red-50`}
                    title="Retry"
                    aria-label="Retry failed message"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            )}

            {/* Feedback (AI messages only) */}
            {!isUser && onFeedback && !hasError && (
                <>
                    <div className="w-px h-3.5 bg-slate-200 mx-0.5" aria-hidden="true" />
                    <button
                        onClick={() => onFeedback(messageId, 'up')}
                        className={`${btnBase} ${feedbackState === 'up' ? 'text-green-500 bg-green-50' : btnColor}`}
                        title="Good response"
                        aria-label="Mark as good response"
                        aria-pressed={feedbackState === 'up'}
                    >
                        <svg className="w-3.5 h-3.5" fill={feedbackState === 'up' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zm-9 11H3" />
                        </svg>
                    </button>
                    <button
                        onClick={() => onFeedback(messageId, 'down')}
                        className={`${btnBase} ${feedbackState === 'down' ? 'text-red-500 bg-red-50' : btnColor}`}
                        title="Bad response"
                        aria-label="Mark as bad response"
                        aria-pressed={feedbackState === 'down'}
                    >
                        <svg className="w-3.5 h-3.5" fill={feedbackState === 'down' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10zm9-13h2" />
                        </svg>
                    </button>
                </>
            )}
        </div>
    );
};

export default MessageActions;
