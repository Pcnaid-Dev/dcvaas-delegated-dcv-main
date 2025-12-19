import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from '@phosphor-icons/react';
import { toast } from 'sonner';

type CopyButtonProps = {
  text: string;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
};

export function CopyButton({
  text,
  label,
  variant = 'outline',
  size = 'sm',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied', {
        duration: 1500,
        className: 'font-mono',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Copy failed');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className="gap-2 btn-ghost hover:bg-primary/10 transition-all"
    >
      {copied ? (
        <Check size={16} weight="bold" className="text-primary" />
      ) : (
        <Copy size={16} className="text-muted-foreground" />
      )}
      {label && <span className="font-mono text-xs uppercase tracking-wide">{label}</span>}
    </Button>
  );
}
