import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';

type TerminalLine = {
  type: 'command' | 'output' | 'success';
  content: string;
  delay?: number;
};

const terminalScript: TerminalLine[] = [
  { type: 'command', content: '$ dcv add example.com', delay: 0 },
  { type: 'output', content: '✓ Domain added successfully', delay: 800 },
  { type: 'output', content: 'CNAME: example.com → dcv.pcnaid.com', delay: 1200 },
  { type: 'command', content: '$ dcv verify example.com', delay: 2000 },
  { type: 'output', content: '⏳ Checking DNS records...', delay: 2500 },
  { type: 'success', content: '✓ Certificate issued and active!', delay: 3500 },
];

export function TerminalWindow() {
  const [visibleLines, setVisibleLines] = useState<number>(0);

  useEffect(() => {
    if (visibleLines < terminalScript.length) {
      const currentLine = terminalScript[visibleLines];
      const timer = setTimeout(() => {
        setVisibleLines(prev => prev + 1);
      }, currentLine.delay || 0);

      return () => clearTimeout(timer);
    }
  }, [visibleLines]);

  return (
    <Card className="bg-slate-950 dark:bg-slate-950 border-2 border-slate-700 shadow-2xl overflow-hidden">
      {/* Terminal Header */}
      <div className="bg-slate-800 px-4 py-3 flex items-center gap-2 border-b border-slate-700">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <span className="text-xs text-slate-400 ml-2 font-mono">terminal</span>
      </div>

      {/* Terminal Content */}
      <div className="p-6 font-mono text-sm min-h-[280px]">
        {terminalScript.slice(0, visibleLines).map((line, index) => (
          <div
            key={index}
            className={`mb-2 ${
              line.type === 'command'
                ? 'text-cyan-400'
                : line.type === 'success'
                ? 'text-green-400 font-semibold'
                : 'text-slate-300'
            } animate-fadeIn`}
          >
            {line.content}
          </div>
        ))}
        {visibleLines < terminalScript.length && (
          <span className="inline-block w-2 h-4 bg-green-400 animate-pulse"></span>
        )}
      </div>
    </Card>
  );
}
