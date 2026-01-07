import { useState } from 'react';
import { ChevronDown, ChevronUp, Bug, Clock, Wrench, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface DebugInfo {
  contextSent: Record<string, any>;
  toolsCalled: Array<{
    name: string;
    args: Record<string, any>;
    result: Record<string, any>;
    durationMs?: number;
  }>;
  totalDurationMs: number;
  timestamp: string;
}

interface AIDebugPanelProps {
  debugInfo: DebugInfo | null;
  isVisible: boolean;
}

export function AIDebugPanel({ debugInfo, isVisible }: AIDebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isVisible || !debugInfo) return null;

  const formatValue = (value: any): string => {
    if (typeof value === 'number') {
      return typeof value === 'number' && !Number.isInteger(value) 
        ? `R$ ${value.toFixed(2)}` 
        : String(value);
    }
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (value === null || value === undefined) return '-';
    return String(value);
  };

  return (
    <div className="mx-4 mb-2 border rounded-lg bg-muted/30 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Bug className="h-3.5 w-3.5" />
          <span>Debug IA</span>
          {debugInfo.toolsCalled.length > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px]">
              {debugInfo.toolsCalled.length} ferramenta(s)
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <ScrollArea className="max-h-64">
          <div className="px-3 pb-3 space-y-3">
            {/* Contexto Enviado */}
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                <Database className="h-3 w-3" />
                Contexto Enviado
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                {Object.entries(debugInfo.contextSent).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-2 px-2 py-1 rounded bg-background/50">
                    <span className="text-muted-foreground truncate">{key}:</span>
                    <span className="font-medium truncate">{formatValue(value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ferramentas Chamadas */}
            {debugInfo.toolsCalled.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  <Wrench className="h-3 w-3" />
                  Ferramentas Executadas
                </div>
                <div className="space-y-2">
                  {debugInfo.toolsCalled.map((tool, idx) => (
                    <div key={idx} className="px-2 py-1.5 rounded bg-background/50 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-primary">{tool.name}</span>
                        {tool.durationMs && (
                          <span className="text-muted-foreground">{tool.durationMs}ms</span>
                        )}
                      </div>
                      {Object.keys(tool.args).length > 0 && (
                        <div className="text-muted-foreground mt-0.5">
                          Args: {JSON.stringify(tool.args)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tempo Total */}
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1 border-t">
              <Clock className="h-3 w-3" />
              <span>Tempo total: {debugInfo.totalDurationMs}ms</span>
              <span className="ml-auto">{debugInfo.timestamp}</span>
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
