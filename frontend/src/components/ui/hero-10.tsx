import { useState } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { FaArrowRight, FaChevronDown, FaXmark } from "react-icons/fa6";
import canonLogo from "../../assets/canon-logo.png";
import storybookBackground from "../../assets/storybook-background.webp";

export interface Hero10NavItem {
  label: string;
  href: string;
  onClick?: () => void;
  isActive?: boolean;
  hasMenu?: boolean;
}

export interface Hero10Props {
  brandName?: string;
  navItems?: Hero10NavItem[];
  ctaText?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  eyebrowText?: string;
  title?: string;
  description?: string;
  primaryText?: string;
  primaryHref?: string;
  onPrimaryClick?: () => void;
  bottomLabel?: string;
  usersText?: string;
  backgroundImage?: string;
  children?: React.ReactNode;
  hideHeader?: boolean;
}

const defaultNavItems: Hero10NavItem[] = [
  { label: "Write a Story", href: "#write" },
  { label: "Choose Your Path", href: "#branching" },
  { label: "Writer Mode", href: "#writer" },
  { label: "Community Books", href: "#books" },
];

const defaultBackground = storybookBackground;

const headerVariants: Variants = {
  hidden: { opacity: 0, y: -16, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", duration: 0.68, bounce: 0 },
  },
};

const contentContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.12,
      staggerChildren: 0.1,
    },
  },
};

const contentItem: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", duration: 0.72, bounce: 0 },
  },
};

const backgroundVariants: Variants = {
  hidden: { opacity: 0, scale: 1.035, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { type: "spring", duration: 1.15, bounce: 0 },
  },
};

function MobileMenuIcon() {
  return (
    <span
      className="h-3.5 w-4 bg-[linear-gradient(to_bottom,currentColor_0_2px,transparent_2px_6px,currentColor_6px_8px,transparent_8px_12px,currentColor_12px_14px)]"
      aria-hidden="true"
    />
  );
}

