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
                  ? "bg-[#101C19] text-[#E9E2CE] border-[#C1A66B] shadow-[0_20px_50px_rgba(16,28,25,0.35)] ring-2 ring-[#C1A66B]/50"
                  : "bg-[#F4F0E5] border-[#D7C397] text-[#101C19] shadow-md",
              )}
            >
              <div className="mt-3 mb-4 px-4 sm:px-5">
                <div className="flex items-center justify-between">
                  <h3
                    className={cn(
                      "text-xl font-bold font-serif",
                      plan.isPopular
                        ? "text-[#E9E2CE]"
                        : "text-[#101C19]",
                    )}
                  >
                    {plan.name}
                  </h3>
                  {plan.badge && (
                    <span
                      className={cn(
                        "text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full",
                        plan.isPopular
                          ? "bg-[#C1A66B] text-[#101C19] font-extrabold shadow-xs"
                          : "bg-[#E9E2CE] border border-[#D7C397] text-[#263F35]",
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
                      ? "text-[#E9E2CE]/80"
                      : "text-[#58745C]",
                  )}
                >
                  {plan.description}
                </p>
              </div>

              <div
                className={cn(
                  "flex flex-1 flex-col rounded-2xl p-6 transition-colors",
                  plan.isPopular
                    ? "bg-[#263F35]/70 text-[#E9E2CE] border border-[#D7C397]/40"
                    : "bg-[#FAF9F3] text-[#101C19] border border-[#D7C397]/60",
                )}
              >
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                    {plan.currency}{isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      plan.isPopular ? "text-[#E9E2CE]/80" : "text-[#87977A]",
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
                            ? "text-[#C1A66B]"
                            : "text-[#58745C]",
                        )}
                      />
                      <span
                        className={cn(
                          "text-xs sm:text-sm font-medium leading-tight",
                          plan.isPopular ? "text-[#E9E2CE]" : "text-[#101C19]",
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
                      ? "bg-[#C1A66B] hover:bg-[#D7C397] text-[#101C19]"
                      : "bg-[#101C19] hover:bg-[#263F35] text-[#E9E2CE]"
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
