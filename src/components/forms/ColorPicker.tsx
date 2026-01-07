import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Optimized palette for financial categories - distinct and vibrant colors
const CATEGORY_COLOR_PALETTE = [
  { color: "#ef4444", name: "Vermelho", hint: "Alimentação" },
  { color: "#f97316", name: "Laranja", hint: "Moradia" },
  { color: "#eab308", name: "Amarelo", hint: "Lazer" },
  { color: "#22c55e", name: "Verde", hint: "Saúde" },
  { color: "#14b8a6", name: "Teal", hint: "Serviços" },
  { color: "#3b82f6", name: "Azul", hint: "Transporte" },
  { color: "#6366f1", name: "Índigo", hint: "Tecnologia" },
  { color: "#8b5cf6", name: "Roxo", hint: "Educação" },
  { color: "#ec4899", name: "Rosa", hint: "Pessoal" },
  { color: "#64748b", name: "Cinza", hint: "Outros" },
];

// Extended palette for more options
const EXTENDED_PALETTE = [
  ["#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#0d9488", "#2563eb"],
  ["#4f46e5", "#7c3aed", "#db2777", "#475569", "#0891b2", "#059669"],
];

// All colors for validation
const ALL_COLORS = [
  ...CATEGORY_COLOR_PALETTE.map(c => c.color),
  ...EXTENDED_PALETTE.flat()
];

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [showExtended, setShowExtended] = useState(false);

  const isValidHex = (hex: string) => /^#[0-9A-Fa-f]{6}$/.test(hex);

  const handleCustomChange = (val: string) => {
    setCustomColor(val);
    if (isValidHex(val)) {
      onChange(val);
    }
  };

  const handleCustomSubmit = () => {
    if (isValidHex(customColor)) {
      onChange(customColor);
      setShowCustom(false);
    }
  };

  const isPresetColor = ALL_COLORS.some(c => c.toLowerCase() === value.toLowerCase());

  return (
    <div className="space-y-4">
      {/* Main Color Grid - Optimized for categories */}
      <div className="grid grid-cols-5 gap-2">
        {CATEGORY_COLOR_PALETTE.map((item) => {
          const isSelected = value.toLowerCase() === item.color.toLowerCase();
          return (
            <button
              key={item.color}
              type="button"
              onClick={() => onChange(item.color)}
              className={cn(
                "flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all hover:bg-muted",
                isSelected && "bg-muted ring-2 ring-primary ring-offset-1 ring-offset-background"
              )}
            >
              <div
                className={cn(
                  "h-8 w-8 rounded-lg shadow-sm transition-transform",
                  isSelected && "scale-110"
                )}
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                {item.hint}
              </span>
            </button>
          );
        })}
      </div>

      {/* Extended Palette */}
      {showExtended && (
        <div className="space-y-1.5 pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">Mais cores</p>
          {EXTENDED_PALETTE.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1.5">
              {row.map((color) => {
                const isSelected = value.toLowerCase() === color.toLowerCase();
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onChange(color)}
                    className={cn(
                      "h-7 w-7 rounded-md transition-all hover:scale-110",
                      isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t">
        <button
          type="button"
          onClick={() => setShowExtended(!showExtended)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showExtended ? "Menos cores" : "Mais cores"}
        </button>
        
        <span className="text-muted-foreground">•</span>
        
        {showCustom ? (
          <div className="flex items-center gap-2">
            <Input
              value={customColor}
              onChange={(e) => handleCustomChange(e.target.value)}
              placeholder="#000000"
              className="h-7 font-mono w-24 text-xs"
              maxLength={7}
            />
            <button
              type="button"
              onClick={handleCustomSubmit}
              disabled={!isValidHex(customColor)}
              className={cn(
                "h-7 px-2 rounded text-xs font-medium transition-colors",
                isValidHex(customColor)
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              OK
            </button>
            <button
              type="button"
              onClick={() => setShowCustom(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setCustomColor(value);
              setShowCustom(true);
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            Personalizada
            {!isPresetColor && (
              <span className="text-[10px] bg-primary/10 text-primary px-1 py-0.5 rounded">
                {value}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
