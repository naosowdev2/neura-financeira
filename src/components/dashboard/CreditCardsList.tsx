import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Edit2 } from "lucide-react";
import { CreditCardFormDialog } from "@/components/forms/CreditCardFormDialog";
import { CreditCardEditDialog } from "@/components/forms/CreditCardEditDialog";
import { InstitutionLogo } from "@/components/ui/InstitutionLogo";

interface CreditCardData {
  id: string;
  name: string;
  credit_limit: number;
  current_invoice: number;
  total_committed?: number;
  available_limit: number;
  color: string;
  due_day: number;
  icon?: string;
}

interface Props {
  creditCards: CreditCardData[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function CreditCardsList({ creditCards }: Props) {
  const [editingCard, setEditingCard] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);

  const handleEdit = (card: any) => {
    setEditingCard(card);
    setEditOpen(true);
  };

  return (
    <>
      <Card className="animate-fade-in card-interactive card-hover-orange" style={{ animationDelay: '500ms' }}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Cartões de Crédito</CardTitle>
          <CreditCardFormDialog />
        </CardHeader>
        <CardContent className="space-y-4">
          {creditCards.length === 0 ? (
            <p className="text-white/40 text-center py-4">
              Nenhum cartão cadastrado.
            </p>
          ) : (
            creditCards.map((card) => {
              // Use total_committed for usage percent if available, otherwise fall back to current_invoice
              const committedAmount = card.total_committed ?? card.current_invoice;
              const usagePercent = card.credit_limit > 0 
                ? (committedAmount / card.credit_limit) * 100 
                : 0;
              return (
                <div key={card.id} className="space-y-3 group p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <InstitutionLogo
                        institutionId={card.icon}
                        institutionName={card.name}
                        color={card.color}
                        size="md"
                      />
                      <div>
                        <p className="font-medium text-foreground">{card.name}</p>
                        <p className="text-xs text-muted-foreground">Vence dia {card.due_day}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="font-mono font-semibold text-foreground">{formatCurrency(card.current_invoice)}</p>
                        <p className="text-xs text-white/40">
                          de {formatCurrency(card.credit_limit)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/[0.1]"
                        onClick={() => handleEdit(card)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Progress 
                    value={Math.min(usagePercent, 100)} 
                    className="h-2 bg-white/[0.05]"
                    style={{ 
                      '--progress-color': usagePercent > 80 ? '#ef4444' : card.color 
                    } as React.CSSProperties}
                  />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <CreditCardEditDialog
        card={editingCard}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}