import { RefreshCw } from 'lucide-react';

interface CanonIntegrityGaugeProps {
  score: number;
  isAuditing?: boolean;
  conflictCount?: number;
  onClick?: () => void;
  onRefresh?: () => void;
  className?: string;
}

export function CanonIntegrityGauge({
  score = 100,
  isAuditing = false,
  conflictCount = 0,
  onClick,
  onRefresh,
  className = ''
}: CanonIntegrityGaugeProps) {
  // Normalize score between 0 and 100
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));

  // SVG circular gauge math (radius = 18, circumference = 2 * PI * 18 ≈ 113.1)
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  // Determine health state colors & labels
  let statusColor = {
    ring: '#10B981', // Emerald
    text: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30',
    label: 'Canon Pure'
  };

  if (normalizedScore < 70 || conflictCount > 0) {
    statusColor = {
      ring: '#EF4444', // Crimson Red
      text: 'text-rose-700 dark:text-rose-400',
      bg: 'bg-rose-500/10 dark:bg-rose-500/15',
      border: 'border-rose-500/35',
      badge: 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/35',
      label: conflictCount > 0 ? `${conflictCount} Plot Hole${conflictCount > 1 ? 's' : ''}` : 'Contradiction'
    };
  } else if (normalizedScore < 90) {
    statusColor = {
      ring: '#F59E0B', // Amber
      text: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-500/10 dark:bg-amber-500/15',
      border: 'border-amber-500/30',
      badge: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
      label: 'Voice Drift'
    };
  }

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-2xl border transition-all duration-300 cursor-pointer select-none ${statusColor.bg} ${statusColor.border} shadow-xs hover:shadow-sm ${className}`}
      title="Live Story Canon & Plot Hole Health Meter"
    >
      {/* Animated Circular Gauge */}
      <div className="relative size-9 flex items-center justify-center">
        <svg className="size-9 -rotate-90" viewBox="0 0 44 44">
          {/* Background Track */}
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            className="text-slate-200/80 dark:text-slate-800"
          />
          {/* Progress Stroke */}
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke={statusColor.ring}
            strokeWidth="3.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isAuditing ? (
            <RefreshCw className="size-3.5 animate-spin text-amber-600 dark:text-amber-400" />
          ) : normalizedScore >= 90 ? (
            <span className="text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300">
              {normalizedScore}
            </span>
          ) : (
            <span className={`text-[10px] font-mono font-bold ${statusColor.text}`}>
              {normalizedScore}
            </span>
          )}
        </div>
      </div>

      {/* Label and Status */}
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold tracking-tight text-[#101C19] dark:text-slate-200">
            Canon Integrity
          </span>
          <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded-full border font-semibold ${statusColor.badge}`}>
            {isAuditing ? 'Scanning...' : statusColor.label}
          </span>
        </div>
        <span className="text-[10px] text-[#58745C] dark:text-slate-400 font-mono">
          {isAuditing ? 'Auditing Lore & Voice...' : `${normalizedScore}% Continuity`}
        </span>
      </div>

      {onRefresh && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRefresh();
          }}
          className="ml-1 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#58745C] hover:text-[#101C19] dark:text-slate-400 dark:hover:text-white transition-colors"
          title="Force Canon Audit Now"
        >
          <RefreshCw className={`size-3 ${isAuditing ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );
}

export default CanonIntegrityGauge;