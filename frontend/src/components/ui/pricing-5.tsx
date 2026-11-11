import { useState } from "react";
import { MdCheckCircle } from "react-icons/md";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface PricingFeature {
  name: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  features: PricingFeature[];
  buttonText: string;
  buttonVariant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  isPopular?: boolean;
  badge?: string;
}

export interface Pricing5Props {
  heading: string;
  subheading: string;
  monthlyLabel?: string;
  yearlyLabel?: string;
  plans: PricingPlan[];
}

export function Pricing5({
  heading,
  subheading,
  monthlyLabel = "Bill Monthly",
  yearlyLabel = "Bill Yearly",
  plans,
}: Pricing5Props) {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section className="w-full py-4 sm:py-8 font-sans">
      <div className="w-full">
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-studio-text tracking-tight">
            {heading}
          </h2>
          <p className="text-sm sm:text-base text-studio-muted max-w-xl">
            {subheading}
          </p>
        </div>

        <div className="mt-8 flex items-center justify-center space-x-3">
          <Label
            htmlFor="billing-toggle"
            className={cn(
              "cursor-pointer text-xs sm:text-sm font-semibold transition-colors",
              !isYearly ? "text-studio-text" : "text-studio-muted",
            )}
          >
            {monthlyLabel}
          </Label>
          <Switch
            id="billing-toggle"
            checked={isYearly}
            onCheckedChange={setIsYearly}
          />
          <Label
            htmlFor="billing-toggle"
            className={cn(
              "cursor-pointer text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5",
              isYearly ? "text-studio-text" : "text-studio-muted",
            )}
          >
            <span>{yearlyLabel}</span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-full">
              Save ~17%
            </span>
          </Label>
        </div>

        <div className="mx-auto mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-3xl p-2 transition-all duration-300 border shadow-lg",
                plan.isPopular
                  ? "bg-slate-900 text-white border-amber-400/80 shadow-[0_20px_50px_rgba(15,23,42,0.25)] ring-2 ring-amber-400/40"
                  : "bg-studio-raised border-studio-border text-studio-text shadow-md",
              )}
            >
              <div className="mt-3 mb-4 px-4 sm:px-5">
                <div className="flex items-center justify-between">
                  <h3
                    className={cn(
                      "text-xl font-bold font-serif",
                      plan.isPopular
                        ? "text-white"
                        : "text-studio-text",
                    )}
                  >
                    {plan.name}
                  </h3>
                  {plan.badge && (
                    <span
                      className={cn(
                        "text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full",
                        plan.isPopular
                          ? "bg-amber-400 text-slate-950 font-extrabold shadow-xs"
                          : "bg-studio-card border border-studio-border text-studio-muted",
                      )}
                    >
                      {plan.badge}
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "mt-2 text-xs leading-relaxed min-h-[36px]",
                    plan.isPopular
                      ? "text-slate-300"
                      : "text-studio-muted",
                  )}
                >
                  {plan.description}
                </p>
              </div>

              <div
                className={cn(
                  "flex flex-1 flex-col rounded-2xl p-6 transition-colors",
                  plan.isPopular
                    ? "bg-slate-950/90 text-white border border-slate-800"
                    : "bg-studio-card text-studio-text border border-studio-border/60",
                )}
              >
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                    {plan.currency}{isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      plan.isPopular ? "text-slate-400" : "text-studio-muted",
                    )}
                  >
                    / {isYearly ? "year" : "month"}
                  </span>
                </div>

                <ul className="mt-6 flex-1 space-y-3.5">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <MdCheckCircle
                        className={cn(
                          "size-5 shrink-0 mt-0.5",
                          plan.isPopular
                            ? "text-amber-400"
                            : "text-indigo-600 dark:text-sky-400",
                        )}
                      />
                      <span
                        className={cn(
                          "text-xs sm:text-sm font-medium leading-tight",
                          plan.isPopular ? "text-slate-200" : "text-studio-text",
                        )}
                      >
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className={cn(
                    "mt-8 h-12 w-full rounded-xl text-sm font-bold transition-all flex items-center justify-center cursor-pointer shadow-md active:scale-[0.98]",
                    plan.isPopular
                      ? "bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold shadow-amber-400/20 shadow-lg"
                      : plan.id === 'free'
                      ? "bg-studio-raised hover:bg-studio-card border border-studio-border text-studio-muted cursor-default"
                      : "bg-studio-accent hover:bg-studio-accent/90 text-studio-bg shadow-sm",
                  )}
                >
                  {plan.buttonText}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
