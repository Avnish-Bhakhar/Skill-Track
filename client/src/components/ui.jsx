import { animate, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useMotionOk } from "../lib/motion";

export function Window({ title, aside, children, className = "", bodyClass = "p-4" }) {
  const ok = useMotionOk();
  return (
    <motion.section
      className={`hard-shadow flex min-w-0 flex-col border border-line bg-surface ${className}`}
      initial={ok ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
    >
      <header className="flex min-h-10 flex-wrap items-center justify-between gap-2 border-b border-line bg-sidebar px-4 py-2.5">
        <h2 className="m-0 text-[12px] font-semibold tracking-widest uppercase text-muted">{title}</h2>
        {aside && <div className="text-[11px] text-muted-dim">{aside}</div>}
      </header>
      <div className={`flex-1 ${bodyClass}`}>{children}</div>
    </motion.section>
  );
}

const TONES = {
  neon: "bg-neon text-bg",
  pink: "bg-pink text-bg",
  yellow: "bg-yellow text-bg",
  cyan: "bg-cyan text-bg",
  muted: "bg-surface-hover text-muted border border-line",
};

export function Tag({ tone = "neon", tilt = -2, delay = 0, className = "", children }) {
  const ok = useMotionOk();
  return (
    <motion.span
      className={`inline-block px-3 py-1 text-[10px] font-bold tracking-widest uppercase rounded-sm ${TONES[tone] ?? TONES.neon} ${className}`}
      initial={ok ? { opacity: 0, y: -6, rotate: 0 } : false}
      animate={{ opacity: 1, y: 0, rotate: tilt }}
      transition={ok ? { type: "spring", duration: 0.4, bounce: 0.25, delay } : { duration: 0 }}
    >
      {children}
    </motion.span>
  );
}

const BUTTONS = {
  primary: "border-primary bg-primary text-bg hover:opacity-88 font-semibold",
  plain: "border-line bg-surface text-ink hover:border-primary hover:text-primary font-medium",
  danger: "border-danger bg-surface text-danger hover:bg-danger hover:text-bg font-medium",
};

export function Button({ variant = "plain", small, loading, className = "", disabled, children, ...props }) {
  const ok = useMotionOk();
  const lift = ok && !disabled && !loading;
  return (
    <motion.button
      type="button"
      disabled={disabled || loading}
      className={`cursor-pointer border tracking-tight transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
        small ? "px-3 py-1 text-[12px]" : "px-4 py-2 text-[13px]"
      } ${BUTTONS[variant]} ${className}`}
      initial={false}
      style={{ boxShadow: "2px 2px 0 var(--hard-shadow-color)" }}
      whileHover={lift ? { x: 1, y: 1, boxShadow: "1px 1px 0 var(--hard-shadow-color)" } : undefined}
      whileTap={lift ? { x: 2, y: 2, boxShadow: "0px 0px 0 var(--hard-shadow-color)" } : undefined}
      transition={{ duration: 0.1 }}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="inline-block size-2 animate-pulse bg-current" />
          <span>Working...</span>
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
}

export function Check({ checked, onChange, label, children }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="inline-flex cursor-pointer items-center border-0 bg-transparent p-0 text-left text-ink transition-colors hover:text-cyan"
    >
      <span className={`font-mono text-xs ${checked ? "text-neon font-bold" : "text-muted"}`}>
        {checked ? "[x]" : "[ ]"}
      </span>
      {children && <span className="ml-2 text-xs">{children}</span>}
    </button>
  );
}

export function Field({ label, error, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 flex items-center justify-between text-[12px] font-medium text-muted">
        <span>{label}</span>
        {error && <span className="text-pink text-[11px]">{error}</span>}
      </span>
      {children}
    </label>
  );
}

export function Select({ children, className = "", ...props }) {
  return (
    <span className="relative block">
      <select className={`field pr-8 ${className}`} {...props}>
        {children}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-xs text-muted">
        v
      </span>
    </span>
  );
}

export function CountUp({ value, format = (n) => Math.round(n).toLocaleString("en-IN") }) {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true });
  const ok = useMotionOk();
  const [shown, setShown] = useState(0);
  const counted = useRef(false);

  useEffect(() => {
    if (value === null || value === undefined || !seen) return undefined;
    if (!ok || counted.current) {
      setShown(value);
      return undefined;
    }
    const controls = animate(0, value, {
      duration: 0.45,
      ease: "easeOut",
      onUpdate: setShown,
      onComplete: () => {
        counted.current = true;
      },
    });
    return () => controls.stop();
  }, [value, seen, ok]);

  return <span ref={ref}>{value === null || value === undefined ? "n/a" : format(shown)}</span>;
}

export const Skeleton = ({ className = "h-4 w-full" }) => (
  <div className={`skeleton border border-line ${className}`} />
);

export const Empty = ({ children = "Nothing here yet. Upload a CSV and this fills up." }) => (
  <div className="flex flex-col items-center justify-center border border-dashed border-line p-8 text-center">
    <div className="mb-2 font-mono text-2xl text-muted-dim">/ /</div>
    <p className="m-0 text-sm text-muted leading-relaxed max-w-sm">{children}</p>
  </div>
);

export const Loading = ({ children = "Fetching the files..." }) => (
  <div className="space-y-3 p-5">
    <div className="flex items-center gap-3 text-muted text-sm">
      <span className="inline-flex gap-0.5">
        <span className="inline-block size-1.5 animate-bounce bg-primary" style={{ animationDelay: "0ms" }} />
        <span className="inline-block size-1.5 animate-bounce bg-primary" style={{ animationDelay: "120ms" }} />
        <span className="inline-block size-1.5 animate-bounce bg-primary" style={{ animationDelay: "240ms" }} />
      </span>
      <span>{children}</span>
    </div>
    <Skeleton className="h-5 w-2/3" />
    <Skeleton className="h-14 w-full" />
    <Skeleton className="h-14 w-5/6" />
  </div>
);

export const ErrorNote = ({ children, onRetry }) =>
  children ? (
    <div role="alert" className="my-2 flex flex-wrap items-center justify-between gap-3 border border-pink/40 bg-pink/5 p-3 text-pink">
      <span className="text-xs">{children}</span>
      {onRetry && (
        <Button small variant="danger" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  ) : null;

export const Divider = () => (
  <div aria-hidden="true" className="relative my-8 h-6 overflow-hidden">
    <div className="stripe top-2 -left-4 w-[110%] -rotate-[0.8deg] opacity-70" style={{ height: 3 }} />
  </div>
);

export function PageHead({ title, note, tag, tone = "neon", children }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div>
        {tag && (
          <Tag tone={tone} className="mb-3">
            {tag}
          </Tag>
        )}
        <h1 className="headline m-0 text-3xl md:text-4xl lg:text-5xl">{title}</h1>
        {note && <p className="mt-2 mb-0 max-w-2xl text-[13px] leading-relaxed text-muted">{note}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </header>
  );
}

export function Drawer({ open, onClose, title, subtitle, children }) {
  const ok = useMotionOk();

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      window.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/75"
        initial={ok ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      {/* Panel */}
      <motion.div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex h-full w-full max-w-xl flex-col border-l-2 border-line bg-surface shadow-2xl"
        initial={ok ? { x: "100%" } : false}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
      >
        <header className="flex items-center justify-between border-b-2 border-line bg-retro px-4 py-3">
          <div>
            <h2 className="m-0 text-base font-bold text-ink">{title}</h2>
            {subtitle && <p className="m-0 text-xs text-muted">{subtitle}</p>}
          </div>
          <Button small onClick={onClose}>
            Close [Esc]
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </motion.div>
    </div>
  );
}
