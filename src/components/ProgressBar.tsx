import React from 'react';
import { Loader2 } from 'lucide-react';

interface ProgressBarProps {
  isVisible: boolean;
  message: string;
  progressPercent?: number | null; // 0..100 or null for indeterminate
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  isVisible,
  message,
  progressPercent,
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none select-none">
      {/* Top thin line bar */}
      <div className="h-1.5 w-full bg-[#26364a] overflow-hidden">
        {progressPercent !== null && progressPercent !== undefined ? (
          <div
            className="h-full bg-[#e0b44c] transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        ) : (
          <div className="h-full w-1/3 bg-[#e0b44c] animate-pulse" />
        )}
      </div>

      {/* Floating pill badge */}
      <div className="flex justify-center mt-3">
        <div className="flex items-center gap-2.5 px-4 py-2 bg-[#16212e]/95 backdrop-blur-md border border-[#26364a] rounded-full text-xs font-semibold text-[#e9eef4] shadow-2xl">
          <Loader2 size={13} className="text-[#e0b44c] animate-spin" />
          <span>
            {progressPercent !== null && progressPercent !== undefined
              ? `${Math.round(progressPercent)}% · `
              : ''}
            {message}
          </span>
        </div>
      </div>
    </div>
  );
};
