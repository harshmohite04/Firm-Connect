declare module 'mermaid' {
    interface MermaidConfig {
        startOnLoad?: boolean;
        theme?: string;
        securityLevel?: string;
        [key: string]: any;
    }

    interface RenderResult {
        svg: string;
    }

    const mermaid: {
        initialize(config: MermaidConfig): void;
        render(id: string, code: string): Promise<RenderResult>;
    };

    export default mermaid;
}
