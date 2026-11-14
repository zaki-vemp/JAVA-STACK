import { Fragment } from 'react';

interface InlineProseProps {
  text: string;
}

export function InlineProse({ text }: InlineProseProps) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
          return (
            <code
              key={idx}
              className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.88em] font-medium text-slate-800 [overflow-wrap:anywhere] dark:bg-slate-800 dark:text-sky-300"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <Fragment key={idx}>{part}</Fragment>;
      })}
    </>
  );
}
