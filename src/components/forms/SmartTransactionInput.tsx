import { useState, useEffect, useRef } from 'react';
import { Send, Mic, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface SmartTransactionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (text: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

const examplePlaceholders = [
  "Gastei 250 no mercado hoje no débito",
  "Aluguel de 1200 todo mês",
  "Compra de 3000 em 10x no cartão",
  "Recebi salário de 5000",
  "Transferi 500 para poupança",
  "Uber 35 reais ontem",
  "Assinatura Netflix 55 mensal",
  "Jantar 180 no cartão Nubank",
];

export function SmartTransactionInput({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  disabled = false,
  placeholder,
}: SmartTransactionInputProps) {
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Rotate placeholder examples
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholder(prev => (prev + 1) % examplePlaceholders.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = () => {
    if (value.trim() && !isLoading && !disabled) {
      onSubmit(value.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with AI indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        <span>Descreva sua transação em linguagem natural</span>
      </div>

      {/* Main input area */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || examplePlaceholders[currentPlaceholder]}
          disabled={isLoading || disabled}
          className={cn(
            "min-h-[120px] pr-24 resize-none text-base",
            "bg-background/50 border-2 border-muted",
            "focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
            "transition-all duration-200",
            isLoading && "opacity-70"
          )}
        />

        {/* Action buttons */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            disabled
            title="Comando de voz (em breve)"
          >
            <Mic className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            size="icon"
            onClick={handleSubmit}
            disabled={!value.trim() || isLoading || disabled}
            className="h-9 w-9"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Quick examples */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground">Exemplos:</span>
        {examplePlaceholders.slice(0, 4).map((example, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onChange(example)}
            disabled={isLoading || disabled}
            className={cn(
              "text-xs px-2 py-1 rounded-full",
              "bg-muted/50 hover:bg-muted",
              "text-muted-foreground hover:text-foreground",
              "transition-colors duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {example.length > 30 ? example.slice(0, 30) + '...' : example}
          </button>
        ))}
      </div>
    </div>
  );
}
