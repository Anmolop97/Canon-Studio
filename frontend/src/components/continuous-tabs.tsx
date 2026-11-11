"use client";

import { useState, useEffect, type FC } from "react";
import { motion, LayoutGroup } from "motion/react";

/* ---------- Types ---------- */
interface TabItem {
    id: string;
    label: string;
}

interface ContinuousTabsProps {
    tabs?: TabItem[];
    defaultActiveId?: string;
    onChange?: (id: string) => void;
}

/* ---------- Defaults ---------- */
const DEFAULT_TABS: TabItem[] = [
    { id: "home", label: "Home" },
    { id: "interactions", label: "Interactions" },
    { id: "resources", label: "Resources" },
    { id: "docs", label: "Docs" },
];

export const ContinuousTabs: FC<ContinuousTabsProps> = ({
    tabs = DEFAULT_TABS,
    defaultActiveId = "home",
    onChange,
}) => {
    const [active, setActive] = useState<string>(defaultActiveId);
    const [isMounted, setIsMounted] = useState<boolean>(false);

    useEffect(() => {
        setActive(defaultActiveId);
    }, [defaultActiveId]);

    useEffect(() => {
        requestAnimationFrame(() => setIsMounted(true));
    }, []);

    const handleChange = (id: string) => {
        setActive(id);
        onChange?.(id);
    };

    if (!isMounted) return null;

    return (
        <LayoutGroup>
            <nav
                className="
          relative flex items-center gap-0.5 sm:gap-1 p-1 sm:p-1.5
            rounded-full
            border border-studio-border
            bg-studio-raised/90 backdrop-blur-md
            shadow-[inset_0_-1px_2px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.04)]
            transition-all duration-300
          "
            >
                {tabs.map((tab) => {
                    const isActive = active === tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleChange(tab.id)}
                            className="relative px-3.5 py-1.5 sm:px-5 sm:py-2 rounded-full outline-none cursor-pointer"
                        >
                            {/* Active pill */}
                            {isActive && (
                                <motion.div
                                    layoutId="active-pill"
                                    transition={{
                                        type: "spring",
                                        stiffness: 380,
                                        damping: 30,
                                        mass: 0.9,
                                    }}
                                    className="
                      absolute inset-0 rounded-full
                      bg-studio-accent
                      shadow-xs
                    "
                                />
                            )}

                            {/* Text */}
                            <motion.span
                                layout="position"
                                className={`relative z-10 text-xs sm:text-sm font-semibold transition-colors duration-200
                    ${isActive
                                        ? "text-studio-bg"
                                        : "text-studio-muted hover:text-studio-text"
                                    }
                  `}
                            >
                                {tab.label}
                            </motion.span>
                        </button>
                    );
                })}
            </nav>
        </LayoutGroup>
    );
};