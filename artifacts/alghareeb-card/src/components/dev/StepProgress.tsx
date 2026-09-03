import React from "react";

interface StepProgressProps {
  steps: string[];
  currentStep: number;
}

export function StepProgress({ steps, currentStep }: StepProgressProps) {
  return (
    <div className="w-full mb-8" dir="rtl">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-4 right-0 left-0 h-0.5 bg-border/40 z-0" />
        <div
          className="absolute top-4 right-0 h-0.5 bg-gradient-to-l from-primary to-primary/50 z-0 transition-all duration-500"
          style={{ width: `${((currentStep) / (steps.length - 1)) * 100}%` }}
        />
        {steps.map((step, idx) => (
          <div key={idx} className="flex flex-col items-center gap-2 z-10 flex-1">
            <div
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                idx < currentStep
                  ? "bg-primary border-primary text-primary-foreground"
                  : idx === currentStep
                  ? "bg-primary/20 border-primary text-primary shadow-[0_0_12px_rgba(139,92,246,0.5)]"
                  : "bg-card border-border/40 text-muted-foreground"
              }`}
            >
              {idx < currentStep ? "✓" : idx + 1}
            </div>
            <span className={`text-[10px] font-medium text-center leading-tight hidden sm:block ${idx === currentStep ? "text-primary" : "text-muted-foreground"}`}>
              {step}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 text-center">
        <span className="text-xs text-muted-foreground">
          الخطوة <span className="text-primary font-bold">{currentStep + 1}</span> من {steps.length}
        </span>
      </div>
    </div>
  );
}
