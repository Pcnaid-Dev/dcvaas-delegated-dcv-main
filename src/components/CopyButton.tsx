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
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className="gap-2"
    >
      {copied ? (
        <Check size={16} weight="bold" />
      ) : (
        <Copy size={16} />
      )}
      {label && <span>{label}</span>}
    </Button>
  );
}
