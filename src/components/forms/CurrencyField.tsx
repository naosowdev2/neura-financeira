import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calculator, Delete, Equal, Plus, Minus, X, Divide } from "lucide-react";

interface CurrencyFieldProps {
  /** Value in reais (float, e.g., 10.50 = R$ 10,50) */
  value: number;
  /** Callback with value in reais */
  onChange: (value: number) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
  className?: string;
  /** Show calculator button (default: true) */
  showCalculator?: boolean;
}

/**
 * Unified currency input component with Brazilian Real formatting.
 * 
 * - Value is in reais (e.g., 10.50 = R$ 10,50)
 * - Includes optional calculator for complex calculations
 * - Formats automatically as user types
 */
export function CurrencyField({ 
  value, 
  onChange, 
  placeholder = "R$ 0,00", 
  required, 
  id,
  className,
  showCalculator = true 
}: CurrencyFieldProps) {
  const [displayValue, setDisplayValue] = useState("");
  const [userHasTyped, setUserHasTyped] = useState(false);
  const [open, setOpen] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState("");
  const [currentValue, setCurrentValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Format reais to Brazilian currency display
  const formatCurrency = (reais: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Math.abs(reais));
  };

  // Format number for calculator display (without R$)
  const formatCalcDisplay = (num: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Initialize display value from prop - only if user hasn't typed
  useEffect(() => {
    if (!userHasTyped) {
      if (value !== 0) {
        setDisplayValue(formatCurrency(value));
      } else {
        setDisplayValue("");
      }
    }
  }, [value, userHasTyped]);

  // Reset userHasTyped when value changes externally
  useEffect(() => {
    setUserHasTyped(false);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserHasTyped(true);
    const rawValue = e.target.value;
    
    // Extract only digits
    const digits = rawValue.replace(/\D/g, '');
    
    if (digits === '') {
      setDisplayValue("");
      onChange(0);
      return;
    }

    // Convert cents to reais
    const cents = parseInt(digits, 10);
    const reais = cents / 100;
    
    // Update display
    setDisplayValue(formatCurrency(reais));
    
    // Notify parent with reais value
    onChange(reais);
  };

  const handleFocus = () => {
    // Select all on focus for easy editing
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  };

  // Calculator functions
  useEffect(() => {
    if (open && value) {
      setCalcDisplay(formatCalcDisplay(value));
    }
  }, [open, value]);

  const parseCalcDisplay = (str: string): number => {
    if (!str) return 0;
    // Handle Brazilian format: 1.234,56 -> 1234.56
    const cleaned = str.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const handleNumber = (num: string) => {
    if (waitingForOperand) {
      setCalcDisplay(num);
      setWaitingForOperand(false);
    } else {
      setCalcDisplay(calcDisplay === "0" ? num : calcDisplay + num);
    }
  };

  const handleDecimal = () => {
    if (waitingForOperand) {
      setCalcDisplay("0,");
      setWaitingForOperand(false);
      return;
    }
    if (!calcDisplay.includes(",")) {
      setCalcDisplay(calcDisplay + ",");
    }
  };

  const handleOperator = (nextOperator: string) => {
    const inputValue = parseCalcDisplay(calcDisplay);

    if (currentValue === null) {
      setCurrentValue(inputValue);
    } else if (operator) {
      const result = calculate(currentValue, inputValue, operator);
      setCurrentValue(result);
      setCalcDisplay(formatCalcDisplay(result));
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  };

  const calculate = (a: number, b: number, op: string): number => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b !== 0 ? a / b : 0;
      default: return b;
    }
  };

  const handleEqual = () => {
    const inputValue = parseCalcDisplay(calcDisplay);

    if (operator && currentValue !== null) {
      const result = calculate(currentValue, inputValue, operator);
      setCalcDisplay(formatCalcDisplay(result));
      setCurrentValue(null);
      setOperator(null);
      setWaitingForOperand(false);
    }
  };

  const handleClear = () => {
    setCalcDisplay("");
    setCurrentValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const handleBackspace = () => {
    setCalcDisplay(calcDisplay.slice(0, -1));
  };

  const handleApply = () => {
    handleEqual();
    const finalValue = parseCalcDisplay(calcDisplay);
    onChange(finalValue);
    setDisplayValue(formatCurrency(finalValue));
    setOpen(false);
    handleClear();
  };

  const CalcButton = ({ children, onClick, variant = "secondary", className: btnClass = "" }: any) => (
    <Button
      type="button"
      variant={variant}
      className={`h-12 text-lg font-medium ${btnClass}`}
      onClick={onClick}
    >
      {children}
    </Button>
  );

  return (
    <div className={className}>
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          required={required}
          className={showCalculator ? "pr-10" : ""}
        />
        {showCalculator && (
          <Button 
            type="button" 
            variant="ghost" 
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-secondary"
            onClick={() => setOpen(true)}
          >
            <Calculator className="h-4 w-4 text-muted-foreground hover:text-primary" />
          </Button>
        )}
      </div>
      
      {showCalculator && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-[320px] bg-card">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" /> Calculadora
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-3">
              {/* Display */}
              <div className="bg-secondary rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">
                  {currentValue !== null && operator && (
                    <span>{formatCalcDisplay(currentValue)} {operator} </span>
                  )}
                </div>
                <div className="text-2xl font-bold text-right font-mono">
                  R$ {calcDisplay || "0,00"}
                </div>
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-4 gap-2">
                <CalcButton onClick={handleClear} variant="destructive">C</CalcButton>
                <CalcButton onClick={handleBackspace} variant="outline">
                  <Delete className="h-4 w-4" />
                </CalcButton>
                <CalcButton onClick={() => handleOperator("/")} variant="outline">
                  <Divide className="h-4 w-4" />
                </CalcButton>
                <CalcButton onClick={() => handleOperator("*")} variant="outline">
                  <X className="h-4 w-4" />
                </CalcButton>

                <CalcButton onClick={() => handleNumber("7")}>7</CalcButton>
                <CalcButton onClick={() => handleNumber("8")}>8</CalcButton>
                <CalcButton onClick={() => handleNumber("9")}>9</CalcButton>
                <CalcButton onClick={() => handleOperator("-")} variant="outline">
                  <Minus className="h-4 w-4" />
                </CalcButton>

                <CalcButton onClick={() => handleNumber("4")}>4</CalcButton>
                <CalcButton onClick={() => handleNumber("5")}>5</CalcButton>
                <CalcButton onClick={() => handleNumber("6")}>6</CalcButton>
                <CalcButton onClick={() => handleOperator("+")} variant="outline">
                  <Plus className="h-4 w-4" />
                </CalcButton>

                <CalcButton onClick={() => handleNumber("1")}>1</CalcButton>
                <CalcButton onClick={() => handleNumber("2")}>2</CalcButton>
                <CalcButton onClick={() => handleNumber("3")}>3</CalcButton>
                <CalcButton onClick={handleEqual} variant="outline" className="row-span-2">
                  <Equal className="h-4 w-4" />
                </CalcButton>

                <CalcButton onClick={() => handleNumber("0")} className="col-span-2">0</CalcButton>
                <CalcButton onClick={handleDecimal}>,</CalcButton>
              </div>

              <Button onClick={handleApply} className="w-full">
                Aplicar R$ {calcDisplay || "0,00"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Re-export with old names for backward compatibility
export { CurrencyField as CurrencyInput };
export { CurrencyField as MoneyInput };
