import { Card } from '@/components/ui/card';
import { useEffect, useState } from 'react';

export function TerminalWindow() {
  const [line, setLine] = useState(0);
  
  const lines = [
    { delay: 0, text: '$ dcvaas domain add example.com', color: 'text-green-400' },
    { delay: 1000, text: '✓ Domain added successfully', color: 'text-green-400' },
    { delay: 1500, text: '✓ CNAME target: 3a2f1b.dcv.example.net', color: 'text-blue-400' },
    { delay: 2000, text: '$ # Configure your DNS...', color: 'text-slate-500' },
    { delay: 3000, text: '$ dcvaas domain verify example.com', color: 'text-green-400' },
    { delay: 4000, text: '⚡ Checking DNS configuration...', color: 'text-yellow-400' },
    { delay: 5000, text: '✓ CNAME verified', color: 'text-green-400' },
    { delay: 5500, text: '✓ Certificate issued: example.com', color: 'text-green-400' },
    { delay: 6000, text: '✓ Valid for 90 days, auto-renewing', color: 'text-green-400' },
  ];

  useEffect(() => {
    const timers = lines.map((l, i) => {
      return setTimeout(() => setLine(i + 1), l.delay);
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <Card className="bg-slate-950 border-slate-800 shadow-2xl overflow-hidden">
      {/* Terminal header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <span className="text-xs text-slate-400 font-mono ml-2">terminal</span>
      </div>
      
      {/* Terminal content */}
      <div className="p-6 font-mono text-sm min-h-[300px] space-y-2">
        {lines.slice(0, line).map((l, i) => (
          <div key={i} className={`${l.color} leading-relaxed`}>
            {l.text}
            {i === line - 1 && (
              <span className="inline-block w-2 h-4 bg-green-400 ml-1 animate-pulse"></span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
