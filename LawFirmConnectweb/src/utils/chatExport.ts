import { saveAs } from 'file-saver';

interface ExportMessage {
    sender: string;
    content: string;
    time: string;
    isUser: boolean;
}

export async function exportAsPdf(messages: ExportMessage[], title: string) {
    const html2pdf = (await import('html2pdf.js')).default;

    const htmlLines: string[] = [
        `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">`,
        `<h1 style="color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">${title}</h1>`,
        `<p style="color: #94a3b8; font-size: 12px;">Exported on ${new Date().toLocaleString()}</p>`,
        `<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;">`,
    ];

    for (const msg of messages) {
        const isUser = msg.isUser;
        const bgColor = isUser ? '#eff6ff' : '#ffffff';
        const borderColor = isUser ? '#3b82f6' : '#e2e8f0';
        const label = isUser ? 'You' : 'AI Assistant';
        const labelColor = isUser ? '#3b82f6' : '#059669';

        htmlLines.push(`
            <div style="background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <strong style="color: ${labelColor}; font-size: 13px;">${label}</strong>
                    ${msg.time ? `<span style="color: #94a3b8; font-size: 11px;">${msg.time}</span>` : ''}
                </div>
                <div style="color: #334155; font-size: 13px; line-height: 1.6; white-space: pre-wrap;">${msg.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            </div>
        `);
    }

    htmlLines.push('</div>');

    const container = document.createElement('div');
    container.innerHTML = htmlLines.join('');

    const filename = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;

    await html2pdf().set({
        margin: 10,
        filename,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(container).save();
}

export function exportAsMarkdown(messages: ExportMessage[], title: string) {
    const lines: string[] = [
        `# ${title}`,
        `_Exported on ${new Date().toLocaleString()}_`,
        '',
        '---',
        '',
    ];

    for (const msg of messages) {
        const prefix = msg.isUser ? '**You**' : '**AI Assistant**';
        const time = msg.time ? ` _(${msg.time})_` : '';
        lines.push(`### ${prefix}${time}`);
        lines.push('');
        lines.push(msg.content);
        lines.push('');
        lines.push('---');
        lines.push('');
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const filename = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.md`;
    saveAs(blob, filename);
}

export function exportAsText(messages: ExportMessage[], title: string) {
    const lines: string[] = [
        title,
        `Exported on ${new Date().toLocaleString()}`,
        '='.repeat(50),
        '',
    ];

    for (const msg of messages) {
        const prefix = msg.isUser ? 'You' : 'AI Assistant';
        const time = msg.time ? ` (${msg.time})` : '';
        lines.push(`[${prefix}]${time}`);
        lines.push(msg.content);
        lines.push('');
        lines.push('-'.repeat(50));
        lines.push('');
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const filename = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
    saveAs(blob, filename);
}
