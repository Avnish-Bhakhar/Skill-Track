import React from "react";

export function Logo({ size = "default", showTagline = false, className = "" }) {
  const isLarge = size === "large";

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* S-Ribbon Emblem with Ascending Metric Bars */}
      <svg
        className={isLarge ? "h-9 w-9 shrink-0" : "h-7 w-7 shrink-0"}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="skillTrackGrad" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#EAB308" />
            <stop offset="45%" stopColor="#84CC16" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <linearGradient id="barGrad" x1="14" y1="28" x2="26" y2="16" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#CA8A04" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Top curved ribbon loop */}
        <path
          d="M 28 8 C 30 11, 28 15, 23 18 L 14 23 C 10 25, 8 28, 9 32 C 10 35, 14 36, 18 35 L 26 31 C 29 29, 31 26, 31 23"
          stroke="url(#skillTrackGrad)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.25"
        />

        {/* Main Ribbon S-Curve Body */}
        <path
          d="M 27 7 C 20 5, 11 8, 11 15 C 11 19, 14 21, 19 23 L 23 24.5 C 27 26, 29 28.5, 29 32 C 29 37, 21 38, 14 36"
          stroke="url(#skillTrackGrad)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Rising Metric / Growth Bars inside the S curve */}
        <rect x="14" y="21" width="2.4" height="6" rx="1.2" fill="url(#barGrad)" />
        <rect x="18.5" y="17.5" width="2.4" height="9.5" rx="1.2" fill="url(#barGrad)" />
        <rect x="23" y="14" width="2.4" height="13" rx="1.2" fill="url(#barGrad)" />
      </svg>

      {/* Vertical Subtle Divider */}
      <span className={isLarge ? "h-7 w-px bg-line/80 shrink-0" : "h-5 w-px bg-line/80 shrink-0"} />

      {/* Brand Wordmark and Subtitle */}
      <div className="flex flex-col justify-center leading-none">
        <div className={`font-display font-bold tracking-tight flex items-baseline ${isLarge ? "text-2xl" : "text-lg"}`}>
          <span className="text-ink">Skill</span>
          <span className="text-[#10B981] ml-0.5">Track</span>
        </div>
        {showTagline && (
          <span className="mt-1 font-mono text-[8px] font-semibold uppercase tracking-[0.22em] text-muted-dim">
            Skilling <span className="text-yellow/70">•</span> Employment <span className="text-yellow/70">•</span> Impact
          </span>
        )}
      </div>
    </div>
  );
}

export default Logo;
