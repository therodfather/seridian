"use client";

/**
 * Multi-step form wizard used by Clients, Deals, Proposals, Bookings, etc.
 * Step chrome comes from the dashboard kit FlowSteps so every wizard looks the same.
 */
import { useState, useCallback, ReactNode } from "react";
import { Button } from "@bytecats/ui-kit";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FlowSteps } from "@/components/dashboard/kit";

export interface FormStep {
  id: string;
  label: string;
  fields: ReactNode;
}

interface MultiStepFormProps {
  steps: FormStep[];
  onSubmit: () => void | Promise<void>;
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
      <FlowSteps
        steps={steps.map(({ id, label }) => ({ id, label }))}
        current={currentStep}
        onStepChange={setCurrentStep}
      />

      <div className="min-h-[200px]">{steps[currentStep]?.fields}</div>

      <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
        <div>
          {!isFirst && (
            <Button type="button" variant="ghost" onClick={goPrev} className="text-slate-400">
              <ChevronLeft className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Back
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
              onClick={() => void onSubmit()}
              disabled={submitting}
              className="bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-semibold"
            >
              {submitting ? "Saving..." : submitLabel}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={goNext}
              className="bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-semibold"
            >
              Next <ChevronRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
