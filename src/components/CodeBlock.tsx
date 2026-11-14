import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  label: string;
  language: string;
  code: string;
  caption?: string;
}

export function CodeBlock({ label, language, code, caption }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const lines = code.split('\n');

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-900 text-slate-100 overflow-hidden dark:border-slate-800">
      <div className="flex items-center justify-between gap-4 border-b border-slate-800 bg-slate-950/70 px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs text-slate-300 min-w-0">
          <span className="font-medium text-slate-100 truncate">{label}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="font-mono text-slate-400 uppercase">{language}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy ${label}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 whitespace-nowrap shrink-0 transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <div className="overflow-x-auto p-4 text-[13px] leading-6 font-mono">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-slate-800/40">
                <td className="select-none pr-4 text-right text-slate-600 tabular-nums w-8 align-top">
                  {idx + 1}
                </td>
                <td className="whitespace-pre text-slate-100">{line || ' '}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && (
        <div className="border-t border-slate-800 bg-slate-950/50 px-4 py-2.5 text-xs text-slate-400 leading-relaxed">
          {caption}
        </div>
      )}
    </div>
  );
}
