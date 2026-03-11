import React, { useEffect, useRef, useState } from 'react';

interface MermaidBlockProps {
    code: string;
}

const MermaidBlock: React.FC<MermaidBlockProps> = ({ code }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [svg, setSvg] = useState<string>('');

    useEffect(() => {
        let cancelled = false;

        const renderDiagram = async () => {
            try {
                const mermaid = (await import('mermaid')).default;
                mermaid.initialize({
                    startOnLoad: false,
                    theme: 'default',
                    securityLevel: 'strict',
                });

                const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                const { svg: renderedSvg } = await mermaid.render(id, code);
                if (!cancelled) {
                    setSvg(renderedSvg);
                    setError(null);
                }
            } catch (e: any) {
                if (!cancelled) {
                    setError(e.message || 'Failed to render diagram');
                }
            }
        };

        renderDiagram();
        return () => { cancelled = true; };
    }, [code]);

    if (error) {
        return (
            <div className="my-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                <div className="font-medium mb-1">Diagram rendering failed</div>
                <pre className="whitespace-pre-wrap text-[10px] text-red-500">{code}</pre>
            </div>
        );
    }

    if (!svg) {
        return (
            <div className="my-3 p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 text-sm text-slate-400">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Rendering diagram...
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="my-3 p-4 bg-white border border-slate-200 rounded-lg overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
};

export default MermaidBlock;
