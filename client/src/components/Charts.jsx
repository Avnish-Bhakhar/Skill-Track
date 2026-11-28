import { motion } from "framer-motion";
import { useRef } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { monthLabel } from "../lib/format";
import { useMotionOk } from "../lib/motion";
import { useTheme } from "../lib/theme";

const CustomTooltip = ({ active, payload, label, unit = "" }) => {
  const { colors } = useTheme();
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="hard-shadow border-2 border-line bg-surface p-3 text-xs">
      <div className="mb-1.5 font-display font-bold text-ink border-b border-line pb-1">
        {label}
      </div>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4 font-mono">
            <span className="flex items-center gap-1.5" style={{ color: entry.color || colors.ink }}>
              <span className="inline-block size-2" style={{ background: entry.color || colors.ink }} />
              <span>{entry.name}:</span>
            </span>
            <span className="font-bold text-ink">
              {entry.value !== null && entry.value !== undefined ? `${entry.value}${unit}` : "n/a"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

function GrowBar({ x, y, width, height, fill, stroke, horizontal }) {
  const ok = useMotionOk();
  if (![x, y, width, height].every(Number.isFinite)) return null;
  const top = Math.min(y, y + height);
  const size = Math.abs(height);
  const end = horizontal ? { y: top, height: size, width: Math.max(0, width) } : { y: top, height: size, width };
  const start = horizontal ? { ...end, width: 0 } : { ...end, y: height < 0 ? top : top + size, height: 0 };
  return (
    <motion.rect
      x={x}
      fill={fill}
      fillOpacity={0.4}
      stroke={stroke}
      strokeWidth={2}
      initial={ok ? start : end}
      animate={end}
      transition={{ duration: ok ? 0.35 : 0, ease: "easeOut" }}
      className="cursor-pointer transition-opacity hover:opacity-80"
    />
  );
}

function Frame({ height, legend, label, children }) {
  const ref = useRef(null);
  return (
    <figure ref={ref} className="m-0" aria-label={label}>
      {legend && (
        <ul className="m-0 mb-3 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-[12px] text-muted">
          {legend.map((item) => (
            <li key={item.name} className="flex items-center gap-2">
              <span className="inline-block size-2.5" style={{ background: item.color }} />
              <span className="font-medium text-ink/90">{item.name}</span>
            </li>
          ))}
        </ul>
      )}
      <div style={{ height }}>{children}</div>
    </figure>
  );
}

const barProps = (color, horizontal) => ({
  fill: color,
  stroke: color,
  isAnimationActive: false,
  shape: (props) => <GrowBar {...props} horizontal={horizontal} />,
});

export function GroupedBars({
  data,
  category,
  series,
  unit = "",
  height = 260,
  label,
  domain,
  onBarClick,
}) {
  const { colors, isDark } = useTheme();

  const themeSeries = series.map((s, idx) => {
    let color = s.color;
    if (s.role === "primary" || idx === 0) {
      color = colors.charts.primary;
    } else if (s.role === "comparison" || idx === 1) {
      color = colors.charts.comparison;
    } else if (s.role === "secondary" || idx === 2) {
      color = colors.charts.secondary;
    }
    return { ...s, color };
  });

  const axisProps = {
    tick: { fill: colors.secondaryText, fontSize: 11, fontFamily: "Space Mono, monospace" },
    tickLine: false,
    axisLine: { stroke: colors.charts.grid, strokeWidth: 2 },
  };

  return (
    <Frame height={height} label={label} legend={themeSeries.map((s) => ({ name: s.name, color: s.color }))}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: -8 }}
          barGap={4}
          onClick={(state) => {
            if (onBarClick && state && state.activePayload && state.activePayload.length) {
              onBarClick(state.activePayload[0].payload);
            }
          }}
        >
          <CartesianGrid stroke={colors.charts.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey={category}
            {...axisProps}
            interval={0}
            tickFormatter={(v) => (v && v.length > 16 ? `${v.slice(0, 15)}.` : v)}
          />
          <YAxis {...axisProps} unit={unit} domain={domain} />
          <Tooltip
            content={<CustomTooltip unit={unit} />}
            cursor={{ fill: isDark ? "rgba(53, 214, 160, 0.08)" : "rgba(52, 77, 64, 0.08)" }}
          />
          {themeSeries.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} maxBarSize={44} {...barProps(s.color, false)} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}

export function DemandSupply({ rows, label = "Demand against supply by skill", onSkillClick }) {
  const { colors, isDark } = useTheme();

  const data = rows.map((r) => ({
    name: r.name,
    demand: r.demandPct,
    supply: r.supplyPct,
    priority: r.priority,
    skillId: r.skillId,
  }));

  const axisProps = {
    tick: { fill: colors.secondaryText, fontSize: 11, fontFamily: "Space Mono, monospace" },
    tickLine: false,
    axisLine: { stroke: colors.charts.grid, strokeWidth: 2 },
  };

  return (
    <Frame
      height={Math.max(200, data.length * 50 + 40)}
      label={label}
      legend={[
        { name: "Asked for in job postings", color: colors.charts.primary },
        { name: "Trainees who have it", color: colors.charts.secondary },
      ]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
          barGap={2}
          onClick={(state) => {
            if (onSkillClick && state && state.activePayload && state.activePayload.length) {
              onSkillClick(state.activePayload[0].payload);
            }
          }}
        >
          <CartesianGrid stroke={colors.charts.grid} strokeDasharray="2 4" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} unit="%" {...axisProps} />
          <YAxis type="category" dataKey="name" width={160} {...axisProps} />
          <Tooltip
            content={<CustomTooltip unit="%" />}
            cursor={{ fill: isDark ? "rgba(53, 214, 160, 0.08)" : "rgba(52, 77, 64, 0.08)" }}
          />
          <Bar dataKey="demand" name="Demand" barSize={14} {...barProps(colors.charts.primary, true)} />
          <Bar dataKey="supply" name="Supply" barSize={14} {...barProps(colors.charts.secondary, true)} />
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}

export function DemandTrend({ trend, height = 260 }) {
  const { colors } = useTheme();
  const ok = useMotionOk();
  const data = trend.points.map((p) => ({ ...p, label: monthLabel(p.month) }));

  const linePalette = [
    colors.charts.primary,
    colors.charts.highlight,
    colors.charts.comparison,
    colors.charts.secondary,
  ];

  const axisProps = {
    tick: { fill: colors.secondaryText, fontSize: 11, fontFamily: "Space Mono, monospace" },
    tickLine: false,
    axisLine: { stroke: colors.charts.grid, strokeWidth: 2 },
  };

  return (
    <Frame
      height={height}
      label="Share of job postings asking for the top skills, last six months"
      legend={trend.series.map((s, i) => ({ name: s.name, color: linePalette[i % linePalette.length] }))}
    >
      <motion.div
        className="h-full"
        initial={ok ? { clipPath: "inset(0 100% 0 0)" } : false}
        animate={{ clipPath: "inset(0 0% 0 0)" }}
        transition={{ duration: 0.45, ease: "linear" }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
            <CartesianGrid stroke={colors.charts.grid} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis unit="%" domain={[0, 100]} {...axisProps} />
            <Tooltip content={<CustomTooltip unit="%" />} cursor={{ stroke: colors.charts.grid }} />
            {trend.series.map((s, i) => (
              <Line
                key={s.skillId}
                type="linear"
                dataKey={s.skillId}
                name={s.name}
                stroke={linePalette[i % linePalette.length]}
                strokeWidth={2}
                dot={({ cx, cy, index }) =>
                  Number.isFinite(cy) ? (
                    <rect key={index} x={cx - 3} y={cy - 3} width={6} height={6} fill={linePalette[i % linePalette.length]} />
                  ) : (
                    <g key={index} />
                  )
                }
                activeDot={{ r: 5, fill: colors.charts.primary }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </motion.div>
    </Frame>
  );
}
