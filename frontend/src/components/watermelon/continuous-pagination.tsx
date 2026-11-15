import { useState, type FC, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTheme } from "next-themes";

/* --- Types --- */

export interface ContinuousPaginationProps {
    totalPages?: number;
    defaultPage?: number;
}

/* --- Sub-Components --- */

interface PageButtonProps {
    children: ReactNode;
    onClick: () => void;
}

const PageButton: FC<PageButtonProps> = ({ children, onClick }) => {
    return (
        <motion.button
            onClick={onClick}
            className="h-10 w-10 sm:h-16 sm:w-16 rounded-lg sm:rounded-xl flex items-center justify-center text-[#706F78] dark:text-zinc-500 hover:text-[#65656c] dark:hover:text-zinc-300 border border-slate-500/20 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_4px_10px_rgba(0,0,0,0.12)]"
            whileHover={{
                scale: 1.08,
                y: -6,
                boxShadow: "0 6px 10px rgba(0,0,0,0.12)",
            }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
            {children}
        </motion.button>
    );
};

/* --- Main Component --- */

export const ContinuousPagination: FC<ContinuousPaginationProps> = ({
    totalPages = 5,
    defaultPage = 1,
}) => {
    const [active, setActive] = useState<number>(defaultPage);
    const theme = useTheme();
    const isDark = theme?.resolvedTheme === "dark" || (
        !theme?.resolvedTheme && typeof document !== "undefined" && document.documentElement.classList.contains("dark")
    );

    const paginate = (page: number) => {
        if (page < 1 || page > totalPages) return;
        setActive(page);
    };

    return (
        <div className="flex items-center justify-center gap-1.5 sm:gap-3 text-sm">
            {/* Prev */}
            <PageButton onClick={() => paginate(active - 1)}>
                <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6" />
            </PageButton>

            {/* Numbers container */}
            <div className="flex items-center h-10 sm:h-16 rounded-lg sm:rounded-xl p-1 sm:p-2 bg-white dark:bg-zinc-900 border border-slate-500/20 dark:border-zinc-800 shadow-[0_4px_10px_rgba(0,0,0,0.12)]">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    const isActive = active === page;
                    return (
                        <div
                            key={page}
                            onClick={() => paginate(page)}
                            className={`
                relative h-full w-8 sm:w-12 flex items-center justify-center
                cursor-pointer select-none rounded-lg sm:rounded-xl
                transition-colors duration-200
                ${isActive
                                    ? "text-zinc-900 dark:text-zinc-100 font-semibold"
                                    : "text-[#706F78] dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                                }
              `}
                        >
                            {/* Slide-over active background */}
                            {isActive && (
                                <motion.div
                                    layoutId="pagination-active-bg"
                                    transition={{
                                        type: "spring",
                                        stiffness: 400,
                                        damping: 30,
                                    }}
                                    className="absolute inset-0 rounded-lg sm:rounded-xl"
                                    style={{
                                        backgroundColor: isDark ? "#27272a" : "#f4f4f5",
                                    }}
                                />
                            )}

                            {/* Animated Digit */}
                            <div className="relative z-10 overflow-hidden h-5 flex items-center">
                                <AnimatePresence mode="popLayout" initial={false}>
                                    <motion.span
                                        key={page}
                                        initial={{ y: 12, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: -12, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="inline-block"
                                    >
                                        {page}
                                    </motion.span>
                                </AnimatePresence>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Next */}
            <PageButton onClick={() => paginate(active + 1)}>
                <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6" />
            </PageButton>
        </div>
    );
};
