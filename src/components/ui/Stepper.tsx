import { cn } from "@/utils/cn";
import { Check } from "lucide-react";

interface Step {
    label: string;
    icon: any;
}

interface StepperProps {
    steps: Step[];
    currentStep: number;
}

export function Stepper({ steps, currentStep }: StepperProps) {
    return (
        <div className="flex items-center gap-4">
            {steps.map((step, idx) => {
                const Icon = step.icon;
                const isActive = idx === currentStep;
                const isCompleted = idx < currentStep;

                return (
                    <div key={idx} className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className={cn(
                                "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 border-2",
                                isActive ? "bg-brand-500 text-white border-brand-500 shadow-brand-glow" : 
                                isCompleted ? "bg-emerald-500 text-white border-emerald-500" :
                                "bg-white text-slate-300 border-slate-100"
                            )}>
                                {isCompleted ? <Check size={20} strokeWidth={3} /> : <Icon size={20} />}
                            </div>
                            <div className="hidden lg:block">
                                <p className={cn(
                                    "text-[10px] font-black uppercase tracking-widest",
                                    isActive ? "text-slate-800" : "text-slate-400"
                                )}>
                                    {step.label}
                                </p>
                            </div>
                        </div>
                        {idx < steps.length - 1 && (
                            <div className={cn(
                                "w-6 h-0.5 rounded-full transition-all duration-500",
                                isCompleted ? "bg-emerald-500" : "bg-slate-100"
                            )} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
