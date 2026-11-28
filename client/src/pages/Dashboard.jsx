import { motion } from "framer-motion";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { DemandSupply, DemandTrend, GroupedBars } from "../components/Charts";
import FilterBar, { useFilterOptions } from "../components/FilterBar";
import PriorityList from "../components/PriorityList";
import UnmappedQueue from "../components/UnmappedQueue";
import { Button, CountUp, Divider, Empty, ErrorNote, Loading, PageHead, Tag, Window } from "../components/ui";
import { api, errorText, saveBlob } from "../lib/api";
import { date, rupees, signed, STATUS } from "../lib/format";
import { rowMotion, useMotionOk } from "../lib/motion";
import { buildReport, describeFilters } from "../lib/report";
import { colors } from "../lib/theme";
import { useData } from "../lib/useData";
import { useQueryParams } from "../lib/useQueryParams";

function Stat({ label, tone, tilt, delay, value, format, note, delta, deltaLabel }) {
  const ok = useMotionOk();
  return (
    <motion.div
      className="hard-shadow flex flex-col justify-between border-2 border-line bg-surface p-4 transition-colors hover:border-cyan"
      initial={ok ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: ok ? delay : 0 }}
      whileHover={ok ? { y: -3, transition: { duration: 0.15 } } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <Tag tone={tone} tilt={tilt} delay={delay}>
          {label}
        </Tag>
        {delta !== undefined && delta !== null && (
          <span
            className={`font-mono text-[11px] font-bold px-1.5 py-0.5 border ${
              delta > 0
                ? "border-neon text-neon bg-neon/10"
                : delta < 0
                ? "border-pink text-pink bg-pink/10"
                : "border-line text-muted"
            }`}
          >
            {delta > 0 ? `+${delta}` : delta} {deltaLabel || "vs prev"}
          </span>
        )}
      </div>
      <div className="font-display mt-4 text-3xl font-bold leading-none tracking-tight text-ink xl:text-4xl">
        <CountUp value={value} format={format} />
      </div>
      <div className="mt-2 text-[12px] text-muted">{note}</div>
    </motion.div>
  );
}

