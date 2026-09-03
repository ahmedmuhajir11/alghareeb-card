import React, { useState } from "react";

interface ColorPickerProps {
  value: string[];
  onChange: (colors: string[]) => void;
}

const PRESET_COLORS = [
  "#1a1a2e","#16213e","#0f3460","#533483","#e94560",
  "#000000","#ffffff","#1e293b","#0ea5e9","#10b981",
  "#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6",
  "#f97316","#22c55e","#3b82f6","#a855f7","#6366f1",
  "#gold","#c0c0c0","#b45309","#65a30d","#0284c7",
];

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState("#6366f1");
  const [customText, setCustomText] = useState("");

  const toggle = (color: string) => {
    if (value.includes(color)) {
      onChange(value.filter(c => c !== color));
    } else if (value.length < 5) {
      onChange([...value, color]);
    }
  };

  const addCustom = () => {
    const c = customText.trim() || customColor;
    if (c && !value.includes(c) && value.length < 5) {
      onChange([...value, c]);
      setCustomText("");
    }
  };

  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.filter(c => c !== "#gold").map(color => (
          <button
            key={color}
            type="button"
            onClick={() => toggle(color)}
            className={`w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
              value.includes(color) ? "border-primary scale-110 shadow-[0_0_8px_rgba(139,92,246,0.6)]" : "border-border/30"
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
      <div className="flex gap-2 items-center flex-wrap">
        <input
          type="color"
          value={customColor}
          onChange={e => setCustomColor(e.target.value)}
          className="w-10 h-10 rounded cursor-pointer border border-border/30 bg-transparent"
          title="اختر لوناً مخصصاً"
        />
        <input
          type="text"
          value={customText}
          onChange={e => setCustomText(e.target.value)}
          placeholder="اكتب اسم اللون أو كوده..."
          className="flex-1 h-10 px-3 text-sm rounded-lg bg-card/60 border border-border/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60"
          onKeyDown={e => e.key === "Enter" && addCustom()}
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={value.length >= 5}
          className="px-3 h-10 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-sm font-medium transition-colors disabled:opacity-40"
        >
          إضافة
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-card/80 border border-border/40 text-xs"
            >
              <div className="w-4 h-4 rounded-full border border-border/30" style={{ backgroundColor: c }} />
              <span className="text-foreground">{c}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-destructive ml-1 font-bold"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">يمكنك اختيار حتى 5 ألوان</p>
    </div>
  );
}
