"use client";

import { useState, useCallback, ReactNode } from "react";
import { Button } from "@bytecats/ui-kit";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

export interface FormStep {
  id: string;
  label: string;
  fields: ReactNode;
}

interface MultiStepFormProps {
  steps: FormStep[];
  onSubmit: () => void;
  onCancel?: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function MultiStepForm({
  steps,
  onSubmit,
  onCancel,
  submitting = false,
  submitLabel = "Save",
}: MultiStepFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  const goNext = useCallback(() => {
    if (!isLast) setCurrentStep((p) => p + 1);
  }, [isLast]);

  const goPrev = useCallback(() => {
    if (!isFirst) setCurrentStep((p) => p - 1);
  }, [isFirst]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        {steps.map((step, i) => (
          <button
            key={step.id}
            type="button"
            onClick={() => setCurrentStep(i)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              i === currentStep
                ? "bg-seridian-500/15 text-seridian-400"
                : i < currentStep
                  ? "text-emerald-400"
                  : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {i < currentStep ? (
              <Check className="h-3 w-3" />
            ) : (
              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px]">
                {i + 1}
              </span>
            )}
            <span className="hidden sm:inline">{step.label}</span>
          </button>
        ))}
      </div>

      <div className="min-h-[200px]">{steps[currentStep].fields}</div>

      <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
        <div>
          {!isFirst && (
            <Button type="button" variant="ghost" onClick={goPrev} className="text-slate-400">
              <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Back
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} className="text-slate-400">
              Cancel
            </Button>
          )}
          {isLast ? (
            <Button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className="bg-seridian-500 text-white hover:bg-seridian-400"
            >
              {submitting ? "Saving..." : submitLabel}
            </Button>
          ) : (
            <Button type="button" onClick={goNext} className="bg-seridian-500 text-white hover:bg-seridian-400">
              Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
