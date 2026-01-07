import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Check } from "lucide-react";
import { 
  FINANCIAL_INSTITUTIONS, 
  FinancialInstitution
} from "@/constants/financial-institutions";
import { InstitutionLogo } from "@/components/ui/InstitutionLogo";
import { LogoUpload } from "./LogoUpload";
import { cn } from "@/lib/utils";

interface Props {
  value: string | null;
  onChange: (institution: FinancialInstitution | null, customName?: string) => void;
  customName?: string;
  onCustomNameChange?: (name: string) => void;
  customLogoUrl?: string | null;
  onCustomLogoUrlChange?: (url: string | null) => void;
}

export function InstitutionSelector({ 
  value, 
  onChange, 
  customName, 
  onCustomNameChange,
  customLogoUrl,
  onCustomLogoUrlChange,
}: Props) {
  const [search, setSearch] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(value === 'outro');

  const filteredInstitutions = useMemo(() => {
    if (!search) return FINANCIAL_INSTITUTIONS;
    const lowerSearch = search.toLowerCase();
    return FINANCIAL_INSTITUTIONS.filter(inst =>
      inst.name.toLowerCase().includes(lowerSearch)
    );
  }, [search]);

  const groupedInstitutions = useMemo(() => {
    const groups: Record<string, FinancialInstitution[]> = {
      digital: [],
      bank: [],
      wallet: [],
      broker: [],
      other: [],
    };
    
    filteredInstitutions.forEach(inst => {
      groups[inst.type].push(inst);
    });
    
    return groups;
  }, [filteredInstitutions]);

  const handleSelect = (institution: FinancialInstitution) => {
    if (institution.id === 'outro') {
      setShowCustomInput(true);
      onChange(institution, customName || '');
    } else {
      setShowCustomInput(false);
      onChange(institution);
    }
  };

  const groupLabels: Record<string, string> = {
    digital: 'Bancos Digitais',
    bank: 'Bancos Tradicionais',
    wallet: 'Carteiras Digitais',
    broker: 'Corretoras',
    other: 'Outros',
  };

  return (
    <div className="space-y-3">
      <Label>Selecione a instituição</Label>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar banco, carteira..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[200px] rounded-md border p-2">
        {Object.entries(groupedInstitutions).map(([type, institutions]) => {
          if (institutions.length === 0) return null;
          
          return (
            <div key={type} className="mb-3">
              <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
                {groupLabels[type]}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {institutions.map((inst) => (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => handleSelect(inst)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg transition-all hover:bg-accent/50",
                      value === inst.id && "bg-accent ring-2 ring-primary"
                    )}
                  >
                    <div className="relative">
                      <InstitutionLogo
                        institutionId={inst.id}
                        institutionName={inst.name}
                        color={inst.color}
                        size="md"
                      />
                      {value === inst.id && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-center leading-tight truncate w-full">
                      {inst.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </ScrollArea>

      {showCustomInput && value === 'outro' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="custom-name">Nome personalizado</Label>
            <Input
              id="custom-name"
              placeholder="Digite o nome..."
              value={customName || ''}
              onChange={(e) => onCustomNameChange?.(e.target.value)}
            />
          </div>
          
          {onCustomLogoUrlChange && (
            <LogoUpload
              value={customLogoUrl || null}
              onChange={onCustomLogoUrlChange}
            />
          )}
        </div>
      )}
    </div>
  );
}