export function Hero10({
  brandName = "Canon Studio",
  navItems = defaultNavItems,
  ctaText = "Sign in",
  ctaHref: _ctaHref = "#",
  onCtaClick,
  eyebrowText = "Join over 12,000+ storytellers",
  title = "Rediscover Your Strength\nReclaim Your Peace",
  description = "Confidential, professional help tailored to your unique needs,\navailable on your schedule. Your privacy is our first priority.",
  primaryText = "Get Started",
  primaryHref: _primaryHref = "#",
  onPrimaryClick,
  usersText = "Over 20k active users",
  backgroundImage = defaultBackground,
  children,
  hideHeader = false,
}: Hero10Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <section className={`relative isolate min-h-screen w-full overflow-hidden ${hideHeader ? 'bg-transparent' : 'bg-slate-200 dark:bg-zinc-950'} font-sans text-slate-900 dark:text-zinc-100 antialiased`}>
      {!hideHeader && (
        <>
          <motion.div
            variants={backgroundVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.35 }}
            className="absolute inset-0 will-change-transform"
            aria-hidden="true"
          >
            <img
              src={backgroundImage}
              alt=""
              className="h-full w-full object-cover object-center outline outline-1 outline-black/10 dark:opacity-40"
            />
          </motion.div>

          <div
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(239,230,207,0.24)_0%,rgba(239,230,207,0.08)_32%,rgba(41,55,43,0.04)_66%,rgba(41,55,43,0.12)_100%)] dark:bg-[linear-gradient(180deg,rgba(15,23,18,0.54)_0%,rgba(15,23,18,0.32)_32%,rgba(15,23,18,0.2)_66%,rgba(15,23,18,0.58)_100%)]"
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-0 top-0 h-[48%] bg-[radial-gradient(ellipse_at_center,rgba(255,250,232,0.24)_0%,rgba(255,250,232,0.08)_42%,rgba(255,250,232,0)_74%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(30,41,59,0.42)_0%,rgba(15,23,42,0.22)_42%,transparent_74%)]"
            aria-hidden="true"
          />
        </>
      )}

      <div className="relative z-10 mx-auto flex min-h-[760px] w-full max-w-[1440px] flex-col px-5 py-5 sm:min-h-screen sm:px-10 lg:px-[74px]">
        {!hideHeader && (
          <>
            <motion.header
              variants={headerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.8 }}
              className="flex h-12 items-center justify-between"
        >
          <a
            href="#"
            className="inline-flex min-h-10 items-center gap-2.5 font-serif text-[25px] leading-none font-medium tracking-[-0.035em] text-slate-800 transition-[opacity,transform] duration-200 ease-out hover:opacity-75 active:scale-[0.96]"
          >
            <img src={canonLogo} alt="Canon Studio" className="w-8 h-8 object-contain drop-shadow-xs" />
            <span>{brandName}</span>
          </a>

          <nav className="hidden items-center gap-1.5 lg:flex bg-slate-900/5 backdrop-blur-md p-1 rounded-full border border-slate-400/20">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  item.onClick?.();
                }}
                className={`group inline-flex min-h-8 items-center gap-1.5 text-xs sm:text-sm font-medium transition-all duration-200 ease-out px-4 py-1.5 rounded-full cursor-pointer ${
                  item.isActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-700 hover:text-slate-950 hover:bg-white/40"
                }`}
              >
                <span>{item.label}</span>
                {item.hasMenu ? (
                  <FaChevronDown className="size-2.5 transition-transform duration-200 ease-out group-hover:translate-y-0.5" />
                ) : null}
              </a>
            ))}
          </nav>
          <div className="flex gap-2">
            <motion.button
              type="button"
              onClick={onCtaClick}
              whileTap={{ scale: 0.96 }}
              className="hidden min-h-10 items-center gap-2 rounded-full border border-sky-900/90 bg-white/10 px-5 text-sm leading-none font-medium text-slate-900 shadow-[0_1px_1px_rgba(255,255,255,0.45)_inset] backdrop-blur-md transition-[background-color,border-color,transform] duration-200 ease-out hover:border-sky-950 hover:bg-white/28 sm:inline-flex cursor-pointer"
            >
              <span>{ctaText}</span>
              <FaArrowRight className="size-3" />
            </motion.button>

            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileOpen(true)}
              className="inline-flex size-10 items-center justify-center rounded-full border border-sky-900/70 bg-white/16 text-slate-900 backdrop-blur-md transition-[background-color,transform] duration-200 ease-out hover:bg-white/30 active:scale-[0.96] lg:hidden"
            >
              <MobileMenuIcon />
            </button>
          </div>
        </motion.header>

        <AnimatePresence initial={false}>
          {mobileOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -10, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, filter: "blur(5px)" }}
              transition={{ type: "spring", duration: 0.3, bounce: 0 }}
              className="fixed inset-x-4 top-4 z-50 rounded-[28px] bg-white/90 p-4 text-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.22)] outline outline-1 outline-white/70 backdrop-blur-xl lg:hidden"
            >
              <div className="flex items-center justify-between pl-3">
                <a
                  href="#"
                  className="inline-flex items-center gap-2 font-serif text-2xl font-medium tracking-[-0.035em] text-slate-900"
                >
                  <img src={canonLogo} alt="Canon Studio" className="w-7 h-7 object-contain" />
                  <span>{brandName}</span>
                </a>
                <button
                  type="button"
                  aria-label="Close navigation menu"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex size-10 items-center justify-center rounded-full text-slate-950 transition-[background-color,transform] duration-200 ease-out hover:bg-slate-950/5 active:scale-[0.96]"
                >
                  <FaXmark className="size-4" />
                </button>
              </div>

              <nav className="mt-5 grid gap-1">
                {navItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => {
                      setMobileOpen(false);
                      item.onClick?.();
                    }}
                    className={`inline-flex min-h-11 items-center justify-between rounded-2xl px-4 text-sm font-medium transition-colors duration-200 ease-out cursor-pointer ${
                      item.isActive
                        ? "bg-slate-900 text-white font-semibold"
                        : "text-slate-800 hover:bg-slate-950/5"
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.hasMenu ? <FaChevronDown className="size-3" /> : null}
                  </a>
                ))}
              </nav>

              <motion.button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onCtaClick?.();
                }}
                whileTap={{ scale: 0.96 }}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-medium text-white transition-[background-color,transform] duration-200 ease-out hover:bg-slate-700"
              >
                {ctaText}
                <FaArrowRight className="size-3" />
              </motion.button>
            </motion.div>
          ) : null}
        </AnimatePresence>
        </>
        )}

        <motion.div
          variants={contentContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.42 }}
          className={`mx-auto flex w-full max-w-[840px] flex-1 flex-col items-center ${hideHeader ? 'pt-4 sm:pt-8' : 'pt-[50px] sm:pt-[70px] lg:pt-[54px]'} text-center`}
        >
          <motion.div
            variants={contentItem}
            className="inline-flex min-h-7 items-center gap-2 rounded-full border border-slate-700/13 dark:border-zinc-700 bg-white/18 dark:bg-zinc-800/60 px-3.5 text-sm leading-none font-medium text-slate-700 dark:text-zinc-300 shadow-[0_1px_1px_rgba(255,255,255,0.45)_inset] backdrop-blur-md"
          >
            <span className="grid size-4 place-items-center rounded-full border border-slate-500/30 bg-slate-100/70 dark:bg-zinc-700">
              <span className="size-2 rounded-full bg-slate-700 dark:bg-amber-400 shadow-[0_0_0_2px_rgba(51,65,85,0.1)]" />
            </span>
            <span>{eyebrowText}</span>
          </motion.div>

          <motion.h1
            variants={contentItem}
            className="mt-4 max-w-5xl font-serif text-[clamp(2.75rem,4.5vw,5.5rem)] leading-[0.94] font-medium tracking-[-0.06em] text-balance whitespace-pre-line text-slate-900 dark:text-white drop-shadow-sm 2xl:max-w-7xl"
          >
            {title}
          </motion.h1>

          <motion.p
            variants={contentItem}
            className="mask-l-form-90% mask-r-form-90% mt-4 max-w-[620px] bg-transparent mask-b-from-90% text-[clamp(0.95rem,1.25vw,1.1rem)] leading-[1.42] font-normal text-pretty whitespace-pre-line text-slate-700 dark:text-zinc-200 drop-shadow-[0_1px_8px_rgba(255,250,232,0.72)] dark:drop-shadow-[0_1px_8px_rgba(15,23,18,0.8)]"
          >
            {description}
          </motion.p>

          {/* If interactive children (Story Wizard Prompt Box) is passed, render it here directly */}
          {children ? (
            <motion.div variants={contentItem} className="w-full mt-6">
              {children}
            </motion.div>
          ) : (
            <motion.div variants={contentItem} className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <motion.button
                type="button"
                onClick={onPrimaryClick}
                whileTap={{ scale: 0.96 }}
                className="text-md inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-b from-slate-700 to-slate-900 px-6 font-normal text-white shadow-[0_1px_2px_rgba(15,23,42,0.18),0_12px_30px_rgba(15,23,42,0.08)] transition-[background-color,box-shadow,transform] duration-200 ease-out hover:bg-slate-700 cursor-pointer"
              >
                <span>{primaryText}</span>
                <FaArrowRight className="size-3" />
              </motion.button>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          variants={contentContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="mb-0 mt-6 flex flex-col items-center gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between"
        >
          <motion.div
            variants={contentItem}
            className="inline-flex w-fit items-center gap-3 rounded-full bg-white/14 dark:bg-zinc-800/50 p-px pr-4 text-sm font-semibold text-slate-800 dark:text-zinc-200 shadow-[0_0px_1px_rgba(255,255,255,0.5)_inset] backdrop-blur-sm border border-slate-500/20 dark:border-zinc-700"
          >
            <span className="grid size-7 place-items-center rounded-full bg-slate-800 dark:bg-zinc-700 text-white outline -outline-offset-1 outline-white/10">
              <FaArrowRight className="size-3 -rotate-45" />
            </span>
            <span>{usersText}</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