export default function Dashboard() {
  const [params, setParams] = useQueryParams();
  const { search } = useLocation();
  const navigate = useNavigate();
  const options = useFilterOptions();
  const { data, error, loading, reload } = useData("/dashboard", params);
  const [actionError, setActionError] = useState("");
  const ok = useMotionOk();

  function exportPdf() {
    const bytes = buildReport(data, describeFilters(params, options.data));
    saveBlob(
      new Blob([bytes], { type: "application/pdf" }),
      `skill-track-summary-${new Date().toISOString().slice(0, 10)}.pdf`
    );
  }

  async function verify(row) {
    setActionError("");
    try {
      await api.patch(`/outcomes/${row.id}/verify`, { verified: !row.verified });
      reload();
    } catch (failure) {
      setActionError(errorText(failure));
    }
  }

  const stats = data?.stats;
  const impact = data?.impact;
  const prev = stats?.previousPeriod;

  // Calculate delta against previous period
  const traineeDelta = prev && prev.trainees !== undefined && stats ? stats.trainees - prev.trainees : null;
  const placementDelta =
    prev && prev.placementRate !== null && stats && stats.placementRate !== null
      ? Math.round((stats.placementRate - prev.placementRate) * 10) / 10
      : null;
  const salaryDelta =
    prev && prev.averageSalary !== null && stats && stats.averageSalary !== null
      ? stats.averageSalary - prev.averageSalary
      : null;

  function drillDownProgram(programName) {
    const matched = options.data?.programs?.find(
      (p) => p.name.toLowerCase() === programName.toLowerCase()
    );
    if (matched) {
      navigate(`/learners?program=${matched.id}`);
    } else {
      navigate(`/learners?search=${encodeURIComponent(programName)}`);
    }
  }

  return (
    <>
      <PageHead title="Dashboard" note="Placement analytics, market gaps and statistical impact across cohorts.">
        <Button variant="primary" onClick={exportPdf} disabled={!data || loading}>
          Export summary as PDF
        </Button>
      </PageHead>

      <FilterBar options={options} show={["district", "program", "batch", "from", "to"]} />

      <ErrorNote onRetry={reload}>{error}</ErrorNote>
      <ErrorNote>{actionError}</ErrorNote>
      {!data && loading && <Loading />}

      {data && (
        <div aria-busy={loading} className={loading ? "opacity-60" : ""}>
          {/* KPI Row */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Total trainees"
              tone="neon"
              tilt={-2}
              delay={0}
              value={stats.trainees}
              note="in this filtered view"
              delta={traineeDelta}
              deltaLabel="trainees"
            />
            <Stat
              label="Placement rate"
              tone="yellow"
              tilt={1}
              delay={0.05}
              value={stats.placementRate}
              format={(n) => `${n.toFixed(1)}%`}
              note={`of ${stats.reported} who answered; ${stats.noOutcome} pending`}
              delta={placementDelta !== null ? `${placementDelta > 0 ? "+" : ""}${placementDelta}%` : null}
              deltaLabel=""
            />
            <Stat
              label="Average salary"
              tone="neon"
              tilt={2}
              delay={0.1}
              value={stats.averageSalary}
              format={(n) => rupees(n)}
              note="per month, from confirmed check-ins"
              delta={salaryDelta !== null ? `${salaryDelta > 0 ? "+" : ""}Rs ${Math.abs(salaryDelta).toLocaleString("en-IN")}` : null}
              deltaLabel=""
            />
            <Stat
              label="Pending check-ins"
              tone="yellow"
              tilt={-1}
              delay={0.15}
              value={stats.pendingCheckIns}
              note="active links sent, awaiting response"
            />
          </div>

          {!stats.trainees && (
            <div className="mt-6">
              <Empty>
                Nothing matches your selected filter.{" "}
                <Link to="/upload" className="text-neon underline">
                  Upload a CSV
                </Link>{" "}
                or clear the filters.
              </Empty>
            </div>
          )}

          <Divider />

          {/* Charts & Analytical Grid */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Interactive Placement by Program */}
            <Window
              title="Placement by program"
              aside="Click bar to drill down"
              className="lg:col-span-7"
            >
              {data.byProgram.some((p) => p.reported) ? (
                <GroupedBars
                  data={data.byProgram.map((p) => ({ program: p.program, rate: p.rate ?? 0 }))}
                  category="program"
                  unit="%"
                  domain={[0, 100]}
                  series={[{ key: "rate", name: "Placed, % of responders", color: colors.neon }]}
                  label="Placement rate by program"
                  onBarClick={(entry) => drillDownProgram(entry.program)}
                />
              ) : (
                <Empty>No check-in responses collected yet for these programs.</Empty>
              )}
            </Window>

            {/* Top Priority Gaps */}
            <Window
              title="Priority gaps"
              aside={
                <Link to={`/skill-gaps${search}`} className="text-neon hover:underline">
                  Full gap report &gt;
                </Link>
              }
              className="lg:col-span-5"
            >
              <PriorityList rows={data.gaps.priority.slice(0, 5)} />
            </Window>

            {/* Demand against supply */}
            <Window
              title="Demand against supply"
              aside={`${data.gaps.postingTotal} job postings analysed`}
              className="lg:col-span-7"
            >
              {data.gaps.priority.length ? (
                <DemandSupply
                  rows={data.gaps.priority}
                  onSkillClick={() => navigate(`/skill-gaps${search}`)}
                />
              ) : (
                <Empty>Requires job postings in the database to calculate demand.</Empty>
              )}
            </Window>

            {/* Impact comparison */}
            <Window
              title="Impact against comparison group"
              aside="District re-weighted comparison"
              className="lg:col-span-5"
            >
              {impact.placement.difference === null ? (
                <Empty>{impact.sentence}</Empty>
              ) : (
                <>
                  <div className="font-display mb-2 text-3xl sm:text-4xl font-bold text-neon">
                    {signed(impact.placement.difference, " pts")}
                  </div>
                  <GroupedBars
                    data={[
                      {
                        measure: "Placement rate",
                        participants: impact.placement.participants,
                        comparison: impact.placement.comparison,
                      },
                    ]}
                    category="measure"
                    unit="%"
                    domain={[0, 100]}
                    height={190}
                    series={[
                      { key: "participants", name: "Trainees", color: colors.neon },
                      { key: "comparison", name: "Comparison group", color: colors.muted },
                    ]}
                    label="Placement rate, trainees against comparison group"
                    onBarClick={() => navigate(`/impact${search}`)}
                  />
                  <p className="mt-3 mb-0 text-xs text-muted leading-relaxed">{impact.sentence}</p>
                </>
              )}
            </Window>

            {/* Demand trend */}
            <Window title="Demand trend, six months" className="lg:col-span-7">
              {data.gaps.trend.series.length ? (
                <DemandTrend trend={data.gaps.trend} />
              ) : (
                <Empty>No posting trend data for the current selection.</Empty>
              )}
            </Window>

            {/* Unmapped skills queue */}
            <Window
              title="Unmapped skills queue"
              aside={`${data.unmapped.length} terms pending`}
              className="lg:col-span-5"
              bodyClass="max-h-96 overflow-y-auto p-4"
            >
              <UnmappedQueue items={data.unmapped} onChange={reload} />
            </Window>

            {/* Recent Check-Ins Table */}
            <Window title="Recent check-ins" className="lg:col-span-12" bodyClass="overflow-x-auto p-2">
              {data.recent.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Trainee Name</th>
                      <th>Program</th>
                      <th>District</th>
                      <th>Status</th>
                      <th>Employer</th>
                      <th>Answered</th>
                      <th>Verification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((row, index) => (
                      <motion.tr key={row.id} {...rowMotion(index, ok)}>
                        <td className="font-medium text-ink">{row.name}</td>
                        <td>{row.program}</td>
                        <td>{row.district}</td>
                        <td>
                          <span
                            className={`font-mono text-xs px-2 py-0.5 border ${
                              row.status === "EMPLOYED"
                                ? "border-neon text-neon bg-neon/10"
                                : row.status === "SELF_EMPLOYED"
                                ? "border-cyan text-cyan bg-cyan/10"
                                : "border-pink text-pink bg-pink/10"
                            }`}
                          >
                            {STATUS[row.status]}
                          </span>
                        </td>
                        <td>{row.employer ?? "n/a"}</td>
                        <td className="whitespace-nowrap font-mono text-xs text-muted">
                          {date(row.submittedAt)}
                        </td>
                        <td>
                          {row.status === "EMPLOYED" ? (
                            <Button small onClick={() => verify(row)}>
                              {row.verified ? "Verified [undo]" : "Mark verified"}
                            </Button>
                          ) : (
                            <span className="text-muted text-xs">n/a</span>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Empty>No check-ins received yet. Generate links on the Learners page.</Empty>
              )}
            </Window>
          </div>
        </div>
      )}
    </>
  );
}
