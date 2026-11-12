import React, { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, ShieldCheck, FileCheck, CheckCircle2 } from "lucide-react";

export interface Newsletter2Props {
  heading?: string;
  description?: string;
  label?: string;
  placeholder?: string;
  buttonText?: string;
  disclaimer?: React.ReactNode;
}

export const Newsletter2: React.FC<Newsletter2Props> = ({
  heading = "Creator Support & Narrative Dispatches",
  description = "Hit a continuity edge case or need universe tuning? Connect directly with the engineering studio.",
  placeholder = "Enter your email for studio support...",
  buttonText = "Send Request",
  disclaimer = (
    <>
      Answers dispatched within 24h &bull; Lore &amp; manuscripts remain 100% private.
    </>
  ),
}) => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <section className="w-full py-8">
      {/* Curved Capsule Ribbon Silhouette (Enchanted Forest: Warm Cream + Gold Border + Forest Green Action) */}
      <div className="relative overflow-hidden rounded-3xl lg:rounded-full border border-[#D7C397] dark:border-slate-800 bg-[#F4F0E5]/95 dark:bg-slate-900/90 backdrop-blur-xl px-6 sm:px-10 py-6 sm:py-7 shadow-xl">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          
          {/* Left Info: Header & Support Channels */}
          <div className="flex flex-col space-y-2 text-center lg:text-left max-w-xl">
            <div className="inline-flex items-center justify-center lg:justify-start gap-2 text-xs font-semibold text-[#58745C] dark:text-sky-300">
              <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              <span>Active Creator Support &bull; Discord Writing Room</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#101C19] dark:text-white tracking-tight">
              {heading}
            </h3>

            <p className="text-xs sm:text-sm text-[#263F35] dark:text-slate-300">
              {description}
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1 text-[11px] text-[#87977A] dark:text-slate-400">
              <span className="flex items-center gap-1 font-medium">
                <MessageSquare className="w-3.5 h-3.5 text-[#58745C]" />
                Community Discord
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#58745C]" />
                Continuity Triage
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1 font-medium">
                <FileCheck className="w-3.5 h-3.5 text-[#C1A66B]" />
                Export Help
              </span>
            </div>
          </div>

          {/* Right Input Capsule */}
          <div className="w-full lg:w-[460px] flex-shrink-0">
            {submitted ? (
              <div className="p-4 rounded-full bg-[#E9E2CE] border border-[#58745C]/50 text-[#101C19] flex items-center justify-center gap-2 text-xs font-semibold animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-[#58745C]" />
                <span>Request received for {email}. We will reach out promptly.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
                <div className="relative flex-1 w-full min-w-[260px]">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={placeholder}
                    className="h-12 w-full min-w-full rounded-full px-5 text-xs sm:text-sm bg-[#FAF9F3] dark:bg-slate-800 border-[#D7C397] dark:border-slate-700 text-[#101C19] dark:text-white placeholder:text-[#87977A] focus-visible:ring-[#101C19] dark:focus-visible:ring-sky-400 shadow-xs"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="h-12 px-7 rounded-full font-semibold text-xs sm:text-sm bg-[#101C19] hover:bg-[#1C3026] text-white dark:bg-sky-500 dark:hover:bg-sky-400 dark:text-slate-950 transition-all shadow-md active:scale-[0.97] cursor-pointer flex-shrink-0 w-full sm:w-auto"
                >
                  {buttonText}
                </Button>
              </form>
            )}

            {disclaimer && (
              <p className="text-[10px] text-center lg:text-left text-[#87977A] dark:text-slate-500 mt-2">
                {disclaimer}
              </p>
            )}
          </div>

        </div>
      </div>
    </section>
  );
};

export default Newsletter2;
